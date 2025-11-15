import { NextRequest, NextResponse } from 'next/server';
import { getListingById, updateListing } from '@/lib/listings-store';

/**
 * Sync listing funding amount with actual wallet balance
 * POST /api/listings/[id]/sync-balance
 * 
 * Checks the seller's wallet balance and updates the listing's amountRaised
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listing = await getListingById(id);

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Get seller wallet address
    const walletAddress = listing.sellerWalletAddress || listing.sellerWallet;
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Listing does not have a valid wallet address' },
        { status: 400 }
      );
    }

    // Query blockchain for wallet balance (USDC on Base)
    // For MVP, we'll use a simple RPC call to get USDC balance
    const baseRpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    
    // USDC contract address on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    const usdcContractAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    
    try {
      // Call balanceOf on USDC contract
      const balanceOfData = '0x70a08231' + walletAddress.slice(2).padStart(64, '0'); // balanceOf(address)
      
      const response = await fetch(baseRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [
            {
              to: usdcContractAddress,
              data: balanceOfData,
            },
            'latest',
          ],
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Failed to query blockchain');
      }

      // Parse balance (USDC has 6 decimals)
      const balanceHex = data.result || '0x0';
      const balanceWei = BigInt(balanceHex);
      const balanceUSDC = Number(balanceWei) / 1e6;

      // Update listing if balance changed
      if (Math.abs(balanceUSDC - listing.amountRaised) > 0.01) {
        // Only update if difference is significant (more than 1 cent)
        await updateListing(id, {
          amountRaised: balanceUSDC,
        });

        return NextResponse.json({
          success: true,
          updated: true,
          previousAmount: listing.amountRaised,
          newAmount: balanceUSDC,
          walletAddress,
        });
      }

      return NextResponse.json({
        success: true,
        updated: false,
        amount: balanceUSDC,
        walletAddress,
      });
    } catch (error) {
      console.error('Error querying wallet balance:', error);
      return NextResponse.json(
        { 
          error: 'Failed to query wallet balance', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error syncing balance:', error);
    return NextResponse.json(
      { error: 'Failed to sync balance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

