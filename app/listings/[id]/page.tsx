'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ProjectListing from '@/components/ProjectListing';
import { ProjectListing as ProjectListingType } from '@/types/project';
import { useListingUpdates } from '@/hooks/useListingUpdates';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { mockListings } from '@/lib/mock-listings';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.id as string;
  
  const { listing: liveListing, connected } = useListingUpdates(listingId);
  const [listing, setListing] = useState<ProjectListingType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListing = async () => {
      // First try live updates
      if (liveListing) {
        setListing(liveListing);
        setLoading(false);
        return;
      }

      // Try API
      try {
        const response = await fetch('/api/listings/create');
        if (response.ok) {
          const data = await response.json();
          const found = data.listings?.find((l: any) => l.id === listingId);
          if (found) {
            setListing({
              id: found.id,
              name: found.name,
              description: found.description,
              fullDescription: found.fullDescription,
              companyProfile: found.companyProfile,
              fundingGoal: found.fundingGoal,
              amountRaised: found.amountRaised,
              backers: found.backers,
              daysLeft: found.daysLeft,
              category: found.category,
              tiers: found.tiers,
            });
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching listing:', error);
      }

      // Fallback to mock listings
      const mockListing = mockListings.find(m => m.id === listingId);
      if (mockListing) {
        setListing({
          id: mockListing.id,
          name: mockListing.name,
          description: mockListing.description,
          fullDescription: mockListing.fullDescription || mockListing.description,
          companyProfile: mockListing.companyProfile,
          fundingGoal: mockListing.fundingGoal,
          amountRaised: mockListing.amountRaised,
          backers: mockListing.backers,
          daysLeft: mockListing.daysLeft,
          category: mockListing.category,
          tiers: mockListing.tiers || [],
        });
      } else {
        setListing(null);
      }
      setLoading(false);
    };

    fetchListing();
  }, [listingId, liveListing]);

  // Sync wallet balance every 3 seconds
  useEffect(() => {
    if (!listing?.id) return;

    const syncBalance = async () => {
      try {
        const response = await fetch(`/api/listings/${listing.id}/sync-balance`, {
          method: 'POST',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.updated && data.newAmount !== undefined) {
            // Update local state if balance changed
            setListing((prev) => prev ? {
              ...prev,
              amountRaised: data.newAmount,
            } : null);
          }
        }
      } catch (error) {
        // Silently fail - don't spam console
        console.debug('Balance sync error:', error);
      }
    };

    // Initial sync
    syncBalance();

    // Poll every 3 seconds
    const interval = setInterval(syncBalance, 3000);

    return () => clearInterval(interval);
  }, [listing?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading listing...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Listing not found</p>
            <Button onClick={() => router.push('/listings')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Listings
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => router.push('/listings')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Listings
        </Button>
        <ProjectListing project={listing} showFullDetails={true} />
      </main>
    </div>
  );
}

