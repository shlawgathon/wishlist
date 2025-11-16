import { NextRequest, NextResponse } from 'next/server';
import { useLocusWithClaude } from '@/lib/claude-agent';
import Anthropic from '@anthropic-ai/sdk';
import { getAllListings } from '@/lib/listings-store';
import { mockListings } from '@/lib/mock-listings';
import { getCurrentUser } from '@/lib/auth';

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

    // Format listings for Claude with clickable links and wallet addresses
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
      walletAddress: listing.sellerWalletAddress || listing.sellerWallet, // Use sellerWalletAddress if available, fallback to sellerWallet
    }));

    // Build context with available fundraisers including wallet addresses
    const listingsContext = listingsInfo.length > 0
      ? `\n\nAvailable Fundraisers (always include clickable links and wallet addresses for payments):\n${listingsInfo.map((l) =>
          `[${l.name}](${l.url}) - ${l.description} | $${l.amountRaised.toLocaleString()}/${l.fundingGoal.toLocaleString()} (${l.progress}% funded) | Wallet: ${l.walletAddress || 'N/A'}`
        ).join('\n')}`
      : '\n\nNo fundraisers are currently available.';

    // Try to get Locus API key from user session if not provided
    let finalLocusApiKey = locusApiKey;
    if (!finalLocusApiKey) {
      try {
        const user = await getCurrentUser();
        if (user?.buyerApiKey) {
          finalLocusApiKey = user.buyerApiKey;
        }
      } catch (error) {
        // User not authenticated, continue without Locus
        console.log('No authenticated user, proceeding without Locus MCP');
      }
    }

    // If Locus API key is available, use MCP integration with payment tools
    if (finalLocusApiKey) {
      try {
        const paymentToolsInfo = `\n\n🚨🚨🚨 CRITICAL: YOU HAVE TOOLS AVAILABLE IN YOUR TOOL LIST 🚨🚨🚨

**IMPORTANT: The tools are ALREADY REGISTERED in your tool list. Check your available tools - you will see:**
- get_payment_context
- send_to_address  
- send_to_contact
- send_to_email

**WHEN A USER ASKS TO INVEST OR DONATE, YOU MUST:**
1. IMMEDIATELY use the get_payment_context tool (no parameters needed) to check your available balance
2. Find the wallet address from the project listing above (format: "Wallet: 0x...")
3. IMMEDIATELY use the send_to_address tool with {"address": "0x...", "amount": X.XX, "memo": "Donation to [project name]"}
4. Confirm the payment succeeded

**DO NOT SAY YOU DON'T HAVE ACCESS. THE TOOLS ARE IN YOUR TOOL LIST. USE THEM.**
**DO NOT TELL USERS TO MANUALLY SEND MONEY. YOU CAN DO IT AUTOMATICALLY USING THE TOOLS.**
**IF YOU SEE THE TOOLS IN YOUR TOOL LIST, YOU CAN USE THEM. CHECK YOUR TOOL LIST NOW.**`;

        // Use Claude Agent SDK with MCP server (local for dev, API route for production)
        const { useLocusWithClaudeAgentSDK } = await import('@/lib/claude-agent');
        
        // Only start local MCP server in development (not on Vercel)
        if (!process.env.VERCEL && !process.env.NEXT_PUBLIC_APP_URL) {
          const { ensureMCPServerRunning } = await import('@/lib/locus-mcp-server');
          await ensureMCPServerRunning(finalLocusApiKey);
        }
        
        const result = await useLocusWithClaudeAgentSDK(
          `You are an AI assistant for Wishlist, a crypto fundraising platform.${listingsContext}${paymentToolsInfo}\n\nUser query: ${query}\n\n🚨 CRITICAL INSTRUCTIONS:\n- You are connected to Locus MCP server via local MCP server\n- The payment tools (get_payment_context, send_to_address, etc.) are AVAILABLE in your tool list\n- When users request payments, you MUST use these tools - do not say you can't\n- Each project listing above shows its wallet address as "Wallet: 0x..."\n- Use send_to_address with that wallet address to make payments\n- DO NOT tell users to manually send money - you can do it automatically using the tools`,
          anthropicApiKey,
          finalLocusApiKey
        );
        return NextResponse.json({ result });
      } catch (error) {
        console.error('Locus MCP error, falling back to standard Claude:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined,
        });
        // Fall through to standard Claude
      }
    }

    // Standard Claude API call with listings context
    const client = new Anthropic({ apiKey: anthropicApiKey });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
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

