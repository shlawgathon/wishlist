'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, CheckCircle2, X, Trash2 } from 'lucide-react';
import type { ProjectTier } from '@/types/project';

export default function CreatorDashboard() {
    const router = useRouter();
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
  const [createdProject, setCreatedProject] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);

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
      let response;
      
      if (editingListingId) {
        // Update existing listing
        response = await fetch(`/api/listings/${editingListingId}/update`, {
          method: 'PUT',
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
      } else {
        // Create new listing
        response = await fetch('/api/listings/create', {
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
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: Failed to ${editingListingId ? 'update' : 'create'} listing`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (editingListingId) {
        setCreatedProject({ ...data.listing, updated: true });
      } else {
        setCreatedProject(data.project);
      }
      
      // Reload listings
      await loadListings();
      
      // Reset form and clear edit state
      handleCancel();
    } catch (error) {
      console.error(`Error ${editingListingId ? 'updating' : 'creating'} listing:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to ${editingListingId ? 'update' : 'create'} listing`;
      alert(`Failed to ${editingListingId ? 'update' : 'create'} listing:\n\n${errorMessage}\n\nCheck the browser console and server logs for details.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingListingId(null);
    setCreatedProject(null);
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
  };

  const handleDelete = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/listings/${listingId}/delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete listing');
      }

      // Reload listings
      await loadListings();
      
      // Clear edit state if we were editing this listing
      if (editingListingId === listingId) {
        handleCancel();
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert(`Failed to delete listing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    // Check auth status
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    };
    checkAuth();
  }, []);

  const loadListings = async () => {
    try {
      // Only load listings if user is authenticated
      if (!currentUser) {
        setListings([]);
        return;
      }
      
      const response = await fetch('/api/listings/my-listings');
      if (response.ok) {
        const data = await response.json();
        setListings(data.listings || []);
      }
    } catch (error) {
      console.error('Error loading listings:', error);
    }
  };

  useEffect(() => {
    loadListings();
  }, [currentUser]);


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Creator Dashboard</h1>
          <p className="text-muted-foreground">Create and manage your fundraising projects</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card id="create-form">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {editingListingId ? 'Edit Project Listing' : 'Create New Project Listing'}
              </CardTitle>
              <CardDescription>
                {editingListingId ? 'Update your fundraising campaign' : 'Launch your fundraising campaign'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[calc(100vh-16rem)] overflow-hidden">
                <ScrollArea className="h-full w-full">
                  <div className="pr-4">
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
                        rows={6}
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
                    <h3 className="font-semibold text-base">Company Profile</h3>
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
                      <h3 className="font-semibold text-base">Funding Tiers</h3>
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

                  <div className="flex gap-2">
                    {editingListingId && (
                      <Button 
                        type="button" 
                        onClick={handleCancel} 
                        variant="outline" 
                        disabled={loading}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button type="submit" disabled={loading} className={editingListingId ? "flex-1" : "w-full"}>
                      {loading 
                        ? (editingListingId ? 'Updating...' : 'Creating...') 
                        : (editingListingId ? 'Update Listing' : 'Create Listing')
                      }
                    </Button>
                  </div>
                </form>

                {createdProject && (
                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-green-800 dark:text-green-200">
                        {createdProject.updated ? 'Listing Updated!' : 'Listing Created!'}
                      </h3>
                    </div>
                    {!createdProject.updated && (
                      <>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Wallet: {createdProject.sellerWallet?.substring(0, 20)}...
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Listing ID: {createdProject.id}
                        </p>
                      </>
                    )}
                  </div>
                )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Listings</CardTitle>
              <CardDescription>
                Track funding progress for your listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[calc(100vh-16rem)]">
                {listings.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No listings yet. Create one to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-4 pr-4">
                    {listings.map((listing) => {
                      const progress = (listing.amountRaised / listing.fundingGoal) * 100;
                      return (
                        <div 
                          key={listing.id} 
                          className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={(e) => {
                            // Don't navigate if clicking on buttons
                            if ((e.target as HTMLElement).closest('button')) {
                              return;
                            }
                            router.push(`/listings/${listing.id}`);
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold hover:text-primary">{listing.name}</h3>
                              <Badge variant="secondary" className="mt-1">{listing.category}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {progress >= 100 && (
                                <Badge variant="default" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Funded
                                </Badge>
                              )}
                              {listing.creatorUsername === currentUser?.username && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // Set editing state
                                      setEditingListingId(listing.id);
                                      // Load listing data into form for editing
                                      setFormData({
                                        name: listing.name,
                                        description: listing.description,
                                        fullDescription: listing.fullDescription,
                                        companyName: listing.companyProfile?.name || '',
                                        companyBio: listing.companyProfile?.bio || '',
                                        companyWebsite: listing.companyProfile?.website || '',
                                        fundingGoal: listing.fundingGoal.toString(),
                                        daysLeft: listing.daysLeft.toString(),
                                        category: listing.category,
                                        sellerApiKey: listing.sellerApiKey || '',
                                        sellerEmail: listing.sellerEmail || '',
                                        sellerWalletAddress: listing.sellerWalletAddress || '',
                                      });
                                      setTiers(listing.tiers.map(t => ({
                                        name: t.name,
                                        description: t.description,
                                        amount: t.amount,
                                        rewards: t.rewards,
                                        estimatedDelivery: t.estimatedDelivery,
                                      })));
                                      // Scroll to form
                                      document.getElementById('create-form')?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(listing.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {listing.description}
                          </p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-semibold">
                                ${listing.amountRaised.toLocaleString()} / ${listing.fundingGoal.toLocaleString()}
                              </span>
                            </div>
                            <Progress value={Math.min(progress, 100)} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{listing.backers} backers</span>
                              <span>{listing.daysLeft} days left</span>
                            </div>
                          </div>
                          {progress >= 100 && (
                            <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-900">
                              <p className="text-xs text-green-700 dark:text-green-300">
                                ✓ Funds are automatically in your wallet: {listing.sellerWalletAddress?.substring(0, 10)}...
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
