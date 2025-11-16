import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { callLocusMCPTool } from '@/lib/locus-agent';

/**
 * Get wallet balance using Locus MCP get_payment_context
 * GET /api/wallet/balance
 * 
 * According to https://docs.paywithlocus.com/mcp-spec:
 * - Tool: get_payment_context
 * - Scope: payment_context:read
 * - Returns: Budget status, available balance, whitelisted contacts, payment capabilities
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get Locus Wallet Agent API key from user
    if (!user.buyerApiKey) {
      return NextResponse.json(
        { error: 'Locus Wallet Agent API key not configured. Please add your Locus Wallet Agent API key in settings. When creating an agent in your wallet, make sure to select "Create API Key" so it can buy stuff.' },
        { status: 400 }
      );
    }

    // Call get_payment_context MCP tool
    const result = await callLocusMCPTool(
      'get_payment_context',
      {},
      user.buyerApiKey
    );

    // Parse the result (it's a string with formatted text)
    // According to https://docs.paywithlocus.com/mcp-spec, get_payment_context returns:
    // - Budget Status
    // - Available Balance (this is the spending limit, not a balance)
    // - Whitelisted contacts
    // - Payment capabilities
    let limit = '0.00';
    let budgetStatus = 'Unknown';
    const contacts: Array<{ number: number; email: string }> = [];
    let rawText = '';

    if (typeof result === 'string') {
      rawText = result;
    } else if (result.content && Array.isArray(result.content)) {
      // Handle content array format
      const textContent = result.content.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        rawText = textContent.text;
      }
    }

    if (rawText) {
      // Parse Available Balance (this is the spending limit)
      const balanceMatch = rawText.match(/Available Balance:\s*([\d.]+)\s*USDC/i);
      if (balanceMatch) {
        limit = balanceMatch[1];
      }

      // Parse Budget Status
      const statusMatch = rawText.match(/Budget Status:\s*(\w+)/i);
      if (statusMatch) {
        budgetStatus = statusMatch[1];
      }

      // Try to parse limit/budget from other possible formats
      const limitMatch = rawText.match(/(?:Limit|Budget|Max|Maximum):\s*([\d.]+)\s*USDC/i);
      if (limitMatch && !balanceMatch) {
        limit = limitMatch[1];
      }

      // Parse whitelisted contacts
      const contactRegex = /(\d+)\.\s*([^\s(]+)\s*\(([^)]+)\)/g;
      let match;
      while ((match = contactRegex.exec(rawText)) !== null) {
        contacts.push({
          number: parseInt(match[1]),
          email: match[2],
        });
      }
    }

    return NextResponse.json({
      limit: parseFloat(limit),
      limitFormatted: `$${limit} USDC`,
      budgetStatus,
      contacts,
      raw: result,
      rawText,
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch wallet balance', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

