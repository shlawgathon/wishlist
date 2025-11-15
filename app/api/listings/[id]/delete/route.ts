import { NextRequest, NextResponse } from 'next/server';
import { getListingById } from '@/lib/listings-store';
import { getCurrentUser } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';

/**
 * Delete a listing
 * DELETE /api/listings/[id]/delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // Get existing listing
    const existingListing = await getListingById(id);
    if (!existingListing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Check if user is the creator
    if (existingListing.creatorUsername !== user.username) {
      return NextResponse.json(
        { error: 'You can only delete your own listings' },
        { status: 403 }
      );
    }

    // Delete listing from MongoDB
    const client = await clientPromise;
    const db = client.db('database');
    const collection = db.collection('listings');
    
    const result = await collection.deleteOne({ id });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete listing' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Listing deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting listing:', error);
    return NextResponse.json(
      { error: 'Failed to delete listing', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

