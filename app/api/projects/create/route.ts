import { NextRequest, NextResponse } from 'next/server';
import { createWallet, initCDPWallet } from '@/lib/cdp-wallet';
import { registerProject } from '@/lib/x402-client';

// In-memory store for MVP (in production, use a database)
// Export projects array so it can be shared with other routes
export const projects: Array<{
  id: string;
  title: string;
  description: string;
  fundingGoal: number;
  currentFunding: number;
  milestones: string[];
  creatorWallet: string;
  walletId: string;
  createdAt: number;
  status: 'ongoing' | 'completed';
  category?: string;
  deadline?: string;
  location?: string;
}> = [
  // Test project placeholder
  {
    id: 'test_project_1',
    title: 'Test Project - Mechanical Keyboard',
    description: 'A high-quality mechanical keyboard project with custom switches and RGB lighting. Perfect for developers and gamers alike.',
    fundingGoal: 50000,
    currentFunding: 12500,
    milestones: ['Prototype', 'Beta Testing', 'Production', 'Launch'],
    creatorWallet: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    walletId: 'test_wallet_1',
    createdAt: Date.now() - 86400000, // 1 day ago
    status: 'ongoing',
    category: 'Technology',
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
    location: 'San Francisco, CA',
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, fundingGoal, milestones, userId, category, deadline, location } = body;

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
      status: 'ongoing' as const,
      category: category || undefined,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      location: location || undefined,
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

