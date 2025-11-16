import { NextRequest, NextResponse } from 'next/server';

/**
 * Coinbase API Key Authentication Handler
 * This endpoint is kept for backward compatibility but now uses API key auth
 * See: https://docs.cdp.coinbase.com/coinbase-app/authentication-authorization/api-key-authentication
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      // User denied authorization
      return NextResponse.redirect(
        new URL(`/?error=coinbase_auth_denied&message=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/?error=coinbase_auth_failed&message=Missing authorization code', request.url)
      );
    }

    // Extract project info from state
    const stateParts = state.split('_');
    if (stateParts.length < 3 || stateParts[0] !== 'coinbase' || stateParts[1] !== 'pay') {
      return NextResponse.redirect(
        new URL('/?error=coinbase_auth_failed&message=Invalid state parameter', request.url)
      );
    }

    const projectId = stateParts.slice(2).join('_').split('_')[0]; // Get project ID from state

    // Exchange authorization code for access token
    const clientId = process.env.COINBASE_CLIENT_ID || '';
    const clientSecret = process.env.COINBASE_CLIENT_SECRET || '';
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/auth/coinbase/callback`;

    if (!clientId || !clientSecret) {
      console.error('Coinbase OAuth credentials not configured');
      return NextResponse.redirect(
        new URL('/?error=coinbase_config&message=Coinbase OAuth not configured', request.url)
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.coinbase.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('Coinbase token exchange failed:', errorData);
      return NextResponse.redirect(
        new URL('/?error=coinbase_token_failed&message=Failed to exchange authorization code', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Store token in session/cookie for future use
    // For now, we'll redirect back to the project page with success
    // In production, you'd want to store this token securely

    // Redirect to project page with success indicator
    return NextResponse.redirect(
      new URL(`/listings/${projectId}?coinbase_payment=success&token_received=true`, request.url)
    );
  } catch (error) {
    console.error('Coinbase callback error:', error);
    return NextResponse.redirect(
      new URL('/?error=coinbase_callback_error&message=An error occurred during authentication', request.url)
    );
  }
}

/**
 * POST handler for processing payment using API key authentication
 * Now uses CDP API keys instead of OAuth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, tierId, amount } = body;

    if (!projectId || !tierId || !amount) {
      return NextResponse.json(
        { error: 'Project ID, tier ID, and amount are required' },
        { status: 400 }
      );
    }

    // Use API key authentication instead of OAuth
    const apiKeyName = process.env.CDP_API_KEY_NAME;
    const apiKeyPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;

    if (!apiKeyName || !apiKeyPrivateKey) {
      return NextResponse.json(
        { error: 'Coinbase API key credentials not configured. Please set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY environment variables.' },
        { status: 500 }
      );
    }

    // Payment processing is now handled in the checkout route
    // This endpoint is kept for backward compatibility
    return NextResponse.json({
      success: true,
      message: 'Coinbase API key authentication configured',
      paymentProcessed: false, // Payment should be processed via /api/listings/checkout
    });
  } catch (error) {
    console.error('Coinbase payment processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

