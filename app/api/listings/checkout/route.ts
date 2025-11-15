import { NextRequest, NextResponse } from 'next/server';
import { executePayment } from '@/lib/locus-agent';
import { createWallet, initCDPWallet } from '@/lib/cdp-wallet';
import { getListingById, addFunding } from '@/lib/listings-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, tierId, amount, buyerApiKey } = body;

    if (!projectId || !tierId || !amount || !buyerApiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, tierId, amount, buyerApiKey' },
        { status: 400 }
      );
    }

    // Fetch listing from store
    const listing = getListingById(projectId);
    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    const tier = listing.tiers.find((t: any) => t.id === tierId);
    if (!tier) {
      return NextResponse.json(
        { error: 'Tier not found' },
        { status: 404 }
      );
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount < tier.amount) {
      return NextResponse.json(
        { error: `Amount must be at least $${tier.amount}` },
        { status: 400 }
      );
    }

    // Initialize wallet config
    const walletConfig = initCDPWallet({
      apiKeyName: process.env.CDP_API_KEY_NAME || '',
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY || '',
    });

    // Create or get buyer wallet
    const buyerWallet = await createWallet(`buyer_${Date.now()}`, walletConfig);

    // Execute payment using Locus via executePayment
    const projectEndpoint = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/listings/${projectId}`;
    const paymentResult = await executePayment(
      projectId,
      paymentAmount,
      listing.sellerWallet,
      buyerWallet.walletId,
      walletConfig,
      projectEndpoint,
      buyerApiKey
    );

    if (!paymentResult.success || !paymentResult.transactionHash) {
      return NextResponse.json(
        { error: paymentResult.error || 'Payment failed' },
        { status: 500 }
      );
    }

    // Update listing funding
    addFunding(projectId, paymentAmount);

    return NextResponse.json({
      success: true,
      transactionHash: paymentResult.transactionHash,
      message: 'Payment processed successfully',
    });
  } catch (error) {
    console.error('Error processing checkout:', error);
    return NextResponse.json(
      { error: 'Failed to process checkout', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

