'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface User {
  username: string;
  buyerApiKey?: string;
  personalWalletAddress?: string;
}

interface PersonalWalletBalance {
  balance: number;
  balanceFormatted: string;
  walletAddress: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [buyerApiKey, setBuyerApiKey] = useState('');
  const [personalWalletAddress, setPersonalWalletAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [personalWalletBalance, setPersonalWalletBalance] = useState<PersonalWalletBalance | null>(null);
  const [loadingPersonalBalance, setLoadingPersonalBalance] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user?.personalWalletAddress) {
      fetchPersonalWalletBalance();
    }
  }, [user?.personalWalletAddress]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setBuyerApiKey(data.user.buyerApiKey || '');
        setPersonalWalletAddress(data.user.personalWalletAddress || '');
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalWalletBalance = async () => {
    if (!user?.personalWalletAddress) return;
    
    setLoadingPersonalBalance(true);
    try {
      const response = await fetch('/api/wallet/personal-balance');
      if (response.ok) {
        const data = await response.json();
        setPersonalWalletBalance(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch personal wallet balance:', errorData.error);
        setPersonalWalletBalance(null);
      }
    } catch (error) {
      console.error('Error fetching personal wallet balance:', error);
      setPersonalWalletBalance(null);
    } finally {
      setLoadingPersonalBalance(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Update buyer API key
      const apiKeyResponse = await fetch('/api/auth/update-buyer-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerApiKey: buyerApiKey.trim() || undefined }),
      });

      const apiKeyData = await apiKeyResponse.json();

      if (!apiKeyResponse.ok) {
        setError(apiKeyData.error || 'Failed to update Locus Wallet Agent API key');
        return;
      }

      // Update personal wallet address
      const walletResponse = await fetch('/api/auth/update-personal-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalWalletAddress: personalWalletAddress.trim() || undefined }),
      });

      const walletData = await walletResponse.json();

      if (!walletResponse.ok) {
        setError(walletData.error || 'Failed to update personal wallet address');
        return;
      }

      // Update user state with both responses
      setUser({
        ...apiKeyData.user,
        personalWalletAddress: walletData.user.personalWalletAddress,
      });
      setSuccess('Settings updated successfully!');
      
      // Refresh personal wallet balance
      if (walletData.user.personalWalletAddress) {
        await fetchPersonalWalletBalance();
      } else {
        setPersonalWalletBalance(null);
      }
    } catch (error) {
      setError('Failed to update settings. Please try again.');
      console.error('Update error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>
              Manage your account and payment settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium">Username</Label>
                <p className="text-sm text-muted-foreground mt-1">{user?.username}</p>
              </div>

              {/* Personal Wallet Balance */}
              {user?.personalWalletAddress && (
                <div className="p-4 rounded-lg border bg-muted/50">
                  <Label className="text-sm font-medium mb-2 block">Personal Wallet Balance</Label>
                  {loadingPersonalBalance ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : personalWalletBalance ? (
                    <div className="space-y-2">
                      <p className="text-2xl font-bold">{personalWalletBalance.balanceFormatted}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {personalWalletBalance.walletAddress.substring(0, 6)}...{personalWalletBalance.walletAddress.substring(38)}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={fetchPersonalWalletBalance}
                        className="mt-2"
                      >
                        Refresh Balance
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Unable to fetch balance</p>
                  )}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="buyer-api-key">Locus Wallet Agent API Key</Label>
                  <Input
                    id="buyer-api-key"
                    type="text"
                    value={buyerApiKey}
                    onChange={(e) => setBuyerApiKey(e.target.value)}
                    placeholder="locus_dev_... or locus_..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Locus Wallet Agent API key for making payments. When creating an agent in your wallet, make sure to select "Create API Key" so it can buy stuff. This key is stored securely and used automatically when you make investments.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personal-wallet-address">Personal Wallet Address</Label>
                  <Input
                    id="personal-wallet-address"
                    type="text"
                    value={personalWalletAddress}
                    onChange={(e) => setPersonalWalletAddress(e.target.value)}
                    placeholder="0x..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Your personal wallet address (Base network) to view USDC balance. This is optional and only used for displaying your wallet balance.
                  </p>
                </div>

                {error && (
                  <div className="text-sm text-red-500">{error}</div>
                )}

                {success && (
                  <div className="text-sm text-green-500">{success}</div>
                )}

                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

