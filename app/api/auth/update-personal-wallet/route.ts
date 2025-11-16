import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { updateUserPersonalWalletAddress } from '@/lib/users-store';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { personalWalletAddress } = body;

    // Validate wallet address format if provided
    if (personalWalletAddress && personalWalletAddress.trim()) {
      const trimmedAddress = personalWalletAddress.trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)) {
        return NextResponse.json(
          { error: 'Invalid wallet address format. Must be a valid Ethereum address (0x followed by 40 hex characters).' },
          { status: 400 }
        );
      }
    }

    // Update user's personal wallet address
    const updated = await updateUserPersonalWalletAddress(
      user.username,
      personalWalletAddress?.trim() || undefined
    );
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update personal wallet address' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        username: updated.username,
        personalWalletAddress: updated.personalWalletAddress,
      },
    });
  } catch (error) {
    console.error('Update personal wallet error:', error);
    return NextResponse.json(
      { error: 'Failed to update personal wallet address', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

