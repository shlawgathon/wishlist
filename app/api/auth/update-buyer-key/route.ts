import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createSession } from '@/lib/auth';
import { updateUserBuyerApiKey } from '@/lib/users-store';
import { cookies } from 'next/headers';

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
    const { buyerApiKey } = body;

    if (!buyerApiKey) {
      return NextResponse.json(
        { error: 'Buyer API key is required' },
        { status: 400 }
      );
    }

    // Validate API key format
    if (!buyerApiKey.startsWith('locus_dev_') && !buyerApiKey.startsWith('locus_')) {
      return NextResponse.json(
        { error: 'Invalid Locus API key format. Should start with "locus_dev_" or "locus_"' },
        { status: 400 }
      );
    }

    // Update user's buyer API key
    const updated = await updateUserBuyerApiKey(user.username, buyerApiKey);
    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update buyer API key' },
        { status: 500 }
      );
    }

    // Update session with new API key
    const sessionToken = createSession(updated.username, updated.buyerApiKey);
    const cookieStore = await cookies();
    cookieStore.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: {
        username: updated.username,
        buyerApiKey: updated.buyerApiKey,
      },
    });
  } catch (error) {
    console.error('Update buyer key error:', error);
    return NextResponse.json(
      { error: 'Failed to update buyer API key', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

