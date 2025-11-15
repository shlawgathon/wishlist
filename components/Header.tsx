'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet } from 'lucide-react';
import WalletConnectDialog from './WalletConnectDialog';

export default function Header() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [locusApiKey, setLocusApiKey] = useState<string | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'active' | 'processing'>('idle');

  useEffect(() => {
    const savedKey = localStorage.getItem('locus_buyer_api_key');
    const savedWallet = localStorage.getItem('wallet_address');
    if (savedKey && savedWallet) {
      setLocusApiKey(savedKey);
      setWalletAddress(savedWallet);
      setWalletConnected(true);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const statuses: Array<'idle' | 'active' | 'processing'> = ['idle', 'active', 'processing'];
      setAgentStatus(statuses[Math.floor(Math.random() * statuses.length)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = (apiKey: string) => {
    const mockAddress = `0x${Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;
    
    localStorage.setItem('locus_buyer_api_key', apiKey);
    localStorage.setItem('wallet_address', mockAddress);
    
    setLocusApiKey(apiKey);
    setWalletAddress(mockAddress);
    setWalletConnected(true);
  };

  const disconnectWallet = () => {
    localStorage.removeItem('locus_buyer_api_key');
    localStorage.removeItem('wallet_address');
    setWalletAddress(null);
    setLocusApiKey(null);
    setWalletConnected(false);
  };

  const getStatusColor = () => {
    switch (agentStatus) {
      case 'active':
        return 'bg-green-500';
      case 'processing':
        return 'bg-yellow-500';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="w-full flex h-16 items-center px-4 sm:px-6 lg:px-8">
          <div className="mr-4 flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2 group">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-purple-700 transition-all">
                Wishlist
              </span>
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link 
              href="/" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              href="/listings" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Listings
            </Link>
            <Link 
              href="/creator" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Creator
            </Link>
            <Link 
              href="/agent" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Agent Console
            </Link>
          </nav>

          <div className="flex flex-1 items-center justify-end space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${agentStatus !== 'idle' ? 'animate-pulse' : ''}`} />
              <Badge variant="outline" className="text-xs font-normal">
                Agent: {agentStatus}
              </Badge>
            </div>

            {walletConnected ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {walletAddress?.substring(0, 6)}...{walletAddress?.substring(38)}
                  </span>
                  {locusApiKey && (
                    <Badge variant="secondary" className="text-xs">
                      Locus Active
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectWallet}
                  className="rounded-lg"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowConnectDialog(true)}
                size="sm"
                className="gap-2 rounded-lg"
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </header>

      <WalletConnectDialog
        open={showConnectDialog}
        onOpenChange={setShowConnectDialog}
        onConnect={handleConnect}
      />
    </>
  );
}
