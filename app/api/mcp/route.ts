/**
 * Vercel API route for MCP server
 * This handles MCP protocol requests in a serverless environment
 * 
 * Since Vercel is serverless, we can't run a long-running process,
 * but we can handle MCP requests on-demand through this API route.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLocusMCPServer } from '@/lib/locus-mcp-server';
import { getCurrentUser } from '@/lib/auth';
import { getUserByUsername } from '@/lib/users-store';
import { callLocusMCPTool } from '@/lib/locus-agent';

// Cache tool lists per user (in-memory, resets on cold start)
const toolCache = new Map<string, any[]>();

async function getToolsForUser(locusApiKey: string): Promise<any[]> {
  if (toolCache.has(locusApiKey)) {
    return toolCache.get(locusApiKey)!;
  }

  // Create server to get registered tools
  const server = await createLocusMCPServer(locusApiKey);
  
  // Get tools from the server's internal registry
  // The server has registered tools, but we need to extract them
  // For now, we'll return the built-in tools + fetch x402 tools
  const tools: any[] = [
    {
      name: 'get_payment_context',
      description: 'Get payment context including budget status and whitelisted contacts',
      inputSchema: {},
    },
    {
      name: 'send_to_address',
      description: 'Send USDC to any wallet address',
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Recipient wallet address (0x...)' },
          amount: { type: 'number', description: 'Amount in USDC to send' },
          memo: { type: 'string', description: 'Payment memo/description' },
        },
        required: ['address', 'amount', 'memo'],
      },
    },
    {
      name: 'send_to_contact',
      description: 'Send USDC to a whitelisted contact by contact number',
      inputSchema: {
        type: 'object',
        properties: {
          contact_number: { type: 'number', description: 'Contact number from whitelisted contacts' },
          amount: { type: 'number', description: 'Amount in USDC to send' },
          memo: { type: 'string', description: 'Payment memo/description' },
        },
        required: ['contact_number', 'amount', 'memo'],
      },
    },
    {
      name: 'send_to_email',
      description: 'Send USDC via escrow to an email address',
      inputSchema: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'Recipient email address' },
          amount: { type: 'number', description: 'Amount in USDC to send' },
          memo: { type: 'string', description: 'Payment memo/description (optional)' },
        },
        required: ['email', 'amount'],
      },
    },
  ];

  // Try to fetch x402 tools from Locus MCP server
  try {
    const response = await fetch('https://mcp.paywithlocus.com/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${locusApiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.result?.tools) {
        // Add x402 tools (excluding built-ins)
        const x402Tools = data.result.tools.filter((t: any) => 
          !['get_payment_context', 'send_to_address', 'send_to_contact', 'send_to_email'].includes(t.name)
        );
        tools.push(...x402Tools);
      }
    }
  } catch (error) {
    console.error('Failed to fetch x402 tools:', error);
  }

  toolCache.set(locusApiKey, tools);
  return tools;
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { jsonrpc: '2.0', error: { code: -32000, message: 'Unauthorized' }, id: null },
        { status: 401 }
      );
    }

    // Get user's Locus API key
    const fullUser = await getUserByUsername(user.username);
    const locusApiKey = fullUser?.buyerApiKey;
    
    if (!locusApiKey) {
      return NextResponse.json(
        { jsonrpc: '2.0', error: { code: -32000, message: 'Locus API key not configured' }, id: null },
        { status: 400 }
      );
    }

    // Parse JSON-RPC request
    const body = await request.json();
    
    // Handle JSON-RPC methods
    if (body.method === 'tools/list') {
      // List available tools
      const tools = await getToolsForUser(locusApiKey);
      return NextResponse.json({
        jsonrpc: '2.0',
        result: { tools },
        id: body.id,
      });
    } else if (body.method === 'tools/call') {
      // Call a tool
      const { name, arguments: args } = body.params;
      try {
        const result = await callLocusMCPTool(name, args || {}, locusApiKey);
        return NextResponse.json({
          jsonrpc: '2.0',
          result: {
            content: [
              {
                type: 'text',
                text: typeof result === 'string' ? result : JSON.stringify(result),
              },
            ],
          },
          id: body.id,
        });
      } catch (error) {
        return NextResponse.json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          id: body.id,
        });
      }
    } else if (body.method === 'initialize') {
      // Initialize MCP connection
      return NextResponse.json({
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            logging: {},
          },
          serverInfo: {
            name: 'locus',
            version: '1.0.0',
          },
        },
        id: body.id,
      });
    } else {
      return NextResponse.json({
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Method not found: ${body.method}`,
        },
        id: body.id,
      });
    }
  } catch (error) {
    console.error('MCP API route error:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
        id: null,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

