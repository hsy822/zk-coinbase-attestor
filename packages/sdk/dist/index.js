import { verifyProof } from "./verifier";
import { validateMetadata } from "./signer";
import { CIRCUIT_URL, PROOF_PORTAL_URL, ALLOWED_ORIGIN, COINBASE_PUBKEY } from "./constants";
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
            console.log('origin', event.origin);
            console.log('allow', ALLOWED_ORIGIN);
            if (event.origin !== ALLOWED_ORIGIN)
                return;
            const { type, proof, publicInputs, meta } = event.data || {};
            if (type !== "zk-coinbase-proof")
                return;
            clearTimeout(timeout);
            window.removeEventListener("message", handler);
            resolve({ proof, publicInputs, meta });
        }
        window.addEventListener("message", handler);
    });
}
export async function verifyZkKycProof({ proof, publicInputs, meta, }) {
    try {
        // 1. validate metadata
        validateMetadata(meta);
        // 2. extract publicInputs[0–63] as 32-byte x/y
        const pubX = hexStringsToUint8Array(publicInputs.slice(0, 32));
        const pubY = hexStringsToUint8Array(publicInputs.slice(32, 64));
        // 3. compare with known Coinbase attester pubkey
        if (!arraysEqual(pubX, COINBASE_PUBKEY.x)) {
            throw new Error("Coinbase public key X mismatch");
        }
        if (!arraysEqual(pubY, COINBASE_PUBKEY.y)) {
            throw new Error("Coinbase public key Y mismatch");
        }
        // 4. verify ZK proof
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
