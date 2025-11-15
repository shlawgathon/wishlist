import { NextRequest, NextResponse } from 'next/server';
import { createWallet, initCDPWallet } from '@/lib/cdp-wallet';
import { registerProject } from '@/lib/x402-client';

// In-memory store for MVP (in production, use a database)
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, fundingGoal, milestones, userId } = body;

    // Validate input
    if (!title || !description || !fundingGoal || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, fundingGoal, userId' },
        { status: 400 }
      );
    }

    // Initialize CDP wallet config
    const walletConfig = initCDPWallet({
      apiKeyName: process.env.CDP_API_KEY_NAME || '',
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY || '',
    });

    // Create wallet for creator
    const wallet = await createWallet(userId, walletConfig);

    // Create project
    const project = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      fundingGoal: parseFloat(fundingGoal),
      currentFunding: 0,
      milestones: milestones || [],
      creatorWallet: wallet.address,
      walletId: wallet.walletId,
      createdAt: Date.now(),
    };

    projects.push(project);

    // Register with x402 Bazaar
    const bazaarEndpoint = process.env.X402_BAZAAR_ENDPOINT;
    await registerProject(
      {
        id: project.id,
        name: project.title,
        description: project.description,
        endpoint: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects/${project.id}`,
        pricing: {
          amount: fundingGoal.toString(),
          currency: 'USDC',
        },
      },
      bazaarEndpoint
    );

    return NextResponse.json({
      projectId: project.id,
      wallet: {
        address: wallet.address,
        walletId: wallet.walletId,
        network: wallet.network,
      },
      project,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve all projects (for MVP)
export async function GET() {
  return NextResponse.json({ projects });
}

