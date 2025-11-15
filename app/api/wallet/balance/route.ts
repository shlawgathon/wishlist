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

    // Get buyer API key from user
    if (!user.buyerApiKey) {
      return NextResponse.json(
        { error: 'Buyer API key not configured. Please add your Locus API key in settings.' },
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
    let balance = '0.00';
    let budgetStatus = 'Unknown';
    const contacts: Array<{ number: number; email: string }> = [];

    if (typeof result === 'string') {
      // Parse the text response
      const balanceMatch = result.match(/Available Balance:\s*([\d.]+)\s*USDC/i);
      if (balanceMatch) {
        balance = balanceMatch[1];
      }

      const statusMatch = result.match(/Budget Status:\s*(\w+)/i);
      if (statusMatch) {
        budgetStatus = statusMatch[1];
      }

      // Parse whitelisted contacts
      const contactRegex = /(\d+)\.\s*([^\s(]+)\s*\(([^)]+)\)/g;
      let match;
      while ((match = contactRegex.exec(result)) !== null) {
        contacts.push({
          number: parseInt(match[1]),
          email: match[2],
        });
      }
    } else if (result.content && Array.isArray(result.content)) {
      // Handle content array format
      const textContent = result.content.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        const text = textContent.text;
        const balanceMatch = text.match(/Available Balance:\s*([\d.]+)\s*USDC/i);
        if (balanceMatch) {
          balance = balanceMatch[1];
        }

        const statusMatch = text.match(/Budget Status:\s*(\w+)/i);
        if (statusMatch) {
          budgetStatus = statusMatch[1];
        }
      }
    }

    return NextResponse.json({
      balance: parseFloat(balance),
      balanceFormatted: `$${balance} USDC`,
      budgetStatus,
      contacts,
      raw: result,
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

