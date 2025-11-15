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
}

interface WalletBalance {
  balance: number;
  balanceFormatted: string;
  budgetStatus: string;
  contacts: Array<{ number: number; email: string }>;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [buyerApiKey, setBuyerApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user?.buyerApiKey) {
      fetchWalletBalance();
    }
  }, [user?.buyerApiKey]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setBuyerApiKey(data.user.buyerApiKey || '');
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

  const fetchWalletBalance = async () => {
    if (!user?.buyerApiKey) return;
    
    setLoadingBalance(true);
    try {
      const response = await fetch('/api/wallet/balance');
      if (response.ok) {
        const data = await response.json();
        setWalletBalance(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch balance:', errorData.error);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/auth/update-buyer-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerApiKey: buyerApiKey.trim() || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update buyer API key');
        return;
      }

      setUser(data.user);
      setSuccess('Buyer API key updated successfully!');
      
      // Refresh wallet balance if API key was added/updated
      if (data.user.buyerApiKey) {
        await fetchWalletBalance();
      } else {
        setWalletBalance(null);
      }
    } catch (error) {
      setError('Failed to update buyer API key. Please try again.');
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

              {/* Wallet Balance */}
              {user?.buyerApiKey && (
                <div className="p-4 rounded-lg border bg-muted/50">
                  <Label className="text-sm font-medium mb-2 block">Wallet Balance</Label>
                  {loadingBalance ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : walletBalance ? (
                    <div className="space-y-2">
                      <p className="text-2xl font-bold">{walletBalance.balanceFormatted}</p>
                      <p className="text-xs text-muted-foreground">
                        Status: {walletBalance.budgetStatus}
                      </p>
                      {walletBalance.contacts.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium mb-1">Whitelisted Contacts:</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {walletBalance.contacts.map((contact) => (
                              <li key={contact.number}>
                                {contact.number}. {contact.email}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={fetchWalletBalance}
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
                  <Label htmlFor="buyer-api-key">Buyer API Key</Label>
                  <Input
                    id="buyer-api-key"
                    type="text"
                    value={buyerApiKey}
                    onChange={(e) => setBuyerApiKey(e.target.value)}
                    placeholder="locus_dev_... or locus_..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Locus buyer API key for making payments. This key is stored securely and used automatically when you make investments.
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

