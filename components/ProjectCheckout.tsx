'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ProjectListing, ProjectTier } from './ProjectListing';
import { Wallet, Loader2, CheckCircle2 } from 'lucide-react';

interface ProjectCheckoutProps {
  project: ProjectListing;
  tier: ProjectTier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (projectId: string, tierId: string, amount: number) => void;
}

export default function ProjectCheckout({
  project,
  tier,
  open,
  onOpenChange,
  onComplete,
}: ProjectCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [customAmount, setCustomAmount] = useState(tier.amount.toString());

  const handleCheckout = async () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount < tier.amount) {
      alert(`Minimum amount is $${tier.amount}`);
      return;
    }

    setLoading(true);

    try {
      // Get Locus API keys
      const buyerApiKey = localStorage.getItem('locus_buyer_api_key');
      if (!buyerApiKey) {
        alert('Please connect your wallet with Locus API key first');
        setLoading(false);
        return;
      }

      // Get seller wallet from project (in production, this would be from project data)
      const sellerWallet = project.companyProfile.name; // Mock for now

      // Call checkout API
      const response = await fetch('/api/listings/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          tierId: tier.id,
          amount,
          buyerApiKey,
          sellerApiKey: process.env.NEXT_PUBLIC_LOCUS_SELLER_API_KEY, // In production, get from project
        }),
      });

      if (!response.ok) {
        throw new Error('Checkout failed');
      }

      const data = await response.json();
      setSuccess(true);
      
      if (onComplete) {
        onComplete(project.id, tier.id, amount);
      }

      // Close after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setCustomAmount(tier.amount.toString());
      }, 2000);
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Back {project.name}</SheetTitle>
          <SheetDescription>
            Complete your backing with a secure payment
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {success ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-semibold">Thank you for backing!</h3>
              <p className="text-muted-foreground">
                Your payment of ${parseFloat(customAmount).toFixed(2)} has been processed.
              </p>
            </div>
          ) : (
            <>
              {/* Tier Summary */}
              <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
                <h4 className="font-semibold">{tier.name}</h4>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
                <Separator />
                <div className="space-y-1">
                  {tier.rewards.map((reward, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>{reward}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Backing Amount (USDC)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="amount"
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="pl-8"
                    min={tier.amount}
                    step="0.01"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum: ${tier.amount}
                </p>
              </div>

              {/* Payment Summary */}
              <div className="space-y-2 p-4 rounded-lg border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Backing Amount</span>
                  <span className="font-semibold">${parseFloat(customAmount || '0').toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${parseFloat(customAmount || '0').toFixed(2)} USDC</span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                disabled={loading || parseFloat(customAmount || '0') < tier.amount}
                className="w-full gap-2"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4" />
                    Complete Payment
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Payment will be processed securely using Locus
              </p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

