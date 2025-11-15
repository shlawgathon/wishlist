import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { mockListings } from '@/lib/mock-listings';

/**
 * Cleanup mock and test listings from database
 * DELETE /api/listings/cleanup
 * 
 * Removes:
 * - Listings with creatorUsername: 'system' (migrated mock listings)
 * - Listings with IDs matching mock listings (project-1, project-2, project-3)
 * - Listings with "test" in the name (case-insensitive)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user (optional - can be admin-only later)
    const user = await getCurrentUser();
    
    const client = await clientPromise;
    const db = client.db('database');
    const collection = db.collection('listings');

    // Get mock listing IDs
    const mockIds = mockListings.map(m => m.id);

    // Build query to find listings to delete
    const deleteQuery = {
      $or: [
        { creatorUsername: 'system' }, // System-created (migrated) listings
        { id: { $in: mockIds } }, // Mock listing IDs
        { name: { $regex: /test/i } }, // Test listings (case-insensitive)
      ],
    };

    // Find listings that will be deleted (for reporting)
    const listingsToDelete = await collection.find(deleteQuery).toArray();

    // Delete the listings
    const result = await collection.deleteMany(deleteQuery);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      deletedListings: listingsToDelete.map(l => ({
        id: l.id,
        name: l.name,
        creatorUsername: l.creatorUsername,
      })),
      message: `Deleted ${result.deletedCount} mock/test listing(s)`,
    });
  } catch (error) {
    console.error('Error cleaning up listings:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup listings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

