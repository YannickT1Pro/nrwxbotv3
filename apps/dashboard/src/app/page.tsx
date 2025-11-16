import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-24">
      <h1 className="text-6xl font-bold mb-8">Kodari All-in-One Bot</h1>
      <p className="text-xl text-gray-400 mb-12">
        Production-ready Discord bot with advanced features
      </p>
      <Link 
        href="/api/auth/signin"
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition"
      >
        Login with Discord
      </Link>
    </main>
  );
}