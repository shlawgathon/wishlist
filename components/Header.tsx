'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Menu } from 'lucide-react';

export default function Header() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'active' | 'processing'>('idle');

  useEffect(() => {
    const interval = setInterval(() => {
      const statuses: Array<'idle' | 'active' | 'processing'> = ['idle', 'active', 'processing'];
      setAgentStatus(statuses[Math.floor(Math.random() * statuses.length)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const connectWallet = async () => {
    const mockAddress = `0x${Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;
    
    setWalletAddress(mockAddress);
    setWalletConnected(true);
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setWalletConnected(false);
  };

  const getStatusColor = () => {
    switch (agentStatus) {
      case 'active':
        return 'bg-green-500';
      case 'processing':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <div className="mr-4 flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Wishlist
            </span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link 
            href="/" 
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Dashboard
          </Link>
          <Link 
            href="/creator" 
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Creator
          </Link>
          <Link 
            href="/agent" 
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Agent Console
          </Link>
        </nav>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${agentStatus !== 'idle' ? 'animate-pulse' : ''}`} />
            <Badge variant="outline" className="text-xs">
              Agent: {agentStatus}
            </Badge>
          </div>

          {walletConnected ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 text-sm">
                <Wallet className="h-4 w-4" />
                <span className="font-mono text-xs">
                  {walletAddress?.substring(0, 6)}...{walletAddress?.substring(38)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectWallet}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={connectWallet}
              size="sm"
              className="gap-2"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
