'use client';

import Header from '@/components/Header';
import AgentConsole from '@/components/AgentConsole';

export default function AgentPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Agent Console</h1>
        <AgentConsole />
      </main>
    </div>
  );
}

