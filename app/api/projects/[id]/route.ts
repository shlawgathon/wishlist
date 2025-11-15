import { NextRequest, NextResponse } from 'next/server';
import { projects } from '../create/route';

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

// PUT endpoint to update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { title, description, fundingGoal, milestones, status, category, deadline, location } = body;

    // Find the project
    const projectIndex = projects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const existingProject = projects[projectIndex];

    // Update project fields (only update provided fields)
    const updatedProject = {
      ...existingProject,
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(fundingGoal !== undefined && { fundingGoal: parseFloat(fundingGoal) }),
      ...(milestones !== undefined && { 
        milestones: typeof milestones === 'string' 
          ? milestones.split(',').map(m => m.trim()).filter(m => m)
          : milestones 
      }),
      ...(status !== undefined && { status: status as 'ongoing' | 'completed' }),
      ...(category !== undefined && { category: category || undefined }),
      ...(deadline !== undefined && { deadline: deadline ? new Date(deadline).toISOString() : undefined }),
      ...(location !== undefined && { location: location || undefined }),
    };

    projects[projectIndex] = updatedProject;

    return NextResponse.json({
      project: updatedProject,
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

