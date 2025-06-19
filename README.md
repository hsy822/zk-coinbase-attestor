# zk-Coinbase-Attestor

> **Prove your Coinbase KYC status** without revealing your wallet address.  
> This project uses zero-knowledge proofs and a serverless frontend to deliver privacy-preserving KYC verification for dApps.

---
Live Demo: [Try it here](https://demo-dapp.netlify.app/)

https://github.com/user-attachments/assets/9dc4d456-699d-42a9-acdf-5e3b29eb417f

## Getting Started

```bash
pnpm install
pnpm --filter @zk/coinbase-attestor run build
pnpm --filter proof-portal dev
pnpm --filter demo-dapp dev
```
and connect to `http://localhost:4000`

## Project Overview

`zk-Coinbase-Attestor` allows users to prove they own a **Coinbase KYC-verified wallet address** without exposing that address to the dApp.

- All proof generation happens client-side
- The dApp only receives a yes/no result
- No blockchain transactions required (off-chain verification)
- Trust is anchored in cryptographic proof of Coinbase’s signature inside a ZK circuit

---

## Architecture

![Editor _ Mermaid Chart-2025-06-11-124646](https://github.com/user-attachments/assets/a2668cf6-99be-4967-8cd7-5e7acd862aa9)

### Proof Portal (React + Tailwind, hosted on Vercel)

- User-facing client app to generate proofs
- Connects wallet and fetches **KYC attestation tx** via EAS + Infura
- Verifies tx came from Coinbase and matches KYC schema
- Loads attestation tx from EAS/Infura
- Extracts calldata, signature, and recovers Coinbase public key
- Generates ZK proof using:
    - Coinbase signature
    - User signature
    - Raw calldata
- Returns proof securely to dApp via `postMessage`

### SDK

- Embedded in dApp
- Launches Proof Portal via `window.open`
- Listens for proof response via `postMessage`
- Verifies:
  - ZK proof validity
  - Public input (Coinbase pubkey matches known address)
  - Origin, timestamp, nonce for replay protection

### dApp

- Calls SDK to request proof
- Receives only `true/false` result
- Decides access or benefits accordingly

To verify KYC status, simply import and call:

```js
import { openZkKycPopup, verifyZkKycProof } from '@zk/coinbase-attestor';

const raw = await openZkKycPopup('zk-coinbase-attestor');

const result = await verifyZkKycProof(raw);

if (result.success) {
  // Proof verified
} else {
  // Show result.error
}
```
---

## What the Circuit Proves

The Noir circuit proves:

1. The user signed a message (attestation calldata)
2. The same message was originally signed by Coinbase via an attestation tx
3. The message structure matches a valid Coinbase KYC attestation

This implies:
- The user owns the attested address (via signature)
- The tx was indeed a Coinbase KYC attestation

### Inputs:
- calldata
- coinbase_sig (r, s, v)
- user_sig
- coinbase_pubkey (pub input)

---

## Progress Checklist

| Task | Status |
|------|--------|
| Architecture designed | ✅ Complete  
| Circuit implemented & tested | ✅ Complete  
| SDK (proof request + validation) | ✅ Complete  
| Proof Portal built | ✅ Complete  
| End-to-end flow (dApp → portal → dApp) | ✅ Complete  
| Replay protection (nonce, timestamp, origin) | ✅ Complete  
| Demo dApp integration | ✅ Complete  
| Vercel deployment | 🔜 Coming Soon  

