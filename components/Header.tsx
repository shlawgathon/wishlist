'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, LogOut, User } from 'lucide-react';
import LoginDialog from './LoginDialog';
import SignupDialog from './SignupDialog';

interface User {
  username: string;
  buyerApiKey?: string;
}

interface WalletBalance {
  balance: number;
  balanceFormatted: string;
  budgetStatus: string;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showSignupDialog, setShowSignupDialog] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'active' | 'processing'>('idle');
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Fetch wallet balance when user has API key
  useEffect(() => {
    if (user?.buyerApiKey) {
      fetchWalletBalance();
      // Refresh balance every 30 seconds
      const interval = setInterval(fetchWalletBalance, 30000);
      return () => clearInterval(interval);
    } else {
      setWalletBalance(null);
    }
  }, [user?.buyerApiKey]);

  const fetchWalletBalance = async () => {
    if (!user?.buyerApiKey) return;
    
    try {
      const response = await fetch('/api/wallet/balance');
      if (response.ok) {
        const data = await response.json();
        setWalletBalance(data);
      }
    } catch (error) {
      // Silently fail - don't show errors in header
      console.error('Error fetching wallet balance:', error);
    }
  };

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const statuses: Array<'idle' | 'active' | 'processing'> = ['idle', 'active', 'processing'];
      setAgentStatus(statuses[Math.floor(Math.random() * statuses.length)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    setShowLoginDialog(false);
  };

  const handleSignupSuccess = (userData: User) => {
    setUser(userData);
    setShowSignupDialog(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const switchToSignup = () => {
    setShowLoginDialog(false);
    setShowSignupDialog(true);
  };

  const switchToLogin = () => {
    setShowSignupDialog(false);
    setShowLoginDialog(true);
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
            {user && (
              <Link 
                href="/settings" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Settings
              </Link>
            )}
          </nav>

          <div className="flex flex-1 items-center justify-end space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${agentStatus !== 'idle' ? 'animate-pulse' : ''}`} />
              <Badge variant="outline" className="text-xs font-normal">
                Agent: {agentStatus}
              </Badge>
            </div>

            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{user.username}</span>
                  {user.buyerApiKey && (
                    <>
                      {walletBalance ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Wallet className="h-3 w-3" />
                          {walletBalance.balanceFormatted}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <Wallet className="h-3 w-3 mr-1" />
                          Wallet Ready
                        </Badge>
                      )}
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2 rounded-lg"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLoginDialog(true)}
                  className="rounded-lg"
                >
                  Login
                </Button>
                <Button
                  onClick={() => setShowSignupDialog(true)}
                  size="sm"
                  className="gap-2 rounded-lg"
                >
                  <Wallet className="h-4 w-4" />
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <LoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        onSuccess={handleLoginSuccess}
        switchToSignup={switchToSignup}
      />
      <SignupDialog
        open={showSignupDialog}
        onOpenChange={setShowSignupDialog}
        onSuccess={handleSignupSuccess}
        switchToLogin={switchToLogin}
      />
    </>
  );
}
