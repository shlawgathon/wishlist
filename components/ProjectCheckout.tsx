'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ProjectListing, ProjectTier } from '@/types/project';
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
  // Auto-select best available payment method (prioritize wallet > agent > x402)
  // Note: sellerEmail is for contacting the creator, NOT for payments
  const getBestPaymentMethod = (): 'agent' | 'wallet' | 'x402' => {
    if (project.sellerWalletAddress) return 'wallet';
    if (project.sellerApiKey) return 'agent';
    return 'x402';
  };
  const [paymentMethod, setPaymentMethod] = useState<'agent' | 'wallet' | 'x402' | null>(getBestPaymentMethod());

  const handleCheckout = async () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount < tier.amount) {
      alert(`Minimum amount is $${tier.amount}`);
      return;
    }

    setLoading(true);

    try {
      // Buyer API key is now stored in user session and retrieved automatically by the backend
      // No need to pass it from the frontend

      // Quick checkout: Auto-select best available method if none selected
      // Priority: wallet > agent > x402
      // Note: sellerEmail is for contacting the creator, NOT for payments
      let finalPaymentMethod = paymentMethod;
      let recipient = '';

      if (!finalPaymentMethod) {
        // Auto-select best available method
        if (project.sellerWalletAddress) {
          finalPaymentMethod = 'wallet';
          recipient = project.sellerWalletAddress;
        } else if (project.sellerApiKey) {
          finalPaymentMethod = 'agent';
          recipient = project.sellerApiKey;
        } else {
          finalPaymentMethod = 'x402';
          recipient = `${window.location.origin}/api/listings/${project.id}`;
        }
      } else {
        // Use selected method
        if (finalPaymentMethod === 'wallet' && project.sellerWalletAddress) {
          recipient = project.sellerWalletAddress;
        } else if (finalPaymentMethod === 'agent' && project.sellerApiKey) {
          recipient = project.sellerApiKey;
        } else if (finalPaymentMethod === 'x402') {
          recipient = `${window.location.origin}/api/listings/${project.id}`;
        }
      }

      if (!recipient) {
        alert(`Selected payment method (${finalPaymentMethod}) is not available for this listing.`);
        setLoading(false);
        return;
      }

      // Call checkout API with payment method
      const response = await fetch('/api/listings/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          tierId: tier.id,
          amount,
          paymentMethod: finalPaymentMethod,
          recipient,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Checkout failed' }));
        const errorMessage = errorData.error || errorData.details || 'Checkout failed';
        throw new Error(errorMessage);
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
      const errorMessage = error instanceof Error ? error.message : 'Checkout failed. Please try again.';
      alert(`Checkout failed: ${errorMessage}\n\nCheck the browser console and server logs for details.`);
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

              {/* Payment Method Selection - Only show if multiple options available */}
              {(project.sellerWalletAddress && project.sellerApiKey) ? (
                <div className="space-y-2">
                  <Label>Payment Method (Optional)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {project.sellerWalletAddress && (
                      <Button
                        type="button"
                        variant={paymentMethod === 'wallet' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod(paymentMethod === 'wallet' ? null : 'wallet')}
                      >
                        Wallet
                      </Button>
                    )}
                    {project.sellerApiKey && (
                      <Button
                        type="button"
                        variant={paymentMethod === 'agent' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod(paymentMethod === 'agent' ? null : 'agent')}
                      >
                        Agent
                      </Button>
                    )}
                    {/* Only show x402 if no other options */}
                    {!project.sellerWalletAddress && !project.sellerApiKey && (
                      <Button
                        type="button"
                        variant={paymentMethod === 'x402' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod(paymentMethod === 'x402' ? null : 'x402')}
                      >
                        x402 API
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {paymentMethod === 'wallet' && 'Direct transfer to wallet address'}
                    {paymentMethod === 'agent' && 'Agent-to-agent payment (requires API key)'}
                    {paymentMethod === 'x402' && 'x402 API payment'}
                    {!paymentMethod && 'Quick checkout will use: ' + (project.sellerWalletAddress ? 'Wallet' : project.sellerApiKey ? 'Agent' : 'x402')}
                  </p>
                  {project.sellerEmail && (
                    <p className="text-xs text-muted-foreground mt-1">
                      💬 Contact creator: {project.sellerEmail}
                    </p>
                  )}
                </div>
              ) : (
                /* Show selected method info when only one option */
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-sm font-medium">
                      {paymentMethod === 'wallet' && 'Direct transfer to wallet address'}
                      {paymentMethod === 'agent' && 'Agent-to-agent payment'}
                      {paymentMethod === 'x402' && 'x402 API payment'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {paymentMethod === 'wallet' && project.sellerWalletAddress}
                      {paymentMethod === 'agent' && 'Using seller agent API key'}
                      {paymentMethod === 'x402' && 'Using x402 protocol'}
                    </p>
                    {project.sellerEmail && (
                      <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                        💬 Contact creator: {project.sellerEmail}
                      </p>
                    )}
                  </div>
                </div>
              )}

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

