# zk-Coinbase-Attestor

> **Prove your Coinbase KYC status** without revealing your wallet address.  
> This project uses zero-knowledge proofs and a serverless frontend to deliver privacy-preserving KYC verification for dApps.

---

## Project Overview

`zk-Coinbase-Attestor` allows users to prove they own a **Coinbase KYC-verified wallet address** without exposing that address to the dApp.

- All proof generation happens client-side
- The dApp only receives a yes/no result
- No blockchain transactions required (off-chain verification)
- Trust is anchored in a verifiable **Portal signature**

---

## Architecture

![Editor _ Mermaid Chart-2025-06-11-124646](https://github.com/user-attachments/assets/a2668cf6-99be-4967-8cd7-5e7acd862aa9)

### Proof Portal (React + Tailwind, hosted on Vercel)

- User-facing client app to generate proofs
- Connects wallet and fetches **KYC attestation tx** via EAS + Infura
- Verifies tx came from Coinbase and matches KYC schema
- Sends **attestation digest** to Portal server
- Receives **Portal's signature** over the digest
- Generates ZK proof (in-browser via Noir) using:
  - Portal signature
  - User signature
  - Attestation calldata
- Returns proof securely to dApp via `postMessage`

### Portal Server (Trusted Signer API)

- Signs attestation calldata digests only if:
  - tx is confirmed to be sent by Coinbase
  - calldata structure matches expected `attestAccount(...)`
- Never sees user wallet or address
- Exposes minimal signing API for digest-only inputs

### SDK

- Embedded in dApp
- Launches Proof Portal via `window.open`
- Listens for proof response via `postMessage`
- Verifies:
  - ZK proof validity
  - Portal signature
  - Nonce, origin, timestamp

### dApp

- Calls SDK to request proof
- Receives only `true/false` result
- Decides access or benefits accordingly

---

## What the Circuit Proves

The Noir circuit proves:

1. The user signed a message (attestation calldata)
2. The same message was previously **signed by a trusted Portal signer**
3. The message structure matches a valid Coinbase KYC attestation

This implies:
- The user owns the attested address (via signature)
- The tx was indeed a Coinbase KYC attestation (via Portal signer)

### Inputs:
- `calldata`: calldata from the KYC tx
- `digest`: `keccak256(calldata)`
- `portal_sig`: Portal’s ECDSA signature over `digest` (public input)
- `user_sig`: User’s ECDSA signature over `digest` (private input)

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
