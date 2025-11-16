import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserByUsername } from '@/lib/users-store';

/**
 * Get personal wallet balance from blockchain
 * GET /api/wallet/personal-balance
 * 
 * Queries the USDC balance of the user's personal wallet address on Base
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

    // Get user from database to access personal wallet address
    const dbUser = await getUserByUsername(user.username);
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if personal wallet address is set
    const walletAddress = dbUser.personalWalletAddress;
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Personal wallet address not configured. Please add your wallet address in settings.' },
        { status: 400 }
      );
    }

    // Query blockchain for wallet balance (USDC on Base)
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

      return NextResponse.json({
        success: true,
        balance: balanceUSDC,
        balanceFormatted: `$${balanceUSDC.toFixed(2)} USDC`,
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
    console.error('Error fetching personal wallet balance:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch personal wallet balance', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

