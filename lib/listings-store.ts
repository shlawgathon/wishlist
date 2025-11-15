/**
 * Shared listings store
 * In production, this would be a database
 */

export interface Listing {
  id: string;
  name: string;
  description: string;
  fullDescription: string;
  companyProfile: {
    name: string;
    logo?: string;
    bio: string;
    website?: string;
  };
  fundingGoal: number;
  amountRaised: number;
  backers: number;
  daysLeft: number;
  tiers: Array<{
    id: string;
    name: string;
    description: string;
    amount: number;
    rewards: string[];
    estimatedDelivery?: string;
  }>;
  category: string;
  sellerWallet: string;
  sellerWalletId: string;
  createdAt: number;
}

// In-memory store
const listings: Listing[] = [];

export function getAllListings(): Listing[] {
  return listings;
}

export function getListingById(id: string): Listing | undefined {
  return listings.find(l => l.id === id);
}

export function createListing(listing: Listing): Listing {
  listings.push(listing);
  return listing;
}

export function updateListing(id: string, updates: Partial<Listing>): Listing | null {
  const index = listings.findIndex(l => l.id === id);
  if (index === -1) {
    return null;
  }
  listings[index] = { ...listings[index], ...updates };
  return listings[index];
}

export function addFunding(id: string, amount: number): Listing | null {
  const listing = getListingById(id);
  if (!listing) {
    return null;
  }
  return updateListing(id, {
    amountRaised: listing.amountRaised + amount,
    backers: listing.backers + 1,
  });
}

