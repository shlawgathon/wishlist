import { NextRequest, NextResponse } from 'next/server';
import { initClaudeAgent, parseInvestmentIntent, analyzeProjects } from '@/lib/claude-agent';
import { discoverServices } from '@/lib/x402-client';
import { scoreAndRankProjects, allocateBudget } from '@/lib/investment-analyzer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { budget, preferences, categories } = body;

    // Validate input
    if (!budget || !preferences) {
      return NextResponse.json(
        { error: 'Missing required fields: budget, preferences' },
        { status: 400 }
      );
    }

    // Initialize Claude agent
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const claudeClient = initClaudeAgent(apiKey);

    // Parse investment intent
    const parsedIntent = await parseInvestmentIntent(
      {
        budget: parseFloat(budget),
        preferences,
        categories: categories || [],
      },
      claudeClient
    );

    // Discover projects from x402 Bazaar
    const services = await discoverServices(
      process.env.X402_BAZAAR_ENDPOINT,
      {
        category: parsedIntent.categories[0],
        minAmount: 0,
        maxAmount: parsedIntent.parsedBudget,
      }
    );

    // Convert services to project format
    const projects = services.map(service => ({
      id: service.id,
      title: service.name,
      description: service.description,
      category: parsedIntent.categories[0] || 'general',
      fundingGoal: parseFloat(service.pricing.amount),
      currentFunding: 0, // In production, fetch from blockchain
      endpoint: service.endpoint,
    }));

    // Score and rank projects using Claude
    const analyzedProjects = await analyzeProjects(
      projects,
      {
        budget: parsedIntent.parsedBudget,
        preferences,
        categories: parsedIntent.categories,
      },
      claudeClient
    );

    // Also use local analyzer for additional scoring
    const scoredProjects = scoreAndRankProjects(
      projects,
      {
        budget: parsedIntent.parsedBudget,
        preferences,
        categories: parsedIntent.categories,
      }
    );

    // Merge scores (average Claude and local scores)
    const finalRecommendations = analyzedProjects.map((claude, idx) => {
      const local = scoredProjects.find(p => p.id === claude.projectId) || scoredProjects[idx];
      const project = projects.find(p => p.id === claude.projectId) || projects[idx];
      return {
        id: claude.projectId,
        title: claude.title,
        description: claude.description,
        category: project?.category || 'general',
        fundingGoal: project?.fundingGoal || claude.suggestedAmount * 2,
        currentFunding: project?.currentFunding || 0,
        score: Math.round((claude.score + (local?.score || 50)) / 2),
        matchReason: claude.matchReason || local?.matchReason || 'Potential match',
        suggestedAmount: claude.suggestedAmount || local?.suggestedAmount || 0,
      };
    });

    // Allocate budget
    const allocations = allocateBudget(
      finalRecommendations,
      parsedIntent.parsedBudget
    );

    return NextResponse.json({
      recommendations: finalRecommendations,
      allocations,
      parsedIntent,
      totalProjects: finalRecommendations.length,
    });
  } catch (error) {
    console.error('Error matching investments:', error);
    return NextResponse.json(
      { error: 'Failed to match investments', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

