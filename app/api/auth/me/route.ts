import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserByUsername } from '@/lib/users-store';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get full user data from database to include personalWalletAddress
    const dbUser = await getUserByUsername(user.username);
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        username: dbUser.username,
        buyerApiKey: dbUser.buyerApiKey,
        personalWalletAddress: dbUser.personalWalletAddress,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}

