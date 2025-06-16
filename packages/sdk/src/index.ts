// packages/sdk/src/index.ts

import { verifyProof } from "./verifier";
import { validateMetadata } from "./signer";
import { CIRCUIT_URL, PROOF_PORTAL_URL, ALLOWED_ORIGIN } from "./constants";

export type ProofResult =
  | { success: true; proof: string; publicInputs: any }
  | { success: false; error: string };

export async function requestZkKycProof(): Promise<ProofResult> {
  return new Promise((resolve) => {

    const origin = window.location.origin;
    const nonce = crypto.randomUUID();
    const url = `${PROOF_PORTAL_URL}?origin=${encodeURIComponent(origin)}&nonce=${nonce}`;

    const popup = window.open(
      url,
      "_blank",
      // "width=480,height=700"
    );

    if (!popup) {
      return resolve({ success: false, error: "Popup blocked" });
    }

    const timeout = setTimeout(() => {
      resolve({ success: false, error: "Timed out waiting for proof" });
      window.removeEventListener("message", handler);
    }, 120000);

    function handler(event: MessageEvent) {
      console.log({event});
      
      if (event.origin !== ALLOWED_ORIGIN) return;
      const { type, proof, publicInputs, meta } = event.data || {};
      if (type !== "zk-coinbase-proof") return;

      try {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);

        // Step 1: validate metadata
        try {
          validateMetadata(meta);
          console.log("✅ metadata validated");
        } catch (err: any) {
          console.error("❌ metadata validation failed:", err);
          resolve({ success: false, error: err.message });
          return;
        }

        // Step 2: verify proof
        verifyProof(proof, publicInputs, CIRCUIT_URL).then((isValid: any) => {
          if (isValid) {
            resolve({ success: true, proof, publicInputs });
          } else {
            resolve({ success: false, error: "Invalid ZK proof" });
          }
        });
      } catch (err: any) {
        resolve({ success: false, error: err.message });
      }
    }

    window.addEventListener("message", handler);
  });
}
