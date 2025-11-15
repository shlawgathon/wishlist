import { NextRequest, NextResponse } from 'next/server';

// Mock project data store (in production, use a database)
const projects: Array<{
  id: string;
  title: string;
  description: string;
  fundingGoal: number;
  currentFunding: number;
  milestones: string[];
  creatorWallet: string;
  walletId: string;
  createdAt: number;
}> = [];

// This endpoint simulates a project API that returns 402 Payment Required
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  // In production, fetch project from database
  // For MVP, return 402 Payment Required to simulate x402 flow
  return new NextResponse(
    JSON.stringify({
      message: 'Payment required to access project details',
      projectId,
    }),
    {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Required': 'true',
        'X-Payment-Amount': '50', // Example amount
        'X-Payment-Currency': 'USDC',
        'X-Payment-Recipient': '0x' + Array.from({ length: 40 }, () => 
          Math.floor(Math.random() * 16).toString(16)
        ).join(''),
        'X-Payment-Scheme': 'x402',
      },
    }
  );
}

