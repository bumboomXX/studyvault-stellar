$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$FrontendDir = Join-Path $ProjectRoot "frontend"

function Write-Step {
  param([string]$Message)

  Write-Host ""
  Write-Host "==> " -NoNewline -ForegroundColor Cyan
  Write-Host $Message -ForegroundColor Cyan
}

function Assert-File {
  param(
    [string]$Path,
    [string]$Label
  )

  if (-not (Test-Path $Path)) {
    throw "Missing required file: $Path"
  }

  Write-Host ("OK: " + $Label) -ForegroundColor Green
}

function Assert-Text {
  param(
    [string]$Path,
    [string]$Pattern,
    [string]$Label
  )

  $Content = Get-Content $Path -Raw

  if ($Content -notmatch [Regex]::Escape($Pattern)) {
    throw "Missing expected text in $Path : $Pattern"
  }

  Write-Host ("OK: " + $Label) -ForegroundColor Green
}

Set-Location $ProjectRoot

Write-Step "Check required Level 3 files"
Assert-File -Path ".\Cargo.toml" -Label "Rust workspace"
Assert-File -Path ".\contracts\studyvault\src\lib.rs" -Label "Main StudyVault contract"
Assert-File -Path ".\contracts\studyvault\src\test.rs" -Label "Contract tests"
Assert-File -Path ".\contracts\studyvault_policy\src\lib.rs" -Label "Policy contract"
Assert-File -Path ".\scripts\deploy-and-save.ps1" -Label "Deployment script"
Assert-File -Path ".\CONTRACT_ID.txt" -Label "StudyVault contract ID"
Assert-File -Path ".\POLICY_CONTRACT_ID.txt" -Label "Policy contract ID"
Assert-File -Path ".\DEPLOYMENT.md" -Label "Deployment summary"
Assert-File -Path ".\frontend\src\contractConfig.ts" -Label "Frontend contract config"
Assert-File -Path ".\frontend\src\services\wallet.ts" -Label "Freighter wallet service"
Assert-File -Path ".\frontend\src\services\contract.ts" -Label "Soroban contract service"
Assert-File -Path ".\frontend\src\services\contract.test.ts" -Label "Frontend integration tests"
Assert-File -Path ".\frontend\src\App.tsx" -Label "Dashboard UI"

Write-Step "Check deployed contract IDs"
$VaultContractId = (Get-Content ".\CONTRACT_ID.txt" -Raw).Trim()
$PolicyContractId = (Get-Content ".\POLICY_CONTRACT_ID.txt" -Raw).Trim()

if ($VaultContractId -notmatch "^C[A-Z0-9]{55}$") {
  throw "Invalid StudyVault contract ID: $VaultContractId"
}

if ($PolicyContractId -notmatch "^C[A-Z0-9]{55}$") {
  throw "Invalid policy contract ID: $PolicyContractId"
}

Write-Host ("StudyVault contract: " + $VaultContractId) -ForegroundColor Green
Write-Host ("Policy contract: " + $PolicyContractId) -ForegroundColor Green

Write-Step "Check wallet integration requirements"
Assert-Text -Path ".\frontend\src\services\wallet.ts" -Pattern "requestAccess" -Label "Freighter requestAccess is implemented"
Assert-Text -Path ".\frontend\src\services\wallet.ts" -Pattern "getAddress" -Label "Freighter getAddress is implemented"
Assert-Text -Path ".\frontend\src\services\wallet.ts" -Pattern "signTransaction" -Label "Freighter signTransaction is implemented"

Write-Step "Check Soroban integration requirements"
Assert-Text -Path ".\frontend\src\services\contract.ts" -Pattern "TransactionBuilder" -Label "TransactionBuilder is used"
Assert-Text -Path ".\frontend\src\services\contract.ts" -Pattern "prepareTransaction" -Label "prepareTransaction is used"
Assert-Text -Path ".\frontend\src\services\contract.ts" -Pattern "sendTransaction" -Label "sendTransaction is used"
Assert-Text -Path ".\frontend\src\services\contract.ts" -Pattern "nativeToScVal" -Label "nativeToScVal is used"
Assert-Text -Path ".\frontend\src\services\contract.ts" -Pattern "scValToNative" -Label "scValToNative is used"

Write-Step "Check frontend function and contract function matching"
Assert-Text -Path ".\frontend\src\services\contract.ts" -Pattern "upload_document" -Label "Frontend calls upload_document"
Assert-Text -Path ".\frontend\src\services\contract.ts" -Pattern "purchase_access" -Label "Frontend calls purchase_access"
Assert-Text -Path ".\frontend\src\services\contract.ts" -Pattern "disable_document" -Label "Frontend calls disable_document"
Assert-Text -Path ".\frontend\src\services\contract.ts" -Pattern "get_document" -Label "Frontend reads get_document"
Assert-Text -Path ".\frontend\src\services\contract.ts" -Pattern "has_access" -Label "Frontend reads has_access"
Assert-Text -Path ".\frontend\src\services\contract.ts" -Pattern "stats" -Label "Frontend reads stats"

Write-Step "Run contract format check"
cargo fmt --all -- --check

Write-Step "Run contract tests"
cargo test --workspace

Write-Step "Build Soroban contracts"
stellar contract build

Write-Step "Run frontend tests"
Set-Location $FrontendDir
npm test

Write-Step "Build frontend"
npm run build

Set-Location $ProjectRoot

Write-Host ""
Write-Host "StudyVault Level 3 verification completed successfully." -ForegroundColor Green