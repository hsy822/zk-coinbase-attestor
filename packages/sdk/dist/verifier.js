import { UltraHonkBackend } from "@aztec/bb.js";
export async function verifyProof(proofHex, publicInputs, circuitUrl) {
    try {
        const metadata = await fetch(circuitUrl).then((res) => res.json());
        const backend = new UltraHonkBackend(metadata.bytecode, { threads: 2 });
        const proofBytes = hexToBytes(proofHex);
        const result = await backend.verifyProof({
            proof: proofBytes,
            publicInputs,
        }, { keccak: true });
        console.timeEnd("✅ verify");
        backend.destroy();
        return result;
    }
    catch (err) {
        console.error("Verification failed:", err);
        return false;
    }
}
const hexToBytes = (hex) => {
    if (typeof hex !== "string")
        return new Uint8Array(hex);
    if (hex.startsWith("0x"))
        hex = hex.slice(2);
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
};
