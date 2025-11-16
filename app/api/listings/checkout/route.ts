import { NextRequest, NextResponse } from 'next/server';
import { executePayment } from '@/lib/locus-agent';
import { getListingById, addFunding } from '@/lib/listings-store';
import { getCurrentUser } from '@/lib/auth';
import { makeCoinbaseRequest } from '@/lib/coinbase-jwt';

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
    
    // Use Locus Wallet Agent API key from session if not provided in request
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
    let finalPaymentMethod: 'wallet' | 'x402' | 'coinbase' = 'x402';
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
      finalPaymentMethod = paymentMethod as 'wallet' | 'x402' | 'coinbase';
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

    let paymentResult;

    // Handle Coinbase API key authentication
    if (finalPaymentMethod === 'coinbase') {
      const coinbaseApiKeyName = process.env.CDP_API_KEY_NAME;
      const coinbaseApiKeyPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;

      if (!coinbaseApiKeyName || !coinbaseApiKeyPrivateKey) {
        return NextResponse.json(
          { error: 'Coinbase API key credentials not configured. Please set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY environment variables.' },
          { status: 500 }
        );
      }

      try {
        // Use Coinbase API to process payment
        // Note: This is a simplified example - you'll need to use the actual Coinbase API endpoints
        // For now, we'll simulate a successful payment
        console.log('Processing Coinbase payment:', {
          projectId,
          amount: paymentAmount,
          recipient: finalRecipient.substring(0, 20) + '...',
        });

        // Example: Get account balance (you would use actual payment endpoints)
        // const accounts = await makeCoinbaseRequest('GET', '/api/v3/brokerage/accounts', {
        //   apiKeyName: coinbaseApiKeyName,
        //   apiKeyPrivateKey: coinbaseApiKeyPrivateKey,
        // });

        // For demo purposes, simulate successful payment
        // In production, you would:
        // 1. Get sender account ID
        // 2. Create a send transaction
        // 3. Execute the transaction
        // 4. Get transaction hash

        const mockTransactionHash = `0x${Array.from({ length: 64 }, () => 
          Math.floor(Math.random() * 16).toString(16)
        ).join('')}`;

        paymentResult = {
          success: true,
          transactionHash: mockTransactionHash,
        };

        console.log('Coinbase payment processed:', { success: paymentResult.success, hash: paymentResult.transactionHash });
      } catch (error) {
        console.error('Coinbase payment error:', error);
        return NextResponse.json(
          { error: 'Coinbase payment failed', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    } else {
      // Use Locus for wallet/x402 payments
      // Locus Wallet Agent API key is required for all MCP payments
      if (!finalBuyerApiKey) {
        return NextResponse.json(
          { error: 'Locus Wallet Agent API key is required for payments. Please add your Locus Wallet Agent API key in your account settings. When creating an agent in your wallet, make sure to select "Create API Key" so it can buy stuff.' },
          { status: 400 }
        );
      }

      // Validate Locus Wallet Agent API key format
      if (!finalBuyerApiKey.startsWith('locus_dev_') && !finalBuyerApiKey.startsWith('locus_')) {
        return NextResponse.json(
          { error: 'Invalid Locus Wallet Agent API key format. When creating an agent in your wallet, make sure to select "Create API Key". API keys start with "locus_dev_" or "locus_".' },
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
      try {
        paymentResult = await executePayment(
          projectId,
          paymentAmount,
          finalRecipient,
          finalPaymentMethod,
          finalBuyerApiKey, // Locus Wallet Agent API key from session
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

