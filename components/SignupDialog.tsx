'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Info } from 'lucide-react';

interface SignupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (user: { username: string; buyerApiKey: string }) => void;
  switchToLogin: () => void;
}

export default function SignupDialog({ open, onOpenChange, onSuccess, switchToLogin }: SignupDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [buyerApiKey, setBuyerApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
          buyerApiKey: buyerApiKey.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Signup failed');
        return;
      }

      // Show success message with note about listing wallets
      setShowSuccess(true);
      
      // Wait a moment to show the success message, then proceed
      setTimeout(() => {
        onSuccess(data.user);
        onOpenChange(false);
        setUsername('');
        setPassword('');
        setBuyerApiKey('');
        setShowSuccess(false);
      }, 3000);
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
            <Label htmlFor="buyer-api-key">Locus Wallet Agent API Key *</Label>
            <Input
              id="buyer-api-key"
              type="password"
              value={buyerApiKey}
              onChange={(e) => setBuyerApiKey(e.target.value)}
              placeholder="locus_dev_... or locus_..."
              required
            />
            <p className="text-xs text-muted-foreground">
              Your Locus Wallet Agent API key is required for account creation. When creating an agent in your wallet, make sure to select "Create API Key" so it can buy stuff.
            </p>
          </div>
          {error && (
            <div className="text-sm text-red-500">{error}</div>
          )}
          {showSuccess && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm">
                <div className="space-y-2">
                  <p className="font-semibold text-green-800 dark:text-green-200">
                    Account created successfully!
                  </p>
                  <Alert className="mt-2 border-blue-500 bg-blue-50 dark:bg-blue-950">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Important:</strong> Each listing you create needs its own wallet address. 
                      When creating a listing, you'll need to provide a seller wallet address or seller API key 
                      to receive payments. Make sure to set up a separate wallet for each project.
                    </AlertDescription>
                  </Alert>
                </div>
              </AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={loading || showSuccess}>
              {loading ? 'Creating account...' : showSuccess ? 'Account Created!' : 'Sign Up'}
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

