'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProjectListing, ProjectTier } from '@/types/project';
import { Plus, X } from 'lucide-react';

interface CreateListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (project: ProjectListing) => void;
}

export default function CreateListingDialog({ open, onOpenChange, onCreate }: CreateListingDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    fullDescription: '',
    companyName: '',
    companyBio: '',
    companyWebsite: '',
    fundingGoal: '',
    daysLeft: '',
    category: '',
    sellerApiKey: '', // Optional: Agent API key
    sellerEmail: '', // Optional: Email for escrow payments
    sellerWalletAddress: '', // Optional: Wallet address for direct transfers
  });
  const [tiers, setTiers] = useState<Omit<ProjectTier, 'id'>[]>([
    { name: '', description: '', amount: 0, rewards: [''] },
  ]);
  const [loading, setLoading] = useState(false);

  const addTier = () => {
    setTiers([...tiers, { name: '', description: '', amount: 0, rewards: [''] }]);
  };

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof ProjectTier, value: any) => {
    const updated = [...tiers];
    if (field === 'rewards') {
      updated[index] = { ...updated[index], rewards: value };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setTiers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create project with seller wallet
      const response = await fetch('/api/listings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fundingGoal: parseFloat(formData.fundingGoal),
          daysLeft: parseInt(formData.daysLeft),
          tiers: tiers.map((tier, idx) => ({
            ...tier,
            id: `tier-${idx + 1}`,
            amount: parseFloat(tier.amount.toString()),
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || 'Failed to create listing';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      onCreate(data.project);
      
      // Reset form
            setFormData({
              name: '',
              description: '',
              fullDescription: '',
              companyName: '',
              companyBio: '',
              companyWebsite: '',
              fundingGoal: '',
              daysLeft: '',
              category: '',
              sellerApiKey: '',
              sellerEmail: '',
              sellerWalletAddress: '',
            });
      setTiers([{ name: '', description: '', amount: 0, rewards: [''] }]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating listing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create listing';
      alert(`Failed to create listing: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project Listing</DialogTitle>
          <DialogDescription>
            Launch your fundraising campaign
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Short Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullDescription">Full Description *</Label>
              <Textarea
                id="fullDescription"
                value={formData.fullDescription}
                onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                rows={8}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fundingGoal">Funding Goal (USDC) *</Label>
                <Input
                  id="fundingGoal"
                  type="number"
                  value={formData.fundingGoal}
                  onChange={(e) => setFormData({ ...formData, fundingGoal: e.target.value })}
                  min="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="daysLeft">Days Left *</Label>
                <Input
                  id="daysLeft"
                  type="number"
                  value={formData.daysLeft}
                  onChange={(e) => setFormData({ ...formData, daysLeft: e.target.value })}
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />
            </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Payment Methods (at least one required)</h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        Choose how you want to receive payments. You can enable multiple methods.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sellerEmail">Email Address (Escrow Payments)</Label>
                      <Input
                        id="sellerEmail"
                        type="email"
                        value={formData.sellerEmail}
                        onChange={(e) => setFormData({ ...formData, sellerEmail: e.target.value })}
                        placeholder="seller@example.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enables escrow payments via email. Recipient will receive payment instructions.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sellerWalletAddress">Wallet Address (Direct Transfers)</Label>
                      <Input
                        id="sellerWalletAddress"
                        type="text"
                        value={formData.sellerWalletAddress}
                        onChange={(e) => setFormData({ ...formData, sellerWalletAddress: e.target.value })}
                        placeholder="0x..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Enables direct transfers to any wallet address.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sellerApiKey">Locus Seller API Key (Agent Payments)</Label>
                      <Input
                        id="sellerApiKey"
                        type="password"
                        value={formData.sellerApiKey}
                        onChange={(e) => setFormData({ ...formData, sellerApiKey: e.target.value })}
                        placeholder="locus_dev_..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Enables agent-to-agent payments. Must be manually created on the Locus platform.
                      </p>
                    </div>
                  </div>
          </div>

          {/* Company Profile */}
          <div className="space-y-4">
            <h3 className="font-semibold">Company Profile</h3>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyBio">Company Bio *</Label>
              <Textarea
                id="companyBio"
                value={formData.companyBio}
                onChange={(e) => setFormData({ ...formData, companyBio: e.target.value })}
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyWebsite">Website (optional)</Label>
              <Input
                id="companyWebsite"
                type="url"
                value={formData.companyWebsite}
                onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
              />
            </div>
          </div>

          {/* Funding Tiers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Funding Tiers</h3>
              <Button type="button" onClick={addTier} size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Tier
              </Button>
            </div>

            {tiers.map((tier, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Tier {index + 1}</h4>
                  {tiers.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeTier(index)}
                      size="sm"
                      variant="ghost"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tier Name *</Label>
                    <Input
                      value={tier.name}
                      onChange={(e) => updateTier(index, 'name', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Amount (USDC) *</Label>
                    <Input
                      type="number"
                      value={tier.amount}
                      onChange={(e) => updateTier(index, 'amount', parseFloat(e.target.value) || 0)}
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={tier.description}
                    onChange={(e) => updateTier(index, 'description', e.target.value)}
                    rows={2}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rewards (one per line) *</Label>
                  <Textarea
                    value={tier.rewards.join('\n')}
                    onChange={(e) => updateTier(index, 'rewards', e.target.value.split('\n').filter(r => r.trim()))}
                    rows={3}
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Listing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

