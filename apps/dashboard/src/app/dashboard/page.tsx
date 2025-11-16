'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

export default function Dashboard() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    redirect('/api/auth/signin');
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Server Configuration</h2>
          <p className="text-gray-400">Manage server settings</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Tickets</h2>
          <p className="text-gray-400">Manage ticket categories</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">AI Support</h2>
          <p className="text-gray-400">Configure AI responses</p>
        </div>
      </div>
    </div>
  );
}