export type ProofResult = {
    success: true;
    proof: string;
    publicInputs: any;
} | {
    success: false;
    error: string;
};
export declare function openZkKycPopup(): Promise<{
    proof: string;
    publicInputs: string[];
    meta: any;
    tx: any;
}>;
export declare function verifyZkKycProof({ proof, publicInputs, meta, tx, }: {
    proof: string;
    publicInputs: string[];
    meta: any;
    tx: any;
}): Promise<ProofResult>;
