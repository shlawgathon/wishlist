'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Sparkles, Loader2 } from 'lucide-react';

export default function AISearchBar() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const locusApiKey = localStorage.getItem('locus_buyer_api_key');

      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          locusApiKey: locusApiKey || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResult(data.result || data.message || 'No results found');
    } catch (error) {
      console.error('Search error:', error);
      setResult('Error: Failed to process search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch();
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="relative group w-full">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative flex items-center w-full">
          <div className="absolute left-5 z-10">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask AI about investment opportunities, projects, or get recommendations..."
            className="w-full pl-14 pr-32 sm:pr-36 h-14 sm:h-16 text-sm sm:text-base border-2 border-border/50 focus:border-primary/50 bg-background/80 backdrop-blur-md rounded-2xl shadow-lg focus:shadow-xl transition-all duration-300"
            disabled={loading}
          />
          <Button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            size="lg"
            className="absolute right-2 h-10 sm:h-12 px-4 sm:px-6 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Searching...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Search</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {result && (
        <div className="mt-6 w-full p-4 sm:p-6 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md shadow-lg animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">AI Response</p>
              <p className="text-sm sm:text-base text-foreground whitespace-pre-wrap leading-relaxed break-words">{result}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
