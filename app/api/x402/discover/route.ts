import { NextRequest, NextResponse } from 'next/server';
import { discoverServices } from '@/lib/x402-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');

    const filters = {
      category: category || undefined,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
    };

    const services = await discoverServices(
      process.env.X402_BAZAAR_ENDPOINT,
      filters
    );

    return NextResponse.json({
      services,
      count: services.length,
    });
  } catch (error) {
    console.error('Error discovering x402 services:', error);
    return NextResponse.json(
      { error: 'Failed to discover services', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

