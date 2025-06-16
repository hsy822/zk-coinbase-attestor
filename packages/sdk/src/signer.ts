export type ProofMeta = {
  // digest: string;
  nonce: string;
  origin: string;
  timestamp: number;
};
  
const usedNonces = new Set<string>();

export function validateMetadata(meta: ProofMeta): void {
  const now = Math.floor(Date.now() / 1000);
  const age = now - meta.timestamp;
  
  if (meta.origin !== window.location.origin) {
    throw new Error("Origin mismatch");
  }

  if (age > 300 || age < -10) {
    throw new Error("Timestamp out of range");
  }

  if (usedNonces.has(meta.nonce)) {
    throw new Error("Replay detected: nonce already used");
  }

  usedNonces.add(meta.nonce);
}
  