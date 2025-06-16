export type ProofMeta = {
    nonce: string;
    origin: string;
    timestamp: number;
};
export declare function validateMetadata(meta: ProofMeta): void;
