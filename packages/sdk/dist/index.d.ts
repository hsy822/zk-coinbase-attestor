export type ProofResult = {
    success: true;
    proof: string;
    publicInputs: any;
} | {
    success: false;
    error: string;
};
export declare function requestZkKycProof(): Promise<ProofResult>;
