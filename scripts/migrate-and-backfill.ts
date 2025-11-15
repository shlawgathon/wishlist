/**
 * Script to migrate mock listings and backfill embeddings
 * Run with: npx tsx scripts/migrate-and-backfill.ts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { MongoClient } from 'mongodb';
import { mockListings } from '../lib/mock-listings';
import { embedListing } from '../lib/embeddings';
import type { Listing } from '../lib/listings-store';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
if (!VOYAGE_API_KEY) {
  throw new Error('VOYAGE_API_KEY environment variable is not set');
}

const SELLER_API_KEY = process.env.LOCUS_SELLER_API_KEY;
if (!SELLER_API_KEY) {
  throw new Error('LOCUS_SELLER_API_KEY environment variable is not set');
}

// Generate a consistent wallet address from seller API key
function generateWalletAddress(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `0x${hex.repeat(5).substring(0, 40)}`;
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('database');
    const listingsCollection = db.collection<Listing>('listings');
    
    // Step 1: Migrate mock listings
    console.log('\n=== Step 1: Migrating Mock Listings ===');
    const existingListings = await listingsCollection.find({}).toArray();
    const existingIds = new Set(existingListings.map(l => l.id));
    
    const sellerWalletAddress = generateWalletAddress(SELLER_API_KEY);
    console.log(`Using seller wallet address: ${sellerWalletAddress}`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const mockListing of mockListings) {
      if (existingIds.has(mockListing.id)) {
        console.log(`Skipping ${mockListing.id} (already exists)`);
        skipped++;
        continue;
      }
      
      try {
        const listing: Listing = {
          ...mockListing,
          sellerWallet: sellerWalletAddress,
          sellerWalletId: `wallet_${mockListing.id}`,
          sellerApiKey: SELLER_API_KEY,
          sellerWalletAddress: sellerWalletAddress,
          createdAt: Date.now(),
        };
        
        // Generate embedding
        console.log(`Generating embedding for ${mockListing.name}...`);
        const embedding = await embedListing(listing);
        listing.embedding = embedding;
        
        // Insert into MongoDB
        await listingsCollection.insertOne(listing);
        console.log(`✓ Migrated: ${mockListing.name}`);
        migrated++;
      } catch (error) {
        console.error(`✗ Failed to migrate ${mockListing.id}:`, error);
      }
    }
    
    console.log(`\nMigration complete: ${migrated} created, ${skipped} skipped`);
    
    // Step 2: Backfill embeddings for existing listings without embeddings
    console.log('\n=== Step 2: Backfilling Embeddings ===');
    const allListings = await listingsCollection.find({}).toArray();
    const listingsWithoutEmbeddings = allListings.filter(
      (listing) => !listing.embedding || listing.embedding.length === 0
    );
    
    console.log(`Found ${listingsWithoutEmbeddings.length} listings without embeddings`);
    
    let backfilled = 0;
    let failed = 0;
    
    for (const listing of listingsWithoutEmbeddings) {
      try {
        console.log(`Generating embedding for ${listing.name}...`);
        const embedding = await embedListing(listing);
        await listingsCollection.updateOne(
          { id: listing.id },
          { $set: { embedding } }
        );
        console.log(`✓ Backfilled: ${listing.name}`);
        backfilled++;
        
        // Rate limit: 3 RPM, so wait 20 seconds between requests
        if (listingsWithoutEmbeddings.length > 1) {
          console.log('Waiting 20 seconds to respect rate limits...');
          await new Promise(resolve => setTimeout(resolve, 20000));
        }
      } catch (error: any) {
        if (error?.statusCode === 429) {
          console.log('Rate limited. Waiting 60 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          // Retry once
          try {
            console.log(`Retrying embedding for ${listing.name}...`);
            const embedding = await embedListing(listing);
            await listingsCollection.updateOne(
              { id: listing.id },
              { $set: { embedding } }
            );
            console.log(`✓ Backfilled (retry): ${listing.name}`);
            backfilled++;
          } catch (retryError) {
            console.error(`✗ Failed to backfill ${listing.id} (after retry):`, retryError);
            failed++;
          }
        } else {
          console.error(`✗ Failed to backfill ${listing.id}:`, error);
          failed++;
        }
      }
    }
    
    console.log(`\nBackfill complete: ${backfilled} backfilled, ${failed} failed`);
    
    // Summary
    const finalListings = await listingsCollection.find({}).toArray();
    const withEmbeddings = finalListings.filter(
      (l) => l.embedding && l.embedding.length > 0
    );
    
    console.log('\n=== Summary ===');
    console.log(`Total listings: ${finalListings.length}`);
    console.log(`With embeddings: ${withEmbeddings.length}`);
    console.log(`Without embeddings: ${finalListings.length - withEmbeddings.length}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

main();

