'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Key } from 'lucide-react';

interface WalletConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (locusApiKey: string) => void;
}

export default function WalletConnectDialog({ open, onOpenChange, onConnect }: WalletConnectDialogProps) {
  const [locusApiKey, setLocusApiKey] = useState('');
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (!locusApiKey.trim()) {
      setError('Please enter your Locus Buyer API Key');
      return;
    }

    if (!locusApiKey.startsWith('locus_dev_') && !locusApiKey.startsWith('locus_')) {
      setError('Invalid Locus API Key format. Should start with "locus_dev_" or "locus_"');
      return;
    }

    setError('');
    
    // Store buyer agent's API key in localStorage
    // API key must be manually created on Locus platform
    localStorage.setItem('locus_buyer_api_key', locusApiKey);
    
    onConnect(locusApiKey);
    onOpenChange(false);
    setLocusApiKey('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Key className="h-5 w-5" />
            Connect Wallet with Locus
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter your Locus Buyer Agent API Key. API keys must be manually created on the Locus platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="rounded-xl border-border/50">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Your Locus Buyer Agent API Key enables agent-to-agent payments on Base Mainnet using USDC.
              API keys must be manually created on the Locus platform. This key is stored locally in your browser.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="locus-key" className="text-sm font-medium">
              Locus Buyer API Key *
            </Label>
            <Input
              id="locus-key"
              type="password"
              value={locusApiKey}
              onChange={(e) => {
                setLocusApiKey(e.target.value);
                setError('');
              }}
              placeholder="locus_dev_..."
              className={`rounded-lg ${error ? 'border-destructive' : ''}`}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Your API key is stored locally and never sent to our servers.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">
            Cancel
          </Button>
          <Button onClick={handleConnect} className="rounded-lg">
            Connect Wallet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
