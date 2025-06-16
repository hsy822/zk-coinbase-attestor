import { UltraHonkBackend } from "@aztec/bb.js";

export async function verifyProof(
  proofHex: string,
  publicInputs: any,
  circuitUrl: string
): Promise<boolean> {
  try {
    console.time("⏳ fetch circuit");
    const metadata = await fetch(circuitUrl).then((res) => res.json());
    console.timeEnd("⏳ fetch circuit");

    console.time("⚙️ wasm init");
    const backend = new UltraHonkBackend(metadata.bytecode, { threads: 2 });
    console.timeEnd("⚙️ wasm init");

    console.time("✅ verify");
    const proofBytes = hexToBytes(proofHex);
    const result = await backend.verifyProof(
      {
        proof: proofBytes,
        publicInputs,
      },
      { keccak: true }
    );
    console.timeEnd("✅ verify");
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
