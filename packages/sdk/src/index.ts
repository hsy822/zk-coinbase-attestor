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
    const timestamp = Math.floor(Date.now() / 1000);

    const url = `${PROOF_PORTAL_URL}`;
    const popup = window.open(url, "_blank");

    if (!popup) {
      return resolve({ success: false, error: "Popup blocked" });
    }

    // send metadata to popup repeatedly until it receives it
    const payload = {
      type: "zk-coinbase-meta",
      origin,
      nonce,
      timestamp,
    };

    const maxAttempts = 15;
    let attempts = 0;

    const interval = setInterval(() => {
      if (!popup || popup.closed || attempts >= maxAttempts) {
        clearInterval(interval);
        return;
      }

      try {
        popup.postMessage(payload, PROOF_PORTAL_URL);
        attempts++;
      } catch (err) {
        console.warn("PostMessage to popup failed:", err);
      }
    }, 200);

    const timeout = setTimeout(() => {
      resolve({ success: false, error: "Timed out waiting for proof" });
      window.removeEventListener("message", handler);
    }, 120_000);

    function handler(event: MessageEvent) {
      console.log("[dApp received]", event);

      if (event.origin !== ALLOWED_ORIGIN) return;

      const { type, proof, publicInputs, meta } = event.data || {};
      if (type !== "zk-coinbase-proof") return;

      try {
        clearTimeout(timeout);
        clearInterval(interval);
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
