import { verifyProof } from "./verifier";
import { validateMetadata } from "./signer";
import { CIRCUIT_URL, PROOF_PORTAL_URL, ALLOWED_ORIGIN } from "./constants";
import { ethers } from "ethers";
export async function openZkKycPopup() {
    return new Promise((resolve, reject) => {
        const origin = window.location.origin;
        const nonce = crypto.randomUUID();
        const url = `${PROOF_PORTAL_URL}?origin=${encodeURIComponent(origin)}&nonce=${nonce}`;
        const popup = window.open(url, "_blank");
        if (!popup)
            return reject(new Error("Popup blocked"));
        const timeout = setTimeout(() => {
            window.removeEventListener("message", handler);
            reject(new Error("Timed out waiting for proof"));
        }, 120000);
        function handler(event) {
            if (event.origin !== ALLOWED_ORIGIN)
                return;
            const { type, proof, publicInputs, meta, tx } = event.data || {};
            if (type !== "zk-coinbase-proof")
                return;
            clearTimeout(timeout);
            window.removeEventListener("message", handler);
            resolve({ proof, publicInputs, meta, tx });
        }
        window.addEventListener("message", handler);
    });
}
export async function verifyZkKycProof({ proof, publicInputs, meta, tx, }) {
    try {
        // 1. validate metadata
        validateMetadata(meta);
        // 2. recompute digest from calldata
        const calldata = tx.input.slice(0, 74);
        const calldataBytes = ethers.getBytes(calldata);
        const digest = ethers.keccak256(calldataBytes);
        // 3. recover Coinbase pubkey from tx.vrs
        const sigCB = { r: tx.r, s: tx.s, v: parseInt(tx.v) };
        const cbPubkeyHex = ethers.SigningKey.recoverPublicKey(digest, sigCB);
        const cbPub = ethers.getBytes(cbPubkeyHex);
        const cbX = cbPub.slice(1, 33);
        const cbY = cbPub.slice(33);
        // 4. extract publicInputs[0–63] as 32-byte x/y
        const expectedX = hexStringsToUint8Array(publicInputs.slice(0, 32));
        const expectedY = hexStringsToUint8Array(publicInputs.slice(32, 64));
        if (!arraysEqual(cbX, expectedX)) {
            throw new Error("Coinbase public key X mismatch");
        }
        if (!arraysEqual(cbY, expectedY)) {
            throw new Error("Coinbase public key Y mismatch");
        }
        // 5. verify ZK proof
        const isValid = await verifyProof(proof, publicInputs, CIRCUIT_URL);
        if (!isValid)
            throw new Error("Invalid proof");
        return { success: true, proof, publicInputs };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
}
function hexStringsToUint8Array(hexArr) {
    return Uint8Array.from(hexArr.map((h) => Number(BigInt(h))));
}
function arraysEqual(a, b) {
    if (a.length !== b.length)
        return false;
    return a.every((v, i) => v === b[i]);
}
