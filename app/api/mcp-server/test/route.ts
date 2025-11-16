import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensureMCPServerRunning, createLocusMCPServer } from '@/lib/locus-mcp-server';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/**
 * Test endpoint to verify local MCP server is running and has tools
 * GET /api/mcp-server/test
 * 
 * Uses the user's buyerApiKey (Locus Buyer API key) to start and test the MCP server
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
        { error: 'Locus Buyer API key (buyerApiKey) not configured' },
        { status: 400 }
      );
    }

    // Ensure server is running (using buyerApiKey as Locus API key)
    console.log('🔍 Ensuring MCP server is running with buyerApiKey...');
    await ensureMCPServerRunning(user.buyerApiKey);

    // Test connection to local MCP server
    const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:7001';
    
    try {
      console.log(`🔌 Connecting to local MCP server at ${MCP_SERVER_URL}...`);
      
      const transport = new StreamableHTTPClientTransport(
        new URL(MCP_SERVER_URL)
      );
      
      const mcpClient = new Client({
        name: 'test-client',
        version: '1.0.0',
      }, {
        capabilities: {},
      });

      await mcpClient.connect(transport);
      console.log('✅ Connected to local MCP server');

      // List tools
      const toolsResponse = await mcpClient.listTools();
      const tools = toolsResponse.tools || [];
      
      console.log(`✅ Found ${tools.length} tools:`, tools.map(t => t.name));

      await mcpClient.close();

      return NextResponse.json({
        success: true,
        mcpServerUrl: MCP_SERVER_URL,
        toolCount: tools.length,
        tools: tools.map(t => ({
          name: t.name,
          description: t.description,
          hasInputSchema: !!t.inputSchema,
        })),
      });
    } catch (fetchError) {
      console.error('❌ Error connecting to MCP server:', fetchError);
      return NextResponse.json({
        success: false,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        mcpServerUrl: MCP_SERVER_URL,
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
      });
    }
  } catch (error) {
    console.error('Test MCP server error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

