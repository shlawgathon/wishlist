'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SignupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (user: { username: string; buyerApiKey?: string }) => void;
  switchToLogin: () => void;
}

export default function SignupDialog({ open, onOpenChange, onSuccess, switchToLogin }: SignupDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [buyerApiKey, setBuyerApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password,
          buyerApiKey: buyerApiKey.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Signup failed');
        return;
      }

      onSuccess(data.user);
      onOpenChange(false);
      setUsername('');
      setPassword('');
      setBuyerApiKey('');
    } catch (error) {
      setError('Failed to create account. Please try again.');
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
          <DialogDescription>
            Create an account to start investing in projects
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-username">Username</Label>
            <Input
              id="signup-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username (min 3 characters)"
              required
              minLength={3}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password (min 6 characters)"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyer-api-key">Buyer API Key (Optional)</Label>
            <Input
              id="buyer-api-key"
              type="text"
              value={buyerApiKey}
              onChange={(e) => setBuyerApiKey(e.target.value)}
              placeholder="locus_dev_... or locus_... (can add later)"
            />
            <p className="text-xs text-muted-foreground">
              Your Locus buyer API key for making payments. You can add this later in settings.
            </p>
          </div>
          {error && (
            <div className="text-sm text-red-500">{error}</div>
          )}
          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={switchToLogin}
              className="text-sm"
            >
              Already have an account? Login
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

