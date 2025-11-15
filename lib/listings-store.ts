/**
 * MongoDB listings store
 * Replaces in-memory store with MongoDB Atlas
 */

import clientPromise from './mongodb';
import type { ObjectId } from 'mongodb';

const DB_NAME = 'database'; // Using 'database' to match your Atlas structure
const COLLECTIONS = {
  listings: 'listings',
  comments: 'comments',
};

export interface Listing {
  _id?: ObjectId;
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
  sellerWallet: string; // Legacy: CDP wallet address
  sellerWalletId: string; // Legacy: CDP wallet ID
  sellerApiKey?: string; // Optional: Seller agent's API key
  sellerEmail?: string; // Optional: Seller email for escrow payments
  sellerWalletAddress?: string; // Optional: Seller wallet address for direct transfers
  embedding?: number[]; // For Voyager vector search
  creatorUsername?: string; // Username of the creator
  createdAt: number;
}

export interface Comment {
  _id?: ObjectId;
  id: string;
  listingId: string;
  author: string;
  avatar?: string;
  content: string;
  timestamp: number;
}

// Database operations
export async function getAllListings(): Promise<Listing[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<Listing>(COLLECTIONS.listings);
    
    // Sort by createdAt descending (newest first)
    return collection.find({}).sort({ createdAt: -1 }).toArray();
  } catch (error) {
    console.error('Error fetching all listings:', error);
    return [];
  }
}

// Get listings by creator username
export async function getListingsByCreator(username: string): Promise<Listing[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<Listing>(COLLECTIONS.listings);
    
    // Sort by createdAt descending (newest first)
    return collection.find({ creatorUsername: username }).sort({ createdAt: -1 }).toArray();
  } catch (error) {
    console.error('Error fetching listings by creator:', error);
    return [];
  }
}

export async function getListingById(id: string): Promise<Listing | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<Listing>(COLLECTIONS.listings);
    
    return collection.findOne({ id }) || null;
  } catch (error) {
    console.error('Error fetching listing by id:', error);
    return null;
  }
}

export async function createListing(listing: Listing): Promise<Listing> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<Listing>(COLLECTIONS.listings);
    
    const result = await collection.insertOne(listing);
    console.log('Listing created successfully:', result.insertedId);
    return listing;
  } catch (error) {
    console.error('Error creating listing in MongoDB:', error);
    console.error('Listing data:', JSON.stringify(listing, null, 2));
    throw new Error(`MongoDB error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateListing(
  id: string,
  updates: Partial<Listing>
): Promise<Listing | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<Listing>(COLLECTIONS.listings);
    
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );
    
    return result || null;
  } catch (error) {
    console.error('Error updating listing:', error);
    return null;
  }
}

export async function addFunding(
  id: string,
  amount: number
): Promise<Listing | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<Listing>(COLLECTIONS.listings);
    
    const result = await collection.findOneAndUpdate(
      { id },
      {
        $inc: {
          amountRaised: amount,
          backers: 1,
        },
      },
      { returnDocument: 'after' }
    );
    
    return result || null;
  } catch (error) {
    console.error('Error adding funding:', error);
    return null;
  }
}

// Comments operations
export async function getComments(listingId: string): Promise<Comment[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<Comment>(COLLECTIONS.comments);
    
    return collection
      .find({ listingId })
      .sort({ timestamp: -1 })
      .toArray();
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

export async function addComment(comment: Comment): Promise<Comment> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<Comment>(COLLECTIONS.comments);
    
    await collection.insertOne(comment);
    return comment;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}
