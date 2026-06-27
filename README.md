# StudyVault Stellar

StudyVault is a Stellar Level 3 dApp built with Soroban smart contracts, a React frontend, Freighter wallet integration, and real contract transaction signing.

The project helps students publish study documents, prevent duplicate uploads through document hashes, sell access to learning materials, and verify document records on Stellar testnet.

StudyVault does not store the original study file on-chain. It stores document metadata, a 32-byte document hash, owner address, access price, purchase counter, and document status. The actual file can live off-chain through IPFS or another storage provider.

## Live Deployment

Network: Stellar Testnet

StudyVault Contract:

~~~text
CARUIK4ARRQEWZSKB4UPROVHFTFVH34L2RFZOV6YCBECHIRJB4YE75XQ
~~~

StudyVault Policy Contract:

~~~text
CCHSKQQKFEK3MTGOAB4GBK4XDLHYT7NIVHWIASUYGHXS4ON7ZMMBOCDZ
~~~

StudyVault Explorer:

~~~text
https://stellar.expert/explorer/testnet/contract/CARUIK4ARRQEWZSKB4UPROVHFTFVH34L2RFZOV6YCBECHIRJB4YE75XQ
~~~

Policy Explorer:

~~~text
https://stellar.expert/explorer/testnet/contract/CCHSKQQKFEK3MTGOAB4GBK4XDLHYT7NIVHWIASUYGHXS4ON7ZMMBOCDZ
~~~

## Problem

Students often share notes, guides, and learning files through chats, cloud folders, or informal payment links. This creates several problems:

- duplicate documents are hard to detect
- document ownership is not transparent
- payment and access records are not auditable
- sellers cannot easily prove that a file was uploaded first
- buyers cannot easily verify the document record

StudyVault demonstrates how Soroban can be used as a transparent registry and access record layer for study materials.

## Why Stellar

Stellar is suitable for StudyVault because study document access should be low-cost, fast, and easy to verify.

- Stellar testnet allows safe experimentation without real funds.
- Soroban supports custom document registry logic.
- Low transaction fees fit small education-related actions.
- Public contract IDs and transaction hashes are easy to verify.
- Freighter gives users a simple wallet signing flow.

## Architecture

StudyVault uses two Soroban contracts.

### 1. studyvault_policy

The policy contract validates whether a document price is allowed.

Main functions:

- policy_name
- minimum_price
- maximum_price
- is_price_allowed
- is_document_allowed

### 2. studyvault

The main contract stores document records and access state.

Main functions:

- initialize
- upload_document
- get_document
- document_id_by_hash
- owner_document_count
- owner_document_at
- purchase_access
- has_access
- disable_document
- stats
- status_label
- set_policy_contract

## Level 3 Features

- Rust Soroban workspace
- Two Soroban smart contracts
- Inter-contract communication
- Persistent document storage
- Duplicate document hash prevention
- Owner-based authorization
- Purchase access tracking
- Contract tests with 7 passing scenarios
- Deployed contracts on Stellar testnet
- React frontend dashboard
- Freighter wallet connect flow
- Freighter requestAccess and getAddress support
- Freighter signTransaction integration
- Soroban RPC integration
- TransactionBuilder usage
- prepareTransaction usage
- sendTransaction usage
- nativeToScVal and scValToNative conversion
- Frontend functions matching contract methods
- Frontend tests with 8 passing scenarios
- GitHub Actions CI workflow
- One-command Level 3 verification script

## Frontend Contract Integration

The frontend is not a mock-only dashboard. It includes real wallet and contract integration.

Wallet service:

- connects to Freighter
- requests wallet access
- reads wallet address
- requests transaction signature with signTransaction

Contract service:

- connects to Soroban RPC
- builds transactions with TransactionBuilder
- prepares transactions with prepareTransaction
- asks Freighter to sign the prepared XDR
- submits signed transactions with sendTransaction
- simulates read calls for get_document, has_access, and stats
- converts contract arguments with nativeToScVal
- converts read results with scValToNative

Frontend write functions:

- uploadDocument calls upload_document
- purchaseAccess calls purchase_access
- disableDocument calls disable_document

Frontend read functions:

- getDocument calls get_document
- hasAccess calls has_access
- getStats calls stats

## Project Structure

~~~text
studyvault-stellar/
  contracts/
    studyvault/
      Cargo.toml
      src/lib.rs
      src/test.rs
    studyvault_policy/
      Cargo.toml
      src/lib.rs
  frontend/
    src/
      App.tsx
      App.css
      contractConfig.ts
      services/
        wallet.ts
        contract.ts
        contract.test.ts
  scripts/
    deploy-and-save.ps1
    verify-level3.ps1
  .github/workflows/ci.yml
  CONTRACT_ID.txt
  POLICY_CONTRACT_ID.txt
  DEPLOYMENT.md
  Cargo.toml
~~~

## Smart Contract Tests

Run contract tests from the project root:

~~~powershell
cargo test
~~~

Current contract coverage includes:

- initializes contract with policy
- uploads document and updates indexes
- rejects duplicate document hash
- rejects price not allowed by policy
- records purchase access
- rejects underpaid purchase
- disables document and blocks purchase

## Frontend Tests

Run frontend tests:

~~~powershell
cd frontend
npm test
~~~

Current frontend coverage includes:

- loads deployed StudyVault runtime config
- maps frontend functions to real contract method names
- exports write transaction functions used by the UI
- exports read query functions used by the UI
- converts 32-byte document hash hex into bytes
- rejects invalid document hash length
- builds deterministic demo hash for upload form
- shortens contract IDs and wallet addresses for display

## Build

Build Soroban contracts:

~~~powershell
cargo build --workspace --target wasm32v1-none --release
~~~

Build frontend:

~~~powershell
cd frontend
npm ci
npm run build
~~~

## Deploy

Deploy contracts to Stellar testnet:

~~~powershell
.\scripts\deploy-and-save.ps1
~~~

The deployment script:

- checks required CLIs
- runs contract format check
- runs contract tests
- builds Soroban contracts
- checks only the current project Stellar identity
- deploys studyvault_policy
- deploys studyvault
- initializes studyvault with the policy contract
- saves CONTRACT_ID.txt
- saves POLICY_CONTRACT_ID.txt
- saves DEPLOYMENT.md
- updates frontend/src/contractConfig.ts

The script does not print unrelated local Stellar identities from other projects.

## Verify Level 3

Run the full Level 3 verification script:

~~~powershell
.\scripts\verify-level3.ps1
~~~

This script checks:

- required Level 3 files
- deployed contract IDs
- Freighter requestAccess
- Freighter getAddress
- Freighter signTransaction
- TransactionBuilder
- prepareTransaction
- sendTransaction
- nativeToScVal
- scValToNative
- frontend and contract function matching
- contract tests
- Soroban build
- frontend tests
- frontend build

## CI

GitHub Actions runs:

- Rust format check
- contract tests
- Soroban WASM build
- frontend dependency install
- frontend tests
- frontend build

## Tech Stack

- Stellar Soroban
- Rust
- soroban-sdk
- React
- TypeScript
- Vite
- Vitest
- Freighter API
- Stellar SDK
- GitHub Actions

## Repository

~~~text
https://github.com/bumboomXX/studyvault-stellar
~~~