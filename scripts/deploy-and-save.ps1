$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot

$PolicyContractName = "studyvault_policy"
$VaultContractName = "studyvault"

$PolicyWasm = Join-Path $ProjectRoot "target\wasm32v1-none\release\studyvault_policy.wasm"
$VaultWasm = Join-Path $ProjectRoot "target\wasm32v1-none\release\studyvault.wasm"

$PolicyContractIdFile = Join-Path $ProjectRoot "POLICY_CONTRACT_ID.txt"
$VaultContractIdFile = Join-Path $ProjectRoot "CONTRACT_ID.txt"
$DeploymentFile = Join-Path $ProjectRoot "DEPLOYMENT.md"
$FrontendSrc = Join-Path $ProjectRoot "frontend\src"
$FrontendConfig = Join-Path $FrontendSrc "contractConfig.ts"

$IdentityName = "studyvault_deployer"
$Network = "testnet"

function Write-Step {
  param([string]$Message)

  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Native {
  param(
    [string]$Command,
    [string[]]$Arguments,
    [switch]$AllowFailure,
    [switch]$Silent
  )

  $PreviousErrorActionPreference = $ErrorActionPreference
  $PreviousNativePreference = $null

  if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue) {
    $PreviousNativePreference = $Global:PSNativeCommandUseErrorActionPreference
    $Global:PSNativeCommandUseErrorActionPreference = $false
  }

  $ErrorActionPreference = "Continue"

  try {
    $Output = & $Command @Arguments 2>&1
    $ExitCode = $LASTEXITCODE
    $Lines = @()

    if ($null -ne $Output) {
      foreach ($Line in $Output) {
        $TextLine = [string]$Line

        if (-not [string]::IsNullOrWhiteSpace($TextLine)) {
          $Lines += $TextLine

          if (-not $Silent) {
            Write-Host $TextLine
          }
        }
      }
    }

    if ($ExitCode -ne 0 -and -not $AllowFailure) {
      throw "$Command $($Arguments -join ' ') failed with exit code $ExitCode"
    }

    return @{
      ExitCode = $ExitCode
      Output = $Lines
    }
  }
  finally {
    $ErrorActionPreference = $PreviousErrorActionPreference

    if ($null -ne $PreviousNativePreference) {
      $Global:PSNativeCommandUseErrorActionPreference = $PreviousNativePreference
    }
  }
}

function Invoke-StellarWithRetry {
  param(
    [string]$Title,
    [string[]]$Arguments,
    [int]$MaxAttempts = 4
  )

  for ($Attempt = 1; $Attempt -le $MaxAttempts; $Attempt++) {
    Write-Host ""
    Write-Host "$Title attempt $Attempt/$MaxAttempts..." -ForegroundColor DarkCyan

    $Result = Invoke-Native -Command "stellar" -Arguments $Arguments -AllowFailure

    if ($Result.ExitCode -eq 0) {
      return $Result.Output
    }

    if ($Attempt -lt $MaxAttempts) {
      Write-Host "Retrying shortly because testnet may still be syncing or sequence may be busy..." -ForegroundColor Yellow
      Start-Sleep -Seconds 20
    }
  }

  throw "$Title failed after $MaxAttempts attempts."
}

function Get-ContractIdFromOutput {
  param([string[]]$OutputLines)

  $Text = $OutputLines -join "`n"

  if ($Text -cmatch "C[A-Z0-9]{55}") {
    return $Matches[0]
  }

  throw "Could not parse contract ID from deploy output."
}

function Get-PublicKey {
  param([string]$KeyName)

  $Result = Invoke-Native -Command "stellar" -Arguments @("keys", "address", $KeyName) -AllowFailure -Silent

  if ($Result.ExitCode -eq 0) {
    $Address = ($Result.Output -join "").Trim()

    if ($Address -match "^G[A-Z0-9]{55}$") {
      return $Address
    }
  }

  $Result = Invoke-Native -Command "stellar" -Arguments @("keys", "public-key", $KeyName) -AllowFailure -Silent

  if ($Result.ExitCode -eq 0) {
    $Address = ($Result.Output -join "").Trim()

    if ($Address -match "^G[A-Z0-9]{55}$") {
      return $Address
    }
  }

  throw "Could not get public key for $KeyName."
}

function Ensure-Identity {
  param(
    [string]$KeyName,
    [string]$NetworkName
  )

  $ListResult = Invoke-Native -Command "stellar" -Arguments @("keys", "ls") -AllowFailure -Silent
  $ListText = $ListResult.Output -join "`n"

  if ($ListText -notmatch [Regex]::Escape($KeyName)) {
    Write-Host "Identity not found. Creating $KeyName..." -ForegroundColor Yellow
    $null = Invoke-Native -Command "stellar" -Arguments @("keys", "generate", $KeyName)
  }
  else {
    Write-Host "Identity found: $KeyName" -ForegroundColor Green
  }

  $null = Invoke-Native -Command "stellar" -Arguments @("keys", "fund", $KeyName, "--network", $NetworkName) -AllowFailure

  return Get-PublicKey -KeyName $KeyName
}

function Write-TextNoBom {
  param(
    [string]$Path,
    [string]$Value
  )

  $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Value, $Utf8NoBom)
}

function Deploy-Or-Read {
  param(
    [string]$Label,
    [string]$WasmPath,
    [string]$IdFile,
    [string]$SourceAccount,
    [string]$NetworkName
  )

  if (Test-Path $IdFile) {
    $ExistingId = (Get-Content $IdFile -Raw).Trim()

    if ($ExistingId -match "^C[A-Z0-9]{55}$") {
      Write-Step "Use existing $Label contract"
      Write-Host "$Label contract ID: $ExistingId" -ForegroundColor Green
      return $ExistingId
    }
  }

  if (-not (Test-Path $WasmPath)) {
    throw "WASM file not found: $WasmPath"
  }

  Write-Step "Deploy $Label contract"

  $DeployOutput = Invoke-StellarWithRetry `
    -Title "Deploy $Label" `
    -Arguments @(
      "contract",
      "deploy",
      "--wasm",
      $WasmPath,
      "--source-account",
      $SourceAccount,
      "--network",
      $NetworkName
    )

  $ContractId = Get-ContractIdFromOutput -OutputLines $DeployOutput

  Write-TextNoBom -Path $IdFile -Value $ContractId
  Write-Host "$Label contract ID saved: $ContractId" -ForegroundColor Green

  return $ContractId
}

Set-Location $ProjectRoot

Write-Step "Check required CLIs"
cargo -V
stellar --version

Write-Step "Format and test contracts"
cargo fmt --all -- --check
cargo test --workspace

Write-Step "Build Soroban contracts"
stellar contract build

Write-Step "Check Stellar identity"
$IdentityAddress = Ensure-Identity -KeyName $IdentityName -NetworkName $Network
Write-Host "Identity: $IdentityName"
Write-Host "Public key: $IdentityAddress"

$PolicyContractId = Deploy-Or-Read `
  -Label $PolicyContractName `
  -WasmPath $PolicyWasm `
  -IdFile $PolicyContractIdFile `
  -SourceAccount $IdentityName `
  -NetworkName $Network

Start-Sleep -Seconds 12

$VaultContractId = Deploy-Or-Read `
  -Label $VaultContractName `
  -WasmPath $VaultWasm `
  -IdFile $VaultContractIdFile `
  -SourceAccount $IdentityName `
  -NetworkName $Network

Start-Sleep -Seconds 12

Write-Step "Initialize studyvault contract"

$InitializeOutput = Invoke-StellarWithRetry `
  -Title "Initialize studyvault contract" `
  -Arguments @(
    "contract",
    "invoke",
    "--id",
    $VaultContractId,
    "--source-account",
    $IdentityName,
    "--network",
    $Network,
    "--",
    "initialize",
    "--admin",
    $IdentityAddress,
    "--policy_contract",
    $PolicyContractId
  )

$null = $InitializeOutput

Write-Step "Save deployment output"

$DeployedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

New-Item -ItemType Directory -Path $FrontendSrc -Force | Out-Null

$ConfigLines = @(
  "export const CONTRACT_CONFIG = {",
  "  network: 'testnet',",
  "  networkPassphrase: 'Test SDF Network ; September 2015',",
  "  rpcUrl: 'https://soroban-testnet.stellar.org',",
  "  explorerBaseUrl: 'https://stellar.expert/explorer/testnet',",
  "  studyVaultContractId: '$VaultContractId',",
  "  studyVaultPolicyContractId: '$PolicyContractId',",
  "  deployerPublicKey: '$IdentityAddress',",
  "  deployedAt: '$DeployedAt',",
  "  projectName: 'StudyVault',",
  "  repository: 'https://github.com/bumboomXX/studyvault-stellar'",
  "} as const;",
  "",
  "export type ContractConfig = typeof CONTRACT_CONFIG;",
  "",
  "export const hasDeployedContracts =",
  "  CONTRACT_CONFIG.studyVaultContractId.length > 0 &&",
  "  CONTRACT_CONFIG.studyVaultPolicyContractId.length > 0;",
  "",
  "export const getStudyVaultExplorerUrl = () =>",
  "  CONTRACT_CONFIG.explorerBaseUrl + '/contract/' + CONTRACT_CONFIG.studyVaultContractId;",
  "",
  "export const getPolicyExplorerUrl = () =>",
  "  CONTRACT_CONFIG.explorerBaseUrl + '/contract/' + CONTRACT_CONFIG.studyVaultPolicyContractId;"
)

[System.IO.File]::WriteAllLines($FrontendConfig, $ConfigLines, (New-Object System.Text.UTF8Encoding($false)))

$DeploymentLines = @(
  "# StudyVault Level 3 Deployment",
  "",
  "Network: $Network",
  "",
  "Deployer public key: $IdentityAddress",
  "",
  "StudyVault policy contract ID: $PolicyContractId",
  "",
  "StudyVault contract ID: $VaultContractId",
  "",
  "Deployed at UTC: $DeployedAt",
  "",
  "StudyVault explorer:",
  "https://stellar.expert/explorer/testnet/contract/$VaultContractId",
  "",
  "Policy explorer:",
  "https://stellar.expert/explorer/testnet/contract/$PolicyContractId"
)

[System.IO.File]::WriteAllLines($DeploymentFile, $DeploymentLines, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "StudyVault contract ID saved to CONTRACT_ID.txt" -ForegroundColor Green
Write-Host "StudyVault policy contract ID saved to POLICY_CONTRACT_ID.txt" -ForegroundColor Green
Write-Host "Frontend config saved to frontend/src/contractConfig.ts" -ForegroundColor Green
Write-Host "Deployment summary saved to DEPLOYMENT.md" -ForegroundColor Green

Write-Host ""
Write-Host "Deploy script completed." -ForegroundColor Green