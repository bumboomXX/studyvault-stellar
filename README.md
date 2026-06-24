# StudyVault – Decentralized Class Document Library

## Problem

Students often share duplicate study materials across chats and cloud drives, making documents difficult to organize, verify, and access fairly.

## Solution

StudyVault is a decentralized document library built on Stellar where students can upload learning materials, prevent duplicate uploads, and pay 1 XLM to unlock access to documents.

## Why Stellar

Stellar enables low-cost, fast transactions and Soroban smart contracts, making decentralized access control and payments practical for student communities.

## Target User

* University students
* Study groups
* Classroom communities
* Student organizations

## Features

* Upload learning documents
* Prevent duplicate documents using document hash
* Smart contract access control
* Pay-to-access model (1 XLM)
* Multi-wallet interaction
* Event logging through Soroban
* Stellar Testnet deployment

---

## Live Demo

Network: Stellar Testnet

Contract ID:

```txt
CCMVEZPKYZVNLOJDFT72YPDCHIUPLRAK3M444CS36OXWU4QS2ZWL7KBB
```

Transaction:

```txt
[https://stellar.expert/explorer/testnet/tx/d3592f1890148d146b5268e9963d872630fbc60ddc8d76053f918a97694e4428](https://stellar.expert/explorer/testnet/tx/61608caa0b55f1e94ebfafac24ccccd10a34f9b256d90b3c1b3)
```

---

## Project Structure

```txt
studyvault
│
├── contracts
│   └── library
│       ├── Cargo.toml
│       └── src
│           └── lib.rs
│
├── frontend
│
└── README.md
```

---

## How to Run

### Clone

```bash
git clone https://github.com/bumboomXX/studyvault-stellar.git
```

### Enter Project

```bash
cd studyvault
```

### Build Contract

```bash
cd contracts/library

cargo build
```

### Build WASM

```bash
cargo build --target wasm32v1-none --release
```

### Test

```bash
cargo test
```

### Deploy

```bash
stellar contract deploy \
--wasm target/wasm32v1-none/release/library.wasm \
--source admin \
--network testnet
```

---

## Smart Contract Functions

### Upload Document

```txt
upload(owner,title,hash)
```

Uploads document metadata and prevents duplicates.

### Pay Access

```txt
pay(buyer,id)
```

Unlock document access after payment.

### Verify Access

```txt
access(buyer,id)
```

Returns access permission status.

---

## Tech Stack

* Smart Contract: Rust
* Framework: Soroban SDK v22
* Blockchain: Stellar
* Frontend: HTML / JavaScript
* Wallet: Freighter
* Network: Stellar Testnet

---

## Future Improvements

* Real XLM payment settlement
* IPFS document storage
* Search and filtering
* UI improvements
* Reputation system

---

## Team

Name: bum

GitHub:
https://github.com/bumboomXX

University:
Student Project
