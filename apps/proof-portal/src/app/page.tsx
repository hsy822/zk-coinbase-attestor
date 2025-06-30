"use client";

import { useEffect, useState, useRef } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { ethers } from "ethers";
import { Noir } from "@noir-lang/noir_js";
import { UltraHonkBackend } from "@aztec/bb.js";
import { Loader2, CheckCircle, Sparkles, ShieldCheck } from "lucide-react";

const STEPS = [
  { action: "Connecting wallet", done: "Wallet connected" },
  { action: "Fetching KYC attestation", done: "KYC attestation fetched" },
  { action: "Extracting calldata from tx", done: "Calldata extracted" },
  { action: "Generating digest from calldata", done: "Digest generated" },
  { action: "Signing digest and recovering public key", done: "User signature verified" },
  { action: "Generating ZK proof", done: "ZK proof generated" },
];

const COINBASE_CONTRACT = "0x357458739F90461b99789350868CD7CF330Dd7EE";
const ETH_SIGNED_PREFIX = "\x19Ethereum Signed Message:\n32";

export default function ProofPortal() {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [logs, setLogs] = useState<{ text: string, type: string, interactive?: boolean }[]>([]);
  const [proofResult, setProofResult] = useState<null | any>(null);
  const [fromSdk, setFromSdk] = useState(false);

  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { data: walletClient } = useWalletClient();
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (window.opener) setFromSdk(true); }, []);
  useEffect(() => {
    if (isConnected) {
      setCompletedSteps([0]);
    }
  }, [isConnected]);
  useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const appendLog = (text: string, type: string = "info", interactive = false) =>
    setLogs((prev) => [...prev, { text, type, interactive }]);

  const updateLastLog = (text: string, type: string = "info") =>
    setLogs((prev) => {
      const newLogs = [...prev];
      newLogs[newLogs.length - 1] = { ...newLogs[newLogs.length - 1], text, type };
      return newLogs;
    });

  const markStepComplete = (i: number) =>
    setCompletedSteps((prev) => [...prev, i]);

  const handleProve = async () => {
    try {
      if (!isConnected) {
        openConnectModal?.();
        return;
      }

      setLoading(true);
      setCurrentStep(null);
      setLogs([]);
      setCompletedSteps([]);
      setProofResult(null);

      let attestation: any;
      let tx: any;
      let calldata: Uint8Array;
      let digest: string, rawDigest: string;
      let userX: Uint8Array, userY: Uint8Array, sigUser: ethers.Signature, userAddress: any;

      const step = async (i: number, fn: () => Promise<void>) => {
        setCurrentStep(i);
        appendLog(STEPS[i].action + "...", "info");
        await fn();
        markStepComplete(i);
        appendLog(`✔ ${STEPS[i].done}`, "success");
      };

      await step(0, async () => appendLog(`Wallet: ${address}`, "info"));

      await step(1, async () => {
        attestation = await fetchKycAttestation(address!);
        if (!attestation) throw new Error("No valid KYC attestation found.");
        appendLog("Attestation tx: " + attestation.txid, "info");
      });

      await step(2, async () => {
        tx = await fetchRawTx(attestation.txid);
        let calldataHex: string = tx.input;
        if (calldataHex.length < 74) calldataHex = calldataHex.padEnd(74, "0");
        calldata = ethers.getBytes(calldataHex.slice(0, 74));
        appendLog("Extracted calldata (" + calldata.length + " bytes)", "info");
      });

      await step(3, async () => {
        rawDigest = ethers.keccak256(calldata);
        digest = ethers.keccak256(
          ethers.concat([
            ethers.toUtf8Bytes(ETH_SIGNED_PREFIX),
            ethers.getBytes(rawDigest),
          ])
        );
        appendLog("Generated Ethereum-signed digest from calldata", "info");
      });

      await step(4, async () => {
        const signer = await new ethers.BrowserProvider(walletClient!).getSigner();
        const sigUserRaw = await walletClient!.signMessage({
          account: signer.address as `0x${string}`,
          message: { raw: rawDigest as `0x${string}` },
        });
        sigUser = ethers.Signature.from(sigUserRaw);

        const pubKeyHex = ethers.SigningKey.recoverPublicKey(digest, sigUser);
        const pubKeyBytes = ethers.getBytes(pubKeyHex);
        userX = pubKeyBytes.slice(1, 33);
        userY = pubKeyBytes.slice(33);

        userAddress = signer.address;
        appendLog("Recovered public key from user signature", "info");
      });

      await step(5, async () => {
        const circuitInput = {
          calldata: Array.from(calldata),
          contract_address: Array.from(ethers.getBytes(COINBASE_CONTRACT)),
          user_address: Array.from(ethers.getBytes(userAddress)),
          digest: Array.from(ethers.getBytes(digest)),
          user_sig: Array.from(new Uint8Array([...ethers.getBytes(sigUser.r), ...ethers.getBytes(sigUser.s)])),
          user_pubkey_x: Array.from(userX),
          user_pubkey_y: Array.from(userY),
        };
        const CIRCUIT_URL = "https://raw.githubusercontent.com/hsy822/zk-coinbase-attestor/develop/packages/circuit/target/zk_coinbase_attestor.json";
        const metaRes = await fetch(CIRCUIT_URL);
        const metadata = await metaRes.json();
        const noir = new Noir(metadata);
        const backend = new UltraHonkBackend(metadata.bytecode, { threads: 4 });
        const { witness } = await noir.execute(circuitInput);

        const start = Date.now();

        const proof = await backend.generateProof(witness, { keccak: true });

        const duration = ((Date.now() - start) / 1000).toFixed(1);
        updateLastLog(`✔ ZK Proof generated (${duration}s)`, "highlight");
        appendLog(`# A zero-knowledge proof verifying your Coinbase KYC attestation was successfully generated.`, "note");
        appendLog(`# Entirely inside your browser memory. It was never stored or uploaded.`, "note");
        appendLog(`# This proof will be sent just once to the originating dApp for verification via postMessage.`, "note");
        appendLog(`# Afterwards it is discarded. Your wallet & onchain history remain private.`, "note");
        appendLog(``, "info", true);

        const params = new URLSearchParams(window.location.search);
        const meta = {
          origin: params.get("origin") || "unknown",
          timestamp: Math.floor(Date.now() / 1000),
          nonce: params.get("nonce") || "missing",
        };

        setProofResult({
          proof: proof.proof,
          publicInputs: proof.publicInputs,
          meta,
        });
      });

      setCurrentStep(null);
    } catch (err: any) {
      appendLog(`❌ ${err.message || "Unknown error"}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const submitProofAndClose = () => {
    if (proofResult) {
      window.opener?.postMessage({
        type: "zk-coinbase-proof",
        proof: proofResult.proof,
        publicInputs: proofResult.publicInputs,
        meta: proofResult.meta,
      }, "*");
    }
    window.close();
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white font-mono p-8">
      <main className="flex-grow p-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#121212] border border-gray-800 rounded-2xl shadow-xl p-6 space-y-6" >
            <div className="flex items-center justify-center gap-2 text-indigo-400 font-semibold text-sm">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span>Proof Portal</span>
            </div>
            <h1 className="text-2xl font-extrabold text-center text-white">🔐 Private Coinbase KYC Verification</h1>
            <ul className="space-y-3 text-sm">
              {STEPS.map((s, i) => {
                const isComplete = completedSteps.includes(i);
                const isActive = currentStep === i;
                return (
                  <li key={i} className={`flex items-start gap-3 pl-3 border-l-2 ${isComplete ? "border-emerald-400" : isActive ? "border-indigo-400" : "border-gray-700"}`}>
                    <div className="pt-0.5">
                      {isActive ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> :
                        isComplete ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
                        <div className="w-3 h-3 rounded-full bg-gray-700"></div>}
                    </div>
                    <span className={`${isComplete ? "text-emerald-300" : isActive ? "text-indigo-300" : "text-gray-400"}`}>
                      {isActive ? s.action : isComplete ? s.done : s.action}
                    </span>
                  </li>
                );
              })}
            </ul>
            <button onClick={handleProve} disabled={!fromSdk || loading}
              className={`w-full py-3 px-6 rounded-2xl font-semibold text-sm tracking-tight bg-gradient-to-r from-purple-600 to-indigo-500 hover:brightness-125 active:scale-95 shadow-2xl transition ${loading || !fromSdk ? "opacity-50 cursor-not-allowed" : ""}`}>
              {!isConnected ? "Connect Wallet" : loading ? "Generating ZK Proof..." : "Generate ZK Proof"}
            </button>
          </div>
          <div className="bg-[#0c0c0c] rounded-2xl p-6 shadow-inner text-sm overflow-auto h-[430px] border border-green-700/30 font-mono space-y-1 leading-relaxed">
            <div className="text-xs text-gray-400 mb-2">
              [ UltraHonk Proof Generation ]
            </div>
            {logs.map((log, i) => (
              <div
                key={i}
                className={
                  log.type === "success"
                    ? "text-emerald-400"
                    : log.type === "error"
                    ? "text-red-400"
                    : log.type === "highlight"
                    ? "text-sky-400 font-bold"
                    : log.type === "note"
                    ? "text-yellow-300"
                    : "text-white"
                        }
                      >
                {log.text}
              </div>
            ))}
            <div ref={terminalEndRef} />

            {logs.some((log) => log.interactive) && (
              <button
                onClick={submitProofAndClose}
                className="mt-4 w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-500 hover:brightness-125 active:scale-95 shadow-lg transition font-semibold text-sm"
              >
                Send Proof to dApp
              </button>
            )}
          </div>
        </div>
      </main>
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
        attester: COINBASE_CONTRACT,
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
