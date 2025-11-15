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
  sellerApiKey?: string; // Seller's Locus API key for receiving payments
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
  // Notify listeners
  listingUpdateListeners.forEach(listener => listener(listing));
  return listing;
}

export function updateListing(id: string, updates: Partial<Listing>): Listing | null {
  const index = listings.findIndex(l => l.id === id);
  if (index === -1) {
    return null;
  }
  const updated = { ...listings[index], ...updates };
  listings[index] = updated;
  // Notify listeners
  listingUpdateListeners.forEach(listener => listener(updated));
  return updated;
}

export function addFunding(id: string, amount: number): Listing | null {
  const listing = getListingById(id);
  if (!listing) {
    return null;
  }
  const updated = updateListing(id, {
    amountRaised: listing.amountRaised + amount,
    backers: listing.backers + 1,
  });
  
  if (updated) {
    // Notify listeners
    listingUpdateListeners.forEach(listener => listener(updated));
  }
  
  return updated;
}

// Comments store
const commentsStore: Record<string, Comment[]> = {}; // projectId -> comments

export interface Comment {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  timestamp: number;
}

export function getComments(projectId: string): Comment[] {
  return commentsStore[projectId] || [];
}

export function addComment(projectId: string, comment: Comment): Comment {
  if (!commentsStore[projectId]) {
    commentsStore[projectId] = [];
  }
  commentsStore[projectId].push(comment);
  
  // Notify listeners
  commentListeners.forEach(listener => listener(projectId, comment));
  
  return comment;
}

// Pub-sub for real-time updates
type UpdateListener = (listing: Listing) => void;
type CommentListener = (projectId: string, comment: Comment) => void;

const listingUpdateListeners = new Set<UpdateListener>();
const commentListeners = new Set<CommentListener>();

export function subscribeToListingUpdates(listener: UpdateListener): () => void {
  listingUpdateListeners.add(listener);
  return () => {
    listingUpdateListeners.delete(listener);
  };
}

export function unsubscribeFromListingUpdates(listener: UpdateListener): void {
  listingUpdateListeners.delete(listener);
}

export function subscribeToCommentUpdates(listener: CommentListener): () => void {
  commentListeners.add(listener);
  return () => {
    commentListeners.delete(listener);
  };
}

export function unsubscribeFromCommentUpdates(listener: CommentListener): void {
  commentListeners.delete(listener);
}

