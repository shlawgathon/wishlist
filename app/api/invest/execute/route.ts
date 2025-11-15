import { NextRequest, NextResponse } from 'next/server';
import { executeBatchInvestments } from '@/lib/locus-agent';
import { discoverServices } from '@/lib/x402-client';
import { updateAgentMemory } from '@/lib/claude-agent';
import { getCurrentUser } from '@/lib/auth';
import { getListingById } from '@/lib/listings-store';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (required for buyer API key)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please login to make investments.' },
        { status: 401 }
      );
    }

    // Buyer API key is required (agents can send, wallets receive)
    if (!user.buyerApiKey) {
      return NextResponse.json(
        { error: 'Buyer API key is required. Please add your Locus buyer API key in your account settings.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { investments, walletId } = body;

    // Validate input
    if (!investments || !Array.isArray(investments) || investments.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid investments array' },
        { status: 400 }
      );
    }

    if (!walletId) {
      return NextResponse.json(
        { error: 'Missing walletId' },
        { status: 400 }
      );
    }

    // Get project endpoints from x402 Bazaar
    const services = await discoverServices(process.env.X402_BAZAAR_ENDPOINT);
    const serviceMap = new Map(services.map(s => [s.id, s.endpoint]));

    // Fetch listings to get wallet addresses (agents cannot receive, only wallets can)
    const investmentPromises = investments.map(async (inv: { projectId: string; amount: number }) => {
      const listing = await getListingById(inv.projectId);
      if (!listing) {
        throw new Error(`Listing not found: ${inv.projectId}`);
      }

      // Only wallet addresses can receive payments (agents cannot receive)
      const recipient = listing.sellerWalletAddress || listing.sellerWallet;
      if (!recipient) {
        throw new Error(`Listing ${inv.projectId} does not have a wallet address for receiving payments`);
      }

      return {
        projectId: inv.projectId,
        amount: inv.amount,
        projectEndpoint: serviceMap.get(inv.projectId) || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/listings/${inv.projectId}`,
        recipient, // Wallet address for receiving payments
        paymentMethod: 'x402' as const,
      };
    });

    const investmentDetails = await Promise.all(investmentPromises);

    // Prepare investment batch with buyer's API key from account
    const investmentBatch = {
      investments: investmentDetails,
      buyerApiKey: user.buyerApiKey, // Always use buyer's account API key
    };

    // Execute batch investments using Locus
    const result = await executeBatchInvestments(investmentBatch);

    // Update agent memory
    result.results.forEach((paymentResult) => {
      if (paymentResult.success) {
        const investment = investments.find((inv: { projectId: string }) => 
          inv.projectId === paymentResult.projectId
        );
        if (investment) {
          updateAgentMemory(paymentResult.projectId, investment.amount);
        }
      }
    });

    return NextResponse.json({
      success: true,
      results: result.results,
      summary: {
        totalInvested: result.totalInvested,
        successful: result.successful,
        failed: result.failed,
      },
      transactionHashes: result.results
        .filter(r => r.transactionHash)
        .map(r => r.transactionHash),
    });
  } catch (error) {
    console.error('Error executing investments:', error);
    return NextResponse.json(
      { error: 'Failed to execute investments', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

