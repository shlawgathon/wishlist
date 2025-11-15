import { NextRequest, NextResponse } from 'next/server';
import { getListingById, updateListing } from '@/lib/listings-store';
import { getCurrentUser } from '@/lib/auth';
import { embedListing } from '@/lib/embeddings';

/**
 * Update an existing listing
 * PUT /api/listings/[id]/update
 */
export async function PUT(
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
    const body = await request.json();
    const {
      name,
      description,
      companyName,
      companyBio,
      companyWebsite,
      fundingGoal,
      daysLeft,
      category,
      tiers,
      sellerEmail,
      sellerWalletAddress,
    } = body;

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
        { error: 'You can only edit your own listings' },
        { status: 403 }
      );
    }

    // Validate required fields (description is optional)
    if (!name || !companyName || !companyBio || !fundingGoal || !daysLeft || !category || !tiers) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Wallet address is required for receiving payments (agents cannot receive)
    if (sellerWalletAddress !== undefined && !sellerWalletAddress) {
      return NextResponse.json(
        { error: 'Seller wallet address is required. Agents cannot receive payments, only wallets can.' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      name,
      description: description || undefined, // Optional description
      companyProfile: {
        name: companyName,
        bio: companyBio,
        website: companyWebsite || undefined,
      },
      fundingGoal: parseFloat(fundingGoal),
      daysLeft: parseInt(daysLeft),
      category,
      tiers: tiers.map((tier: any) => ({
        id: tier.id,
        name: tier.name,
        description: tier.description,
        amount: parseFloat(tier.amount),
        rewards: tier.rewards,
        estimatedDelivery: tier.estimatedDelivery,
      })),
    };

    // Update optional payment fields if provided (only wallet address, agents cannot receive)
    if (sellerEmail !== undefined) updateData.sellerEmail = sellerEmail || undefined;
    if (sellerWalletAddress !== undefined) updateData.sellerWalletAddress = sellerWalletAddress;

    // Regenerate embedding if Voyager is configured
    try {
      if (process.env.VOYAGE_API_KEY) {
        const listingForEmbedding = { ...existingListing, ...updateData };
        const embedding = await embedListing(listingForEmbedding);
        updateData.embedding = embedding;
      }
    } catch (error) {
      console.warn('Failed to regenerate embedding (non-critical):', error);
      // Continue without updating embedding
    }

    // Update listing
    const updated = await updateListing(id, updateData);
    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update listing' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      listing: updated,
    });
  } catch (error) {
    console.error('Error updating listing:', error);
    return NextResponse.json(
      { error: 'Failed to update listing', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

