import { JsonRpcProvider } from "ethers";
export declare function verifyProof(proofHex: string, publicInputs: any, circuitUrl: string): Promise<boolean>;
export declare function verifyOnchain({ proof, publicInputs, verifierAddress, provider }: {
    proof: string;
    publicInputs: string[];
    verifierAddress: string;
    provider: JsonRpcProvider;
}): Promise<boolean>;
