import { NextRequest, NextResponse } from 'next/server';
import { getLocusMCPServers } from '@/lib/locus-mcp';
import { getCurrentUser } from '@/lib/auth';

/**
 * Test endpoint to verify MCP server connection
 * GET /api/test-mcp
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!user.buyerApiKey) {
      return NextResponse.json(
        { error: 'Locus Wallet Agent API key not configured' },
        { status: 400 }
      );
    }

    // Get MCP server configuration
    const mcpServers = getLocusMCPServers(user.buyerApiKey);
    
    // Test connection to MCP server
    try {
      const response = await fetch(mcpServers.locus.url, {
        method: 'POST',
        headers: {
          ...mcpServers.locus.headers,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        }),
      });

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `MCP server returned status ${response.status}`,
          status: response.status,
          statusText: response.statusText,
          mcpUrl: mcpServers.locus.url,
        });
      }

      const data = await response.json();
      
      return NextResponse.json({
        success: true,
        mcpUrl: mcpServers.locus.url,
        response: data,
        tools: data.result?.tools || [],
        toolCount: data.result?.tools?.length || 0,
      });
    } catch (fetchError) {
      return NextResponse.json({
        success: false,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        mcpUrl: mcpServers.locus.url,
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
      });
    }
  } catch (error) {
    console.error('Test MCP error:', error);
    return NextResponse.json(
      {
        error: 'Failed to test MCP connection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

