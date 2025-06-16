'use client';
import { useState } from 'react';
import { requestZkKycProof } from '@zk/coinbase-attestor';

export default function AirdropVerifierDApp() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(true);

  const handleVerify = async () => {
    setStatus('loading');
    setError(null);
    const result = await requestZkKycProof();
    if (result.success) {
      setStatus('success');
      setShowSuccess(true);
    } else {
      setStatus('error');
      setError(result.error || 'Verification failed');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-4xl bg-white border border-gray-200 rounded-3xl shadow-xl grid md:grid-cols-2 gap-8 p-10 relative">

        {status === 'success' && showSuccess && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="relative inline-block bg-green-100 border border-green-300 text-green-800 text-base font-medium rounded-lg px-6 py-4 shadow-md text-left max-w-md">
              <button
                className="absolute top-2 right-2 text-green-700 hover:text-green-900 text-sm font-bold"
                onClick={() => setShowSuccess(false)}
              >
                ×
              </button>
              <p className="mb-1">Proof verified: You are the owner of a Coinbase KYC’d account.</p>
              <p>We still don’t know your address — and never will.</p>
              <div className="mt-4">
                <button
                  disabled
                  className="inline-block px-5 py-2 text-sm font-medium rounded-md bg-gray-900 text-white opacity-80 cursor-not-allowed"
                >
                  Now you can join airdrop pool
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LEFT: Info */}
        <div className="flex flex-col justify-between bg-gray-50 border border-gray-100 rounded-2xl p-6 shadow-inner">
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

        {/* RIGHT: Proof trigger */}
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
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-black to-gray-700 hover:brightness-110 active:scale-95'}
            `}
          >
            {status === 'loading' ? 'Verifying your proof...' : 'Continue to Coinbase Proof Portal'}
          </button>

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
