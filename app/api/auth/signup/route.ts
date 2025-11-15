import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/users-store';
import { hashPassword, createSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, buyerApiKey } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Buyer API key is required for account creation
    if (!buyerApiKey || !buyerApiKey.trim()) {
      return NextResponse.json(
        { error: 'Locus buyer API key is required. Please create one on the Locus platform before signing up.' },
        { status: 400 }
      );
    }

    // Validate buyer API key format
    const trimmedApiKey = buyerApiKey.trim();
    if (!trimmedApiKey.startsWith('locus_dev_') && !trimmedApiKey.startsWith('locus_')) {
      return NextResponse.json(
        { error: 'Invalid Locus API key format. API keys must start with "locus_dev_" or "locus_" and be created on the Locus platform.' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Create user
    try {
      const user = await createUser({
        username,
        passwordHash,
        buyerApiKey: trimmedApiKey,
      });

      // Create session
      const sessionToken = createSession(user.username, user.buyerApiKey);
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
          username: user.username,
          buyerApiKey: user.buyerApiKey,
        },
      });
    } catch (error: any) {
      if (error.message === 'Username already exists') {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

