import { NextRequest, NextResponse } from 'next/server';
import { executePayment } from '@/lib/locus-agent';
import { getListingById, addFunding } from '@/lib/listings-store';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please login to make a payment.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId, tierId, amount, buyerApiKey, paymentMethod, recipient } = body;
    
    // Use buyer API key from session if not provided in request
    const finalBuyerApiKey = buyerApiKey || user.buyerApiKey;

    if (!projectId || !tierId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, tierId, amount' },
        { status: 400 }
      );
    }

    // Fetch listing from MongoDB
    const listing = await getListingById(projectId);
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

    // Determine payment method and recipient
    // Only wallets can receive payments (agents cannot receive)
    // Note: sellerEmail is for contacting the creator, NOT for payments
    let finalPaymentMethod: 'wallet' | 'x402' = 'x402';
    let finalRecipient: string = '';

    // If payment method and recipient are provided, use them
    if (paymentMethod && recipient) {
      // Don't allow email or agent as payment method - only wallets can receive
      if (paymentMethod === 'email') {
        return NextResponse.json(
          { error: 'Email is for contacting the creator, not for payments. Please use wallet address or x402 payment.' },
          { status: 400 }
        );
      }
      if (paymentMethod === 'agent') {
        return NextResponse.json(
          { error: 'Agents cannot receive payments. Please use wallet address or x402 payment.' },
          { status: 400 }
        );
      }
      finalPaymentMethod = paymentMethod;
      finalRecipient = recipient;
      console.log('Using provided payment method:', finalPaymentMethod, 'recipient:', finalRecipient.substring(0, 20) + '...');
    } else {
      // Auto-detect payment method from listing (prioritize wallet > x402)
      // Only wallets can receive payments - agents cannot receive
      if (listing.sellerWalletAddress || listing.sellerWallet) {
        finalPaymentMethod = 'wallet';
        finalRecipient = listing.sellerWalletAddress || listing.sellerWallet;
      } else {
        // Try x402 as fallback
        finalPaymentMethod = 'x402';
        finalRecipient = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/listings/${projectId}`;
      }
      console.log('Auto-detected payment method:', finalPaymentMethod, 'recipient:', finalRecipient.substring(0, 20) + '...');
    }

    if (!finalRecipient) {
      return NextResponse.json(
        { error: 'No payment recipient found. Listing must have sellerWalletAddress. Agents cannot receive payments, only wallets can.' },
        { status: 400 }
      );
    }

    // Buyer API key is required for all MCP payments
    if (!finalBuyerApiKey) {
      return NextResponse.json(
        { error: 'Buyer API key is required for payments. Please add your Locus buyer API key in your account settings.' },
        { status: 400 }
      );
    }

    // Validate buyer API key format
    if (!finalBuyerApiKey.startsWith('locus_dev_') && !finalBuyerApiKey.startsWith('locus_')) {
      return NextResponse.json(
        { error: 'Invalid buyer API key format. API keys must be created manually on Locus and start with "locus_dev_" or "locus_".' },
        { status: 400 }
      );
    }

    // Execute payment using Locus
    console.log('Executing payment:', {
      projectId,
      amount: paymentAmount,
      method: finalPaymentMethod,
      recipient: finalRecipient.substring(0, 20) + '...',
      hasBuyerApiKey: !!finalBuyerApiKey,
      username: user.username,
    });

    const projectEndpoint = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/listings/${projectId}`;
    let paymentResult;
    try {
      paymentResult = await executePayment(
        projectId,
        paymentAmount,
        finalRecipient,
        finalPaymentMethod,
        finalBuyerApiKey, // Buyer agent's API key from session
        finalPaymentMethod === 'x402' ? projectEndpoint : undefined
      );
      console.log('Payment result:', { success: paymentResult.success, hasHash: !!paymentResult.transactionHash, error: paymentResult.error });
    } catch (error) {
      console.error('Payment execution threw error:', error);
      return NextResponse.json(
        { error: 'Payment execution failed', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }

    if (!paymentResult.success) {
      console.error('Payment execution failed:', paymentResult.error);
      return NextResponse.json(
        { error: paymentResult.error || 'Payment failed', details: paymentResult.error },
        { status: 500 }
      );
    }

    // Transaction hash is required - payment should not succeed without it
    if (!paymentResult.transactionHash) {
      console.error('Payment succeeded but no transaction hash returned');
      return NextResponse.json(
        { error: 'Payment succeeded but no transaction hash was returned. Payment may not have been processed.' },
        { status: 500 }
      );
    }

    // Only update listing funding if payment succeeded and has transaction hash
    // Funds automatically go to the listing's seller wallet address
    await addFunding(projectId, paymentAmount);

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

