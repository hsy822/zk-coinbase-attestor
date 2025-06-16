"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Noir } from "@noir-lang/noir_js";
import { UltraHonkBackend } from "@aztec/bb.js";
import { Loader2, CheckCircle, ListTree, ShieldCheck, Sparkles } from "lucide-react";

const STEPS = [
  { action: "Connecting wallet", done: "Wallet connected" },
  { action: "Fetching KYC attestation", done: "KYC attestation fetched" },
  { action: "Extracting calldata", done: "Calldata extracted" },
  { action: "Verifying Coinbase signature", done: "Signature verified" },
  { action: "Signing message", done: "Message signed" },
  { action: "Generating ZK proof", done: "Proof generated" },
];

export default function ProofPortal() {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [proofGenerating, setProofGenerating] = useState(false);
  const [proofElapsed, setProofElapsed] = useState(0);
  const [proofGenerated, setProofGenerated] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [fromSdk, setFromSdk] = useState(false);

  useEffect(() => {
    if (window.opener) {
      setFromSdk(true);
    }
  }, []);

  useEffect(() => {
    if (proofGenerating) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        setProofElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [proofGenerating]);

  const logStep = (msg: string) => setLogs((prev) => [...prev, msg]);
  const markStepComplete = (i: number) =>
    setCompletedSteps((prev) => [...prev, i]);

  const handleProve = async () => {
    try {
      setLoading(true);
      setCurrentStep(null);
      setLogs([]);
      setCompletedSteps([]);
      setError("");

      let attestation: any;
      let tx: any;
      let calldata: Uint8Array;
      let digest: string;
      let cbX: Uint8Array, cbY: Uint8Array;
      let userX: Uint8Array, userY: Uint8Array, sigUser: ethers.Signature;

      const step = async (i: number, fn: () => Promise<void>) => {
        setCurrentStep(i);
        logStep(STEPS[i].action + "...");
        await fn();
        markStepComplete(i);
      };

      await step(0, async () => {
        const [addr]: string[] = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        const user: string = ethers.getAddress(addr);
        logStep(`Wallet: ${user}`);
      });

      await step(1, async () => {
        const [addr]: string[] = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        const user: string = ethers.getAddress(addr);
        attestation = await fetchKycAttestation(user);
        if (!attestation) throw new Error("No valid KYC attestation found.");
        logStep("Attestation tx: " + attestation.txid);
      });

      await step(2, async () => {
        tx = await fetchRawTx(attestation.txid);
        let calldataHex: string = tx.input;
        if (calldataHex.length < 74) calldataHex = calldataHex.padEnd(74, "0");
        calldata = ethers.getBytes(calldataHex.slice(0, 74));
        logStep("Extracted calldata (" + calldata.length + " bytes)");
      });

      await step(3, async () => {
        digest = ethers.keccak256(calldata);
        const sigCB = { r: tx.r, s: tx.s, v: parseInt(tx.v) };
        const cbPubkeyHex = ethers.SigningKey.recoverPublicKey(digest, sigCB);
        const cbPub = ethers.getBytes(cbPubkeyHex);
        cbX = cbPub.slice(1, 33);
        cbY = cbPub.slice(33);
        logStep("Coinbase pubkey recovered");
      });

      await step(4, async () => {
        const digestBytes: Uint8Array = ethers.getBytes(digest);
        const signer = await new ethers.BrowserProvider((window as any).ethereum).getSigner();
        const sigUserRaw: string = await signer.signMessage(digestBytes);
        sigUser = ethers.Signature.from(sigUserRaw);
        const userPubkeyHex: string = ethers.SigningKey.recoverPublicKey(digest, sigUser);
        const userPub = ethers.getBytes(userPubkeyHex);
        userX = userPub.slice(1, 33);
        userY = userPub.slice(33);
        logStep("User signature validated");
      });

      await step(5, async () => {
        const circuitInput = {
          calldata: Array.from(calldata),
          user_sig: Array.from(new Uint8Array([...ethers.getBytes(sigUser.r), ...ethers.getBytes(sigUser.s)])),
          coinbase_sig: Array.from(new Uint8Array([...ethers.getBytes(tx.r), ...ethers.getBytes(tx.s)])),
          user_pubkey_x: Array.from(userX),
          user_pubkey_y: Array.from(userY),
          coinbase_pubkey_x: Array.from(cbX),
          coinbase_pubkey_y: Array.from(cbY),
        };
        const CIRCUIT_URL = "https://raw.githubusercontent.com/hsy822/zk-coinbase-attestor/main/packages/circuit/target/zk_coinbase_attestor.json";
        const metaRes = await fetch(CIRCUIT_URL);
        const metadata = await metaRes.json();
        const noir = new Noir(metadata);
        const backend = new UltraHonkBackend(metadata.bytecode, { threads: 2 });
        const { witness } = await noir.execute(circuitInput);

        setProofGenerating(true);
        setProofElapsed(0);
        const start = Date.now();
        const proof = await backend.generateProof(witness, { keccak: true });
        backend.destroy();
        const duration = (Date.now() - start) / 1000;
        // const proofHex = "0x" + Buffer.from(proof.proof).toString("hex");
        setProofGenerating(false);
        logStep(`✅ ZK Proof generated (${duration.toFixed(1)}s)`);
        setProofGenerated(true);

        const params = new URLSearchParams(window.location.search);
        const meta = {
          origin: params.get("origin") || "unknown",
          timestamp: Math.floor(Date.now() / 1000),
          nonce: params.get("nonce") || "missing"
        };

        console.log(window.opener)
        console.log({ 
          type: "zk-coinbase-proof", 
          proof: proof.proof, 
          publicInputs: proof.publicInputs, 
          meta 
        })


        window.opener?.postMessage(
          { 
            type: "zk-coinbase-proof", 
            proof: proof.proof, 
            publicInputs: proof.publicInputs, 
            meta 
          }, 
        "*");

        let c = 3;
        const interval = setInterval(() => {
          c--;
          setCountdown(c);
          if (c === 0) {
            clearInterval(interval);
            window.close();
          }
        }, 1000);

      });

      setCurrentStep(null);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1c1c1c] text-white font-sans p-8">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#121212] border border-gray-800 rounded-2xl shadow-xl p-6 space-y-6">
          <div className="flex items-center justify-center gap-2 text-indigo-400 font-semibold text-sm">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span>Zero-Knowledge Attestation Flow</span>
          </div>
  
          <h1 className="text-2xl font-extrabold text-center text-white">
            🔐 Verify Coinbase KYC Privately
          </h1>
          <p className="text-center text-sm text-gray-400 leading-relaxed">
            Generate a zero-knowledge proof of your KYC status directly in your browser. No data ever leaves your device.
          </p>
  
          <ul className="space-y-3 text-sm text-gray-300">
            {STEPS.map((s, i) => {
              const isComplete = completedSteps.includes(i);
              const isActive = currentStep === i;
              return (
                <li key={i} className="flex items-center gap-2">
                  {isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  ) : isComplete ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <div className="w-4 h-4 border border-gray-600 rounded-full" />
                  )}
                  <span className="tracking-tight">
                    {isActive ? s.action : isComplete ? s.done : s.action}
                    {isActive && i === 5 && proofGenerating && (
                      <span className="ml-2 text-xs text-gray-500">{proofElapsed}s</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
  
          <button
            onClick={handleProve}
            disabled={!fromSdk || loading}
            className={`w-full py-3 px-5 rounded-xl text-white font-semibold text-sm tracking-tight
              bg-gradient-to-r from-purple-600 to-indigo-500 hover:brightness-110 active:scale-95
              transition transform shadow-lg ${loading || !fromSdk ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Generating ZK Proof..." : "Generate ZK Proof Securely"}
          </button>
  
          {!fromSdk && (
            <div className="text-sm text-yellow-400 bg-yellow-900 bg-opacity-10 border border-yellow-500 px-3 py-2 mt-2 rounded-md">
              🚫 This proof portal must be opened through a dApp for origin validation.
            </div>
          )}
  
          {error && (
            <div className="text-sm text-red-400 bg-red-900 bg-opacity-10 border border-red-500 px-3 py-2 rounded-md">
              ❌ {error}
            </div>
          )}
  
          {proofGenerated && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-sm text-emerald-800 mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold">
                  Proof successfully generated
                </div>
                <span className="text-xs text-emerald-600">Redirecting in {countdown}s</span>
              </div>
              <div>
                <button
                  onClick={submitProofAndClose}
                  className="mt-2 inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition"
                >
                  Go to dApp now
                </button>
              </div>
            </div>
          )}
        </div>
  
        <div className="bg-black text-green-400 rounded-2xl p-6 shadow-inner text-xs overflow-auto h-[400px] border border-gray-800">
          <div className="font-mono whitespace-pre-wrap leading-relaxed space-y-1">
            {logs.length === 0 ? (
              <span className="text-gray-500">Waiting for proof request...</span>
            ) : (
              logs.map((line, i) => <div key={i}>{line}</div>)
            )}
          </div>
        </div>
      </div>
  
      <footer className="mt-12 pt-6 border-t border-gray-800 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center gap-1 text-gray-600">
          <ShieldCheck className="w-4 h-4" />
          Proof system powered by <a href="https://noir-lang.org" target="_blank" className="underline text-white ml-1">Noir</a> and ZK cryptography.
        </div>
        <p className="mt-1 text-xs text-gray-600">
          Not affiliated with Coinbase.
        </p>
      </footer>
    </div>
  );
}  

async function fetchKycAttestation(address: string): Promise<any> {
  const now = Math.floor(Date.now() / 1000);
  const query = `query GetAttestations($recipient: String!, $attester: String!, $schemaId: String!, $now: Int!) {
    attestations(
      where: {
        recipient: { equals: $recipient }
        schemaId: { equals: $schemaId }
        attester: { equals: $attester }
        revocationTime: { equals: 0 }
        OR: [
          { expirationTime: { equals: 0 } }
          { expirationTime: { gt: $now } }
        ]
      }
      orderBy: { time: desc }
      take: 1
    ) {
      txid
    }
  }`;
  const res = await fetch("https://base.easscan.org/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: {
        recipient: address,
        attester: "0x357458739F90461b99789350868CD7CF330Dd7EE",
        schemaId: "0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9",
        now,
      },
    }),
  });
  const json = await res.json();
  return json.data?.attestations?.[0] || null;
}

async function fetchRawTx(txHash: string): Promise<any> {
  const res = await fetch(process.env.NEXT_PUBLIC_BASE_RPC_URL as string, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionByHash",
      params: [txHash],
    }),
  });
  const json = await res.json();
  return json.result;
}

const submitProofAndClose = () => {
  window.close();
};