import { NextRequest, NextResponse } from 'next/server';
import { createWallet, initCDPWallet } from '@/lib/cdp-wallet';
import { registerProject } from '@/lib/x402-client';
import { createListing, getAllListings, type Listing } from '@/lib/listings-store';
import { embedListing } from '@/lib/embeddings';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please login to create a listing.' },
        { status: 401 }
      );
    }

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

    // Validate required fields (description is optional)
    if (!name || !companyName || !companyBio || !fundingGoal || !daysLeft || !category || !tiers) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Wallet address is required for receiving payments (agents cannot receive)
    if (!sellerWalletAddress) {
      return NextResponse.json(
        { error: 'Seller wallet address is required. Agents cannot receive payments, only wallets can.' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (sellerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sellerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate wallet address format if provided (basic check)
    if (sellerWalletAddress && (!sellerWalletAddress.startsWith('0x') || sellerWalletAddress.length !== 42)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format. Must be a valid Ethereum address (0x...)' },
        { status: 400 }
      );
    }

    // Initialize CDP wallet for seller (legacy, for backward compatibility)
    let sellerWallet;
    try {
      const walletConfig = initCDPWallet({
        apiKeyName: process.env.CDP_API_KEY_NAME || 'mock_key',
        apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY || 'mock_private_key',
      });
      sellerWallet = await createWallet(`seller_${Date.now()}`, walletConfig);
    } catch (error) {
      // Fallback to mock wallet if CDP fails
      console.warn('CDP wallet creation failed, using mock wallet:', error);
      sellerWallet = {
        walletId: `wallet_seller_${Date.now()}`,
        address: sellerWalletAddress || `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        network: 'base',
      };
    }

    // Create listing
    const listing: Listing = {
      id: `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: description || undefined, // Optional description
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
      sellerWallet: sellerWallet.address, // Legacy CDP wallet address
      sellerWalletId: sellerWallet.walletId, // Legacy CDP wallet ID
      sellerEmail: sellerEmail || undefined, // Optional: Seller email for contacting creator (not for payments)
      sellerWalletAddress: sellerWalletAddress, // Required: Seller wallet address for receiving payments
      creatorUsername: user.username, // Store creator username
      createdAt: Date.now(),
    };

    // Generate embedding for the listing (optional, won't fail if Voyager is not configured)
    try {
      if (process.env.VOYAGE_API_KEY) {
        const embedding = await embedListing(listing);
        listing.embedding = embedding;
      } else {
        console.warn('VOYAGE_API_KEY not set, skipping embedding generation');
      }
    } catch (error) {
      console.warn('Failed to generate embedding (non-critical):', error);
      // Continue without embedding - it can be added later
    }

    // Store listing in MongoDB
    await createListing(listing);

    // Register with x402 Bazaar (optional, don't fail if it errors)
    try {
      await registerProject(
        {
          id: listing.id,
          name: listing.name,
          description: listing.description || '',
          endpoint: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/listings/${listing.id}`,
          pricing: {
            amount: fundingGoal.toString(),
            currency: 'USDC',
          },
        },
        process.env.X402_BAZAAR_ENDPOINT
      );
    } catch (error) {
      console.warn('x402 registration failed (non-critical):', error);
      // Continue even if x402 registration fails
    }

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
  try {
    const listings = await getAllListings();
    
    // Filter out mock/test listings
    const mockIds = ['project-1', 'project-2', 'project-3'];
    const filteredListings = listings.filter(listing => {
      // Exclude system-created (migrated mock) listings
      if (listing.creatorUsername === 'system') {
        return false;
      }
      // Exclude mock listing IDs
      if (mockIds.includes(listing.id)) {
        return false;
      }
      // Exclude test listings
      if (listing.name && /test/i.test(listing.name)) {
        return false;
      }
      return true;
    });
    
    return NextResponse.json({ listings: filteredListings });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}

