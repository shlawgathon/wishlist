import { NextRequest, NextResponse } from 'next/server';
import { getListingsByCreator } from '@/lib/listings-store';
import { getCurrentUser } from '@/lib/auth';

/**
 * Get listings created by the current user
 * GET /api/listings/my-listings
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get listings created by this user
    const listings = await getListingsByCreator(user.username);

    return NextResponse.json({ listings });
  } catch (error) {
    console.error('Error fetching user listings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch listings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

