export default function Home() {
  return (
    <main className="min-h-screen bg-zk-black text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full bg-zk-surface rounded-xl shadow-xl backdrop-blur-xs border border-white/10 p-6 space-y-6">
        <h1 className="text-2xl font-semibold text-center">
          🛡️ Coinbase KYC Proof Portal
        </h1>
        <p className="text-sm text-gray-400 text-center">
          Prove you're KYC verified — without revealing your address.
        </p>
        <button className="bg-coinbase-blue hover:bg-coinbase-blue/90 transition px-4 py-2 rounded text-white font-semibold w-full">
          Connect Wallet & Start
        </button>
      </div>
    </main>
  );
}