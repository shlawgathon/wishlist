import { NextRequest, NextResponse } from 'next/server';
import { useLocusWithClaude } from '@/lib/claude-agent';
import Anthropic from '@anthropic-ai/sdk';
import { getAllListings } from '@/lib/listings-store';
import { mockListings } from '@/lib/mock-listings';

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

    // Fetch all available listings from MongoDB
    const apiListings = await getAllListings();
    
    // Filter out mock/test listings
    const mockIds = ['project-1', 'project-2', 'project-3'];
    const filteredListings = apiListings.filter(listing => {
      // Exclude system-created (migrated mock) listings
      if (listing.creatorUsername === 'system') {
        return false;
      }
      // Exclude mock listing IDs
      if (mockIds.includes(listing.id)) {
        return false;
      }
      // Exclude test listings
      if (listing.name && /test/i.test(listing.name)) {
        return false;
      }
      return true;
    });
    
    // Use request URL to determine base URL dynamically
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    // Don't include mock listings - only use real database listings
    const allListings = filteredListings;

    // Format listings for Claude with clickable links
    const listingsInfo = allListings.map((listing) => ({
      id: listing.id,
      name: listing.name,
      description: listing.description,
      category: listing.category,
      fundingGoal: listing.fundingGoal,
      amountRaised: listing.amountRaised,
      backers: listing.backers,
      daysLeft: listing.daysLeft,
      progress: ((listing.amountRaised / listing.fundingGoal) * 100).toFixed(1),
      url: `${baseUrl}/listings/${listing.id}`,
    }));

    // Build context with available fundraisers
    const listingsContext = listingsInfo.length > 0
      ? `\n\nAvailable Fundraisers (always include clickable links):\n${listingsInfo.map((l) =>
          `[${l.name}](${l.url}) - ${l.description} | $${l.amountRaised.toLocaleString()}/${l.fundingGoal.toLocaleString()} (${l.progress}% funded)`
        ).join('\n')}`
      : '\n\nNo fundraisers are currently available.';

    // If Locus API key is provided, use MCP integration
    if (locusApiKey) {
      try {
        const result = await useLocusWithClaude(
          `You are an AI assistant for Wishlist, a crypto fundraising platform.${listingsContext}\n\nUser query: ${query}\n\nInstructions: Be concise (under 100 words). ALWAYS suggest relevant fundraisers with clickable markdown links [Name](URL). Focus on specific fundraisers, not generic advice.`,
          anthropicApiKey,
          locusApiKey
        );
        return NextResponse.json({ result });
      } catch (error) {
        console.error('Locus MCP error, falling back to standard Claude:', error);
        // Fall through to standard Claude
      }
    }

    // Standard Claude API call with listings context
    const client = new Anthropic({ apiKey: anthropicApiKey });
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are an AI assistant for Wishlist, a crypto fundraising platform.${listingsContext}

          User query: ${query}

          Instructions:
          - Be VERY concise (under 100 words)
          - ALWAYS suggest relevant fundraisers from the list above with clickable markdown links
          - Format: [Project Name](URL) - brief description
          - If multiple match, list 2-3 most relevant with links
          - Skip generic advice - focus on specific fundraisers with clickable links
          - Example: "Check out [Mechanical Keyboard Pro](URL) - premium keyboard with custom switches"`,
        },
      ],
    });

    const content = message.content[0];
    if (content && 'type' in content && content.type === 'text') {
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

