'use client';
import { useState } from 'react';
import { requestZkKycProof } from '@zk/coinbase-attestor';

export default function AirdropVerifierDApp() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setStatus('loading');
    setError(null);
    const result = await requestZkKycProof();
    if (result.success) {
      setStatus('success');
    } else {
      setStatus('error');
      setError(result.error || 'Verification failed');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-xl bg-white border border-orange-200 rounded-2xl shadow-lg px-8 py-10 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-orange-700 tracking-tight">
            🌟 KYC Verified Airdrop Portal <span className="text-sm text-gray-400">(Example dApp)</span>
          </h1>
          <p className="text-sm text-gray-600">
            Prove your identity anonymously and claim your spot in the exclusive DAO airdrop.<br/>
            Your wallet address stays private — but your eligibility is verified with zero-knowledge.
          </p>
          <p className="text-xs text-gray-500 italic pt-1">
            When you click the button below, you’ll be redirected to a secure Proof Portal.<br/>
            There, you’ll connect your wallet and generate a zero-knowledge proof entirely in your browser.<br/>
            No data is sent to any server. Security is ensured using nonce, origin-binding, and timestamp checks.
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={handleVerify}
            disabled={status === 'loading'}
            className={`w-full py-3 px-5 text-sm font-semibold rounded-xl shadow-sm transition 
              ${status === 'loading'
                ? 'bg-orange-300 cursor-not-allowed text-white'
                : 'bg-orange-500 hover:bg-orange-600 active:scale-95 text-white'}
            `}
          >
            {status === 'loading' ? 'Verifying Proof...' : 'Verify & Claim Airdrop'}
          </button>
        </div>

        {status === 'success' && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3 shadow-sm animate-fade-in">
            Your proof has been verified! You're eligible for the DAO airdrop.
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 shadow-sm animate-fade-in">
            Verification failed: {error}
          </div>
        )}

      </div>
    </main>
  );
}
