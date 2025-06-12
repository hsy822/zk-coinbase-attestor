"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

export default function Home() {
  const [address, setAddress] = useState("");
  const [attestations, setAttestations] = useState<any[]>([]);
  const [txData, setTxData] = useState<any | null>(null);

  useEffect(() => {
    if (!address) return;
    fetchAttestations(address).then(setAttestations);
  }, [address]);

  useEffect(() => {
    if (!attestations.length) return;

    const fetchTx = async () => {
      const txid = attestations[0].txid;
      if (!txid) return;

      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_BASE_RPC_URL);
      try {
        const tx = await provider.getTransaction(txid);
        console.log("Fetched transaction:", tx);
        if (!tx) {
          console.warn("Transaction not found for txid:", txid);
          return;
        }
        setTxData({
          from: tx.from,
          to: tx.to,
          value: tx.value.toString(),
          data: tx.data,
          hash: tx.hash,
        });
      } catch (e) {
        console.error("Failed to fetch tx from Infura:", e);
      }
    };

    fetchTx();
  }, [attestations]);

  const connectWallet = async () => {
    if (typeof (window as any).ethereum === "undefined") {
      alert("MetaMask not found");
      return;
    }
  
    try {
      const [addr] = await (window as any).ethereum.request({
        method: "eth_requestAccounts",
      });
  
      const checksummed = ethers.getAddress(addr);
      setAddress(checksummed);
    } catch (err) {
      console.error("Wallet connection failed", err);
      alert("Wallet connection failed");
    }
  };

  const fetchAttestations = async (address: string) => {
    const query = `
      query GetAttestations($recipient: String!, $attester: String!, $schemaId: String!, $now: Int!) {
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
          take: 10
        ) {
          id
          txid
          attester
          recipient
          refUID
          revocable
          revocationTime
          expirationTime
          data
          schema {
            id
          }
        }
      }
    `;

    try {
      const now = Math.floor(Date.now() / 1000);
      const res = await fetch("https://base.easscan.org/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: { 
            recipient: address,
            attester: "0x357458739F90461b99789350868CD7CF330Dd7EE",
            schemaId: "0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9",
            now },
        }),
      });

      const json = await res.json();
      if (json.errors) {
        console.error("GraphQL Errors:", json.errors);
        return [];
      }

      console.log("GraphQL Response:", json);
      return json.data?.attestations || [];
    } catch (err) {
      console.error("Fetch error:", err);
      return [];
    }
  };

  return (
    <main className="min-h-screen bg-zk-black text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full bg-zk-surface rounded-xl shadow-xl backdrop-blur-xs border border-white/10 p-6 space-y-6">
        <h1 className="text-2xl font-semibold text-center">
          🛡️ Coinbase KYC Proof Portal
        </h1>
        <p className="text-sm text-gray-400 text-center">
          Prove you're KYC verified — without revealing your address.
        </p>
        <button
          className="bg-coinbase-blue hover:bg-coinbase-blue/90 transition px-4 py-2 rounded text-white font-semibold w-full"
          onClick={connectWallet}
        >
          Connect Wallet & Start
        </button>

        {address && (
          <p className="text-xs text-center text-gray-300 break-all">
            Connected Address: <br />
            <code>{address}</code>
          </p>
        )}

        {attestations.length > 0 && (
          <div className="mt-6 text-sm text-left space-y-2">
            <h3 className="font-semibold text-lg text-center">🧾 Found Attestations</h3>
            {attestations.map((att: any) => (
              <div
                key={att.id}
                className="border border-white/10 rounded-lg p-3 bg-white/5 break-words"
              >
                <div><strong>Attester:</strong> {att.attester}</div>
                <div><strong>UID:</strong> {att.id}</div>
                <div><strong>Data:</strong> {att.data}</div>
                <div><strong>TxHash:</strong> {att.txid}</div>
              </div>
            ))}
          </div>
        )}

        {txData && (
          <div className="mt-6 text-sm bg-white/10 p-3 rounded text-white space-y-1">
            <h4 className="font-semibold mb-2 text-center">📦 Transaction Details</h4>
            <div><strong>From:</strong> {txData.from}</div>
            <div><strong>To:</strong> {txData.to}</div>
            <div><strong>Value:</strong> {txData.value}</div>
            <div><strong>Hash:</strong> {txData.hash}</div>
          </div>
        )}
      </div>
    </main>
  );
}