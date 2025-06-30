'use client';
import { useState } from 'react';
import { openZkKycPopup, verifyZkKycProof } from '@zk/coinbase-attestor';
import Confetti from 'react-confetti';

export default function AirdropVerifierDApp() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(true);
  const [rawProof, setRawProof] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleVerify = async () => {
    setStatus('loading');
    setError(null);
    const rawProofResult = await openZkKycPopup();
    console.log({ rawProofResult });
    setRawProof(rawProofResult);
    const result = await verifyZkKycProof(rawProofResult);

    if (result.success) {
      setStatus('success');
      setShowSuccess(true);
    } else {
      setStatus('error');
      setError((result as any).error || 'Verification failed');
    }
  };

  const handleCopy = () => {
    if (rawProof) {
      navigator.clipboard.writeText(JSON.stringify({
        proof: rawProof.proof,
        publicInputs: rawProof.publicInputs
      }, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleJoinAirdrop = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center px-6 py-24 relative">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      <div className="w-full max-w-4xl bg-white border border-gray-200 rounded-3xl shadow-xl grid md:grid-cols-2 gap-8 p-10 relative">

        {status === 'success' && showSuccess && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-md">
            <div className="relative bg-green-100 border border-green-300 text-green-800 text-base font-medium rounded-lg px-6 py-4 shadow-md text-left">
              <button
                className="absolute top-2 right-2 text-green-700 hover:text-green-900 text-sm font-bold"
                onClick={() => setShowSuccess(false)}
              >
                ×
              </button>
              <p className="mb-1">Proof verified: You are the owner of a Coinbase KYC’d account.</p>
              <p>We still don’t know your address — and never will.</p>

              <div className="mt-4 space-y-3">
                <button
                  onClick={handleJoinAirdrop}
                  className="inline-block w-full px-5 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition"
                >
                  Now you can join airdrop pool
                </button>

                <button
                  onClick={handleCopy}
                  className="inline-block w-full px-5 py-2 text-sm font-medium rounded-md border border-green-600 text-green-700 hover:bg-green-50 transition"
                >
                  {copied ? 'Copied!' : 'Copy proof to clipboard'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col justify-between bg-gray-50 border border-gray-100 rounded-2xl p-6 shadow-inner">
          <div className="fixed top-0 left-0 right-0 z-50 bg-green-100 text-green-800 border-b border-green-300 text-sm py-2 px-4 text-center shadow-sm">
            ⚠️ To use this demo, please complete{" "}
            <a
              href="https://www.coinbase.com/onchain-verify"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium text-green-900 hover:text-green-700"
            >
              Coinbase Onchain Verify
            </a>{" "}
            first to obtain a KYC attestation.
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">DAO Airdrop Eligibility - Example Dapp</h1>
            <p className="text-gray-700 text-sm mb-4">
              This example dApp allows eligible users to privately prove their KYC status to claim DAO airdrops.
            </p>
            <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
              <li>No wallet connection is required</li>
              <li>Your address is never shared with this dApp</li>
              <li>All verification is done via a trusted Proof Portal</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col justify-center bg-white border border-gray-100 rounded-2xl px-6 py-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">Verify Privately</h2>
            <p className="text-sm text-gray-500">
              We do not access or store your wallet address. To verify eligibility, please continue to the Coinbase Proof Portal.
            </p>
          </div>

          <button
            onClick={handleVerify}
            disabled={status === 'loading'}
            className={`w-full py-3 px-6 text-sm font-semibold rounded-xl shadow-md transition text-white tracking-tight
              ${status === 'loading'
                ? 'bg-gray-300 cursor-not-allowed flex items-center justify-center gap-2'
                : 'bg-gradient-to-r from-black to-gray-700 hover:brightness-110 active:scale-95'}
            `}
          >
            {status === 'loading' ? (
              <>
                <svg className="animate-spin h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                Verifying your proof...
              </>
            ) : (
              "Continue to Coinbase Proof Portal"
            )}
          </button>

          {status === 'loading' && (
            <p className="text-sm text-gray-500 text-center mt-2">
              This may take around 3 seconds. Please keep this page open.
            </p>
          )}

          {status === 'error' && (
            <div className="bg-red-50 border border-red-300 text-red-700 text-sm rounded-md px-4 py-3 shadow-sm">
              Verification failed: {error}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
