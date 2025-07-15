# zk-Coinbase-Attestor

---

## Project Overview

zk-Coinbase-Attestor enables users to **prove they own a Coinbase KYC-verified wallet** without revealing their wallet address or onchain history.
It is built on a Zero-Knowledge Proof system designed for privacy-preserving compliance.

* All proofs are generated entirely in the browser; private keys and wallet data are never sent to any server.
* The dApp receives only a `true/false` verification result, fully preserving the user's onchain privacy.
* The project uses a lightweight Noir circuit with an UltraHonk WASM backend, achieving **proving times around 4 seconds**.

---

## How it works: Onchain attestations

When a user completes KYC on Coinbase, Coinbase generates an attestation onchain on Base using the Ethereum Attestation Service (EAS).

* The attestation is a transaction from a privileged Coinbase attestor account to a specific smart contract on Base, encoding that the user’s wallet address is KYC-verified.

* This attestation can be queried offchain via EAS GraphQL APIs or via the Base RPC.

* zk-Coinbase-Attestor retrieves this attestation and generates a Zero-Knowledge Proof that the user’s wallet was attested, without exposing the address.

This design ensures compliance can be verified cryptographically, without linking user addresses publicly.

---

## Demo & Local Development

[Live Demo (Netlify)](https://demo-dapp.netlify.app/)

https://github.com/user-attachments/assets/e8685009-e69e-446e-8006-01daab772674

### Local setup

```bash
# Install dependencies
pnpm install

# Build Noir circuit
pnpm --filter @zk/coinbase-attestor run build

# Start Proof Portal
pnpm --filter proof-portal dev

# Start demo dApp
pnpm --filter demo-dapp dev
# → Open http://localhost:4000
```

### .env configuration

The Proof Portal requires an RPC endpoint to query attestation transactions.
Create a `.env` file in the root or inside `proof-portal/` with:

```
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.example.infura.io/v3/YOUR_KEY
```

---

## Architecture & Security Design

![Editor _ Mermaid Chart-2025-06-11-124646](https://github.com/user-attachments/assets/a2668cf6-99be-4967-8cd7-5e7acd862aa9)

### SDK (dApp)

* Opens the Proof Portal using `window.open` via `openZkKycPopup`.
* Receives the proof, public inputs, and meta (origin, nonce, timestamp) through `postMessage`.
* Can choose to verify the proof **offchain in the browser**, or **onchain by submitting to a Noir verifier deployed on Base Mainnet**.
* Enforces:
  * `origin` checks to ensure same-origin data integrity.
  * `nonce` tracking to prevent replay attacks.
  * `timestamp` checks so proofs are valid only within a short window (5 minutes).
* Verifier Contract on Base Mainnet
  * **Address:** [`0xB3705B6d33Fe7b22e86130Fa12592B308a191483`](https://basescan.org/address/0xB3705B6d33Fe7b22e86130Fa12592B308a191483#code)

### Proof Portal (React + Noir + UltraHonk)

* Connects the user’s wallet, retrieves the Coinbase attestation transaction via EAS, and extracts calldata and the digest.
* Generates the Zero-Knowledge Proof locally in the browser using Noir WASM.
* Uses UltraHonk to process the Noir witness and produce the final ZK proof.
* Returns the proof and public inputs back to the dApp via `postMessage`.

### Noir circuit (PoC)

* Verifies that the calldata represents an `attestAccount(user)` function call.
* Confirms the `contract_address` matches the Coinbase attestor contract.
* Uses `keccak(pubkey)` to derive the Ethereum address and matches it against the calldata address.
* By using a keccak-only approach in this PoC, gate counts are reduced by roughly 64%, achieving **proving times around 4 seconds**.

### dApp

* Calls SDK to request proof
* Proofs can be verified on-chain or off-chain.
* Receives only `true/false` result
* Decides access or benefits accordingly

To verify KYC status, simply import and call:

```js
import { openZkKycPopup, verifyZkKycProof } from '@zk/coinbase-attestor';

const raw = await openZkKycPopup('zk-coinbase-attestor');

const result = await verifyZkKycProof({
  ...rawProof,
  mode, // "offchain" or "onchain"
  provider,
  verifierAddress: '0xB3705B6d33Fe7b22e86130Fa12592B308a191483' // Verifier contract deployed on Base mainnet
});

if (result.success) {
  // Proof verified
} else {
  // Show result.error
}
```
---

## Production Security Enhancements (Required)

While this PoC omits signature verification to focus on speed, production-level security requires the following enhancements.

### Recover transaction hash via signature (v, r, s)

* The Noir circuit must reconstruct the transaction hash using the ECDSA signature (v, r, s) to prove that the attestation truly originated from the Coinbase attestor.
* This prevents calldata spoofing and provides complete ECDSA verification.

### Merkle Tree approach

* Maintains a Merkle tree of all KYC-verified addresses, allowing the circuit to perform only a Merkle inclusion proof.
* Greatly reduces proving time, but requires the Merkle root to be anchored in an onchain contract, introducing onchain costs.

---

## Future Work

| Future enhancement                | Description                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `verify_signature` or `ecrecover` | Full ECDSA signature verification inside the Noir circuit                       |
| Merkle tree inclusion proofs      | Move to a Merkle inclusion model for faster proving, with an onchain root       |
| Transaction hash checks           | Rebuild the tx hash from v, r, s and confirm against the Coinbase contract call |

These improvements are essential to evolve zk-Coinbase-Attestor into a production-grade, privacy-first compliance primitive for Noir and Base.

---

## Progress

| Task                                           | Status      |
| ---------------------------------------------- | ----------- |
| SDK + Portal + Noir architecture               | Complete    |
| keccak-only PoC and Noir profiler optimization | Complete    |
| 3-5 second proving time (UltraHonk WASM)       | Complete    |
| Replay protection (origin, nonce, timestamp)   | Complete    |
| Netlify deployment & Base showcase prep        | Complete    |
| Noir signature & Merkle research               | Planned     |
| UI/UX polishing                                | In progress |

---

## Conclusion

zk-Coinbase-Attestor currently achieves:

* Fully local, browser-executed Zero-Knowledge Proofs
* Noir + UltraHonk enabling **proofs in roughly 4 seconds**
* A secure foundation with nonce, origin, and timestamp protections

Future iterations will integrate signature recovery (v, r, s) and Merkle-based inclusion proofs, making this one of the most robust and practical privacy-preserving compliance solutions available for Base and the Noir ecosystem.

---

## Reference Links

* [Coinbase Onchain Verify (KYC)](https://www.coinbase.com/onchain-verify)
* [Coinbase Verifications repo](https://github.com/coinbase/verifications)
* [EAS Schema on Base](https://base.easscan.org/schema/view/0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9)
* [Noir Documentation](https://noir-lang.org/docs)