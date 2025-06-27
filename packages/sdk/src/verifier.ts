import { UltraHonkBackend } from "@aztec/bb.js";

export async function verifyProof(
  proofHex: string,
  publicInputs: any,
  circuitUrl: string
): Promise<boolean> {
  try {
    const metadata = await fetch(circuitUrl).then((res) => res.json());

    const backend = new UltraHonkBackend(metadata.bytecode, { threads: 4 });

    const proofBytes = hexToBytes(proofHex);
    const result = await backend.verifyProof(
      {
        proof: proofBytes,
        publicInputs,
      },
      { keccak: true }
    );
    backend.destroy();
    return result;
  } catch (err) {
    console.error("Verification failed:", err);
    return false;
  }
}

const hexToBytes = (hex: string | Uint8Array): Uint8Array => {
  if (typeof hex !== "string") return new Uint8Array(hex); 

  if (hex.startsWith("0x")) hex = hex.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
   return bytes;
};
