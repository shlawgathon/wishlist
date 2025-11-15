import { NextRequest, NextResponse } from 'next/server';
import { getAllListings, updateListing } from '@/lib/listings-store';
import { embedListing } from '@/lib/embeddings';

/**
 * Backfill embeddings for existing listings that don't have embeddings
 * POST /api/listings/backfill-embeddings
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Voyager API key is configured
    if (!process.env.VOYAGE_API_KEY) {
      return NextResponse.json(
        { error: 'VOYAGE_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }

    // Get all listings
    const listings = await getAllListings();
    
    // Filter listings without embeddings
    const listingsWithoutEmbeddings = listings.filter(
      (listing) => !listing.embedding || listing.embedding.length === 0
    );

    if (listingsWithoutEmbeddings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All listings already have embeddings',
        processed: 0,
        total: listings.length,
      });
    }

    // Generate embeddings for each listing
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const listing of listingsWithoutEmbeddings) {
      try {
        const embedding = await embedListing(listing);
        await updateListing(listing.id, { embedding });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Failed to generate embedding for listing ${listing.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
        console.error(`Error generating embedding for listing ${listing.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.success} listings, ${results.failed} failed`,
      processed: results.success,
      failed: results.failed,
      total: listings.length,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error('Error backfilling embeddings:', error);
    return NextResponse.json(
      {
        error: 'Failed to backfill embeddings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check embedding status
 * GET /api/listings/backfill-embeddings
 */
export async function GET() {
  try {
    const listings = await getAllListings();
    const listingsWithEmbeddings = listings.filter(
      (listing) => listing.embedding && listing.embedding.length > 0
    );
    const listingsWithoutEmbeddings = listings.filter(
      (listing) => !listing.embedding || listing.embedding.length === 0
    );

    return NextResponse.json({
      total: listings.length,
      withEmbeddings: listingsWithEmbeddings.length,
      withoutEmbeddings: listingsWithoutEmbeddings.length,
      needsBackfill: listingsWithoutEmbeddings.length > 0,
      voyagerConfigured: !!process.env.VOYAGE_API_KEY,
    });
  } catch (error) {
    console.error('Error checking embedding status:', error);
    return NextResponse.json(
      {
        error: 'Failed to check embedding status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

