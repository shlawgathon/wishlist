import { NextRequest, NextResponse } from 'next/server';
import { executeBatchInvestments, initLocusAgent } from '@/lib/locus-agent';
import { discoverServices } from '@/lib/x402-client';
import { updateAgentMemory } from '@/lib/claude-agent';

// Initialize Locus with API keys (can be overridden by client-provided key)
const getLocusConfig = (clientApiKey?: string) => {
  return initLocusAgent({
    buyerApiKey: clientApiKey || process.env.LOCUS_BUYER_API_KEY,
    sellerApiKey: process.env.LOCUS_SELLER_API_KEY,
  });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { investments, walletId, userId, locusBuyerApiKey } = body;

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

    // Initialize Locus with client-provided API key or fallback to env
    const locusConfig = getLocusConfig(locusBuyerApiKey);

    // Get wallet config
    const walletConfig = {
      apiKeyName: process.env.CDP_API_KEY_NAME || '',
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY || '',
    };

    // Get project endpoints from x402 Bazaar
    const services = await discoverServices(process.env.X402_BAZAAR_ENDPOINT);
    const serviceMap = new Map(services.map(s => [s.id, s.endpoint]));

    // Prepare investment batch
    const investmentBatch = {
      investments: investments.map((inv: { projectId: string; amount: number }) => ({
        projectId: inv.projectId,
        amount: inv.amount,
        projectEndpoint: serviceMap.get(inv.projectId) || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects/${inv.projectId}`,
      })),
      walletId,
      walletConfig,
    };

    // Execute batch investments using Locus
    const result = await executeBatchInvestments(
      investmentBatch,
      locusConfig.buyerApiKey
    );

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

