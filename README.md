# zk-Coinbase-Attestor

> **Prove your Coinbase KYC status** without revealing your wallet address.  
> This project uses zero-knowledge proofs and a serverless frontend to deliver privacy-preserving KYC verification for dApps.

---

## Project Overview

`zk-Coinbase-Attestor` allows users to prove they own a **Coinbase KYC-verified wallet address** without exposing that address to the dApp.

- All proof generation happens client-side
- The dApp only receives a yes/no result
- No blockchain transactions required (off-chain verification)

---

## Architecture

![Editor _ Mermaid Chart-2025-06-11-124646](https://github.com/user-attachments/assets/a2668cf6-99be-4967-8cd7-5e7acd862aa9)

### Proof Portal (React + Tailwind, hosted on Vercel)

- User-facing client app to generate the proof
- Connects wallet and queries **KYC attestation** from **EAS**
- Constructs proof input and runs Noir circuit in-browser
- Sends the proof securely to the opener via `postMessage`

### SDK

- Embedded in dApp
- Launches Proof Portal via `window.open`
- Listens for proof response via `postMessage`
- Verifies:
  - zk-proof validity
  - origin domain
  - timestamp freshness
  - one-time nonce

### dApp

- Calls SDK to request proof
- Receives boolean result only (no address or signature data)
- Decides whether to grant access or benefits based on result

---

## What the Circuit Proves

The Noir circuit confirms:

1. The **user controls a wallet** that signed a specific `tx_hash`
2. The same `tx_hash` was **signed by Coinbase** (EAS attestation)

### Inputs:
- `tx_hash`: the attestation hash (e.g., issued on-chain by Coinbase)
- `coinbase_sig`: Coinbase's signature on the attestation (public)
- `user_sig`: User's signature on the same hash (private)

This proves the user owns a wallet address that was verified by Coinbase.

---

## Progress Checklist

| Task | Status |
|------|--------|
| Architecture designed | ✅ Complete  
| Circuit implemented & tested | 🔄 In Progress
| SDK (proof request + validation) | 🔄 In Progress
| Proof Portal built | 🔄 In Progress 
| End-to-end flow (dApp → portal → dApp) | 🔜 Coming Soon
| Replay protection (nonce, timestamp, origin) | 🔜 Coming Soon
| Vercel deployment | 🔜 Coming Soon  
| Demo dApp integration | 🔜 Coming Soon  
