import { NextRequest, NextResponse } from 'next/server';
import { getListingById } from '@/lib/listings-store';

/**
 * x402 Protocol Endpoint
 * Returns 402 Payment Required if no payment header is present
 * Returns listing data if payment header is present
 */
export async function GET(
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

    // Check for X-Payment header (x402 protocol)
    const paymentHeader = request.headers.get('X-Payment');
    
    if (!paymentHeader) {
      // Return 402 Payment Required with payment details
      const paymentAmount = listing.fundingGoal.toString();
      const paymentRecipient = listing.sellerWalletAddress || listing.sellerWallet || '';
      
      return NextResponse.json(
        { 
          error: 'Payment required',
          message: 'This listing requires payment to access',
          listing: {
            id: listing.id,
            name: listing.name,
            description: listing.description,
          }
        },
        { 
          status: 402,
          headers: {
            'X-Payment-Required': 'true',
            'X-Payment-Amount': paymentAmount,
            'X-Payment-Currency': 'USDC',
            'X-Payment-Recipient': paymentRecipient,
            'X-Payment-Scheme': 'x402',
          }
        }
      );
    }

    // Payment header present - verify and return listing data
    try {
      const paymentData = JSON.parse(paymentHeader);
      
      // In production, you would verify the transaction hash here
      // For MVP, just check that it exists
      if (!paymentData.transactionHash) {
        return NextResponse.json(
          { error: 'Invalid payment header: missing transaction hash' },
          { status: 400 }
        );
      }

      // Return full listing data
      return NextResponse.json({
        listing: {
          id: listing.id,
          name: listing.name,
          description: listing.description,
          fullDescription: listing.fullDescription,
          companyProfile: listing.companyProfile,
          fundingGoal: listing.fundingGoal,
          amountRaised: listing.amountRaised,
          backers: listing.backers,
          daysLeft: listing.daysLeft,
          category: listing.category,
          tiers: listing.tiers,
          createdAt: listing.createdAt,
        },
        payment: {
          transactionHash: paymentData.transactionHash,
          scheme: paymentData.scheme,
          timestamp: paymentData.timestamp,
        }
      });
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid payment header format' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in x402 endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

