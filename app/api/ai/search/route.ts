import { NextRequest, NextResponse } from 'next/server';
import { useLocusWithClaude } from '@/lib/claude-agent';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, locusApiKey } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    // If Locus API key is provided, use MCP integration
    if (locusApiKey) {
      try {
        const result = await useLocusWithClaude(
          `You are an AI assistant for Wishlist, a crypto fundraising platform. Help the user with: ${query}. 
          You can help them discover investment opportunities, analyze projects, or provide recommendations.`,
          anthropicApiKey,
          locusApiKey
        );
        return NextResponse.json({ result });
      } catch (error) {
        console.error('Locus MCP error, falling back to standard Claude:', error);
        // Fall through to standard Claude
      }
    }

    // Standard Claude API call
    const client = new Anthropic({ apiKey: anthropicApiKey });
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are an AI assistant for Wishlist, a crypto fundraising platform with AI-powered investment matching. 
          Help the user with their query: ${query}
          
          You can help with:
          - Discovering investment opportunities
          - Analyzing projects and their potential
          - Providing investment recommendations
          - Explaining how the platform works
          - Answering questions about crypto fundraising
          
          Be helpful, concise, and informative.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return NextResponse.json({ result: content.text });
    }

    return NextResponse.json({ result: 'No response generated' });
  } catch (error) {
    console.error('AI search error:', error);
    return NextResponse.json(
      { error: 'Failed to process search', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

