import { NextRequest, NextResponse } from 'next/server';
import { createListing, getAllListings } from '@/lib/listings-store';
import { mockListings } from '@/lib/mock-listings';
import { embedListing } from '@/lib/embeddings';

/**
 * Migrate mock listings to MongoDB with proper wallet configuration
 * POST /api/listings/migrate-mocks
 */
export async function POST(request: NextRequest) {
  try {
    // Get seller wallet info from environment (using seller API key)
    const sellerApiKey = process.env.LOCUS_SELLER_API_KEY;
    const sellerWalletAddress = process.env.SELLER_WALLET_ADDRESS; // Optional: can be set separately
    
    if (!sellerApiKey) {
      return NextResponse.json(
        { error: 'LOCUS_SELLER_API_KEY not found in environment variables' },
        { status: 500 }
      );
    }

    // Generate a consistent wallet address from seller API key if not provided
    // This creates a deterministic address based on the API key
    const generateWalletAddress = (seed: string): string => {
      // Simple hash-like function to generate consistent address
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      // Convert to hex and pad to 40 chars (20 bytes = 40 hex chars)
      const hex = Math.abs(hash).toString(16).padStart(8, '0');
      return `0x${hex.repeat(5).substring(0, 40)}`;
    };

    const finalWalletAddress = sellerWalletAddress || generateWalletAddress(sellerApiKey);

    // Get existing listings to check for duplicates
    const existingListings = await getAllListings();
    const existingIds = new Set(existingListings.map(l => l.id));

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Migrate each mock listing
    for (const mockListing of mockListings) {
      // Skip if already exists
      if (existingIds.has(mockListing.id)) {
        results.skipped++;
        continue;
      }

      try {
        // Create listing with seller wallet info
        const listing = {
          ...mockListing,
          sellerWallet: finalWalletAddress, // Legacy CDP wallet address
          sellerWalletId: `wallet_${mockListing.id}`, // Legacy CDP wallet ID
          sellerApiKey: sellerApiKey, // Seller agent's API key
          sellerWalletAddress: finalWalletAddress, // Seller wallet address for direct transfers (prioritized in checkout)
          creatorUsername: 'system', // Mark as system-created (migrated listings)
          createdAt: Date.now(),
        };

        // Generate embedding for the listing
        try {
          if (process.env.VOYAGE_API_KEY) {
            const embedding = await embedListing(listing);
            listing.embedding = embedding;
          } else {
            console.warn('VOYAGE_API_KEY not set, skipping embedding generation');
          }
        } catch (error) {
          console.warn(`Failed to generate embedding for ${mockListing.id} (non-critical):`, error);
          // Continue without embedding - it can be added later
        }

        // Store in MongoDB
        await createListing(listing);
        results.created++;
      } catch (error) {
        results.errors.push(
          `Failed to migrate ${mockListing.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        console.error(`Error migrating ${mockListing.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migrated ${results.created} listings, ${results.skipped} already existed`,
      created: results.created,
      skipped: results.skipped,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error('Error migrating mock listings:', error);
    return NextResponse.json(
      {
        error: 'Failed to migrate mock listings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check migration status
 * GET /api/listings/migrate-mocks
 */
export async function GET() {
  try {
    const existingListings = await getAllListings();
    const existingIds = new Set(existingListings.map(l => l.id));
    const mockIds = mockListings.map(m => m.id);
    
    const migrated = mockIds.filter(id => existingIds.has(id));
    const notMigrated = mockIds.filter(id => !existingIds.has(id));

    return NextResponse.json({
      totalMockListings: mockListings.length,
      migrated: migrated.length,
      notMigrated: notMigrated.length,
      needsMigration: notMigrated.length > 0,
      sellerApiKeyConfigured: !!process.env.LOCUS_SELLER_API_KEY,
      voyageApiKeyConfigured: !!process.env.VOYAGE_API_KEY,
    });
  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      {
        error: 'Failed to check migration status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

