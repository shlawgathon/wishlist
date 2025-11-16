'use client';

import Header from '@/components/Header';
import AISearchBar from '@/components/AISearchBar';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Header />
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] w-full px-4 py-12">
        <div className="w-full max-w-4xl mx-auto space-y-8">
          {/* Title Section */}
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 text-center">
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Wishlist
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light">
              AI-powered crypto fundraising platform
            </p>
          </div>

          {/* AI Search Bar - Full Chat Mode */}
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300 w-full">
            <AISearchBar />
          </div>
        </div>
      </main>
    </div>
  );
}
