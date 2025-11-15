import { NextRequest, NextResponse } from 'next/server';
import { createWallet, initCDPWallet } from '@/lib/cdp-wallet';
import { registerProject } from '@/lib/x402-client';
import { createListing, getAllListings, Listing } from '@/lib/listings-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      fullDescription,
      companyName,
      companyBio,
      companyWebsite,
      fundingGoal,
      daysLeft,
      category,
      tiers,
      sellerApiKey,
    } = body;

    // Validate required fields
    if (!name || !description || !fullDescription || !companyName || !companyBio || !fundingGoal || !daysLeft || !category || !tiers || !sellerApiKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use seller API key from request body (fallback to env for backward compatibility)
    const finalSellerApiKey = sellerApiKey || process.env.LOCUS_SELLER_API_KEY;
    if (!finalSellerApiKey) {
      return NextResponse.json(
        { error: 'Seller API key is required' },
        { status: 400 }
      );
    }

    // Initialize CDP wallet for seller
    const walletConfig = initCDPWallet({
      apiKeyName: process.env.CDP_API_KEY_NAME || '',
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY || '',
    });

    // Create seller wallet
    const sellerWallet = await createWallet(`seller_${Date.now()}`, walletConfig);

    // Create listing
    const listing = {
      id: `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      fullDescription,
      companyProfile: {
        name: companyName,
        bio: companyBio,
        website: companyWebsite || undefined,
      },
      fundingGoal: parseFloat(fundingGoal),
      amountRaised: 0,
      backers: 0,
      daysLeft: parseInt(daysLeft),
      tiers: tiers.map((tier: any) => ({
        id: tier.id,
        name: tier.name,
        description: tier.description,
        amount: parseFloat(tier.amount),
        rewards: tier.rewards,
        estimatedDelivery: tier.estimatedDelivery,
      })),
      category,
      sellerWallet: sellerWallet.address,
      sellerWalletId: sellerWallet.walletId,
      sellerApiKey: finalSellerApiKey, // Store seller API key for payment processing
      createdAt: Date.now(),
    };

    // Store listing
    createListing(listing);

    // Register with x402 Bazaar
    await registerProject(
      {
        id: listing.id,
        name: listing.name,
        description: listing.description,
        endpoint: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/listings/${listing.id}`,
        pricing: {
          amount: fundingGoal.toString(),
          currency: 'USDC',
        },
      },
      process.env.X402_BAZAAR_ENDPOINT
    );

    return NextResponse.json({
      success: true,
      project: listing,
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    return NextResponse.json(
      { error: 'Failed to create listing', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET all listings
export async function GET() {
  return NextResponse.json({ listings: getAllListings() });
}

