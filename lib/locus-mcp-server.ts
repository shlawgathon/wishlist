/**
 * Local MCP Server wrapping Locus MCP spec
 * This server proxies to the remote Locus MCP server and exposes tools to Claude Agent SDK
 * 
 * Documentation:
 * - https://docs.paywithlocus.com/mcp-spec
 * - https://docs.claude.com/en/docs/agents-and-tools/mcp-connector
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { callLocusMCPTool } from './locus-agent';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const LOCUS_MCP_URL = 'https://mcp.paywithlocus.com/mcp';

/**
 * Create and configure the Locus MCP server
 * @param locusApiKey - Locus Buyer API key (buyerApiKey) for authentication
 */
export async function createLocusMCPServer(locusApiKey: string) {
  const server = new McpServer(
    {
      name: 'locus',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        logging: {},
      },
    }
  );

  // Fetch available tools from Locus MCP server
  let locusTools: any[] = [];
  try {
    console.log('🔍 Fetching tools from remote Locus MCP server...');
    const response = await fetch(LOCUS_MCP_URL, {
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
        locusTools = data.result.tools;
        console.log(`✅ Discovered ${locusTools.length} tools from Locus MCP server:`, locusTools.map((t: any) => t.name));
      } else {
        console.warn('⚠️ No tools found in Locus MCP server response:', data);
      }
    } else {
      console.error(`❌ Locus MCP server returned ${response.status}:`, await response.text().catch(() => 'Unknown error'));
    }
  } catch (error) {
    console.error('❌ Failed to fetch tools from Locus MCP server:', error);
    console.error('This is OK - we will still register built-in payment tools');
  }

  // Register built-in payment tools
  console.log('📝 Registering built-in payment tools...');
  
  server.registerTool('get_payment_context', {
    title: 'Get Payment Context',
    description: 'Get payment context including budget status and whitelisted contacts',
    inputSchema: {},
  }, async (_args: any, _extra: any) => {
    try {
      console.log('🔧 Calling Locus MCP tool: get_payment_context');
      const result = await callLocusMCPTool('get_payment_context', {}, locusApiKey);
      return {
        content: [
          {
            type: 'text' as const,
            text: typeof result === 'string' ? result : JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  });

  server.registerTool('send_to_address', {
    title: 'Send to Address',
    description: 'Send USDC to any wallet address',
    inputSchema: {
      address: z.string().describe('Recipient wallet address (0x...)'),
      amount: z.number().describe('Amount in USDC to send'),
      memo: z.string().describe('Payment memo/description'),
    },
  }, async ({ address, amount, memo }) => {
    try {
      console.log(`🔧 Calling Locus MCP tool: send_to_address`, { address, amount, memo });
      const result = await callLocusMCPTool('send_to_address', { address, amount, memo }, locusApiKey);
      return {
        content: [
          {
            type: 'text' as const,
            text: typeof result === 'string' ? result : JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  });

  server.registerTool('send_to_contact', {
    title: 'Send to Contact',
    description: 'Send USDC to a whitelisted contact by contact number',
    inputSchema: {
      contact_number: z.number().describe('Contact number from whitelisted contacts'),
      amount: z.number().describe('Amount in USDC to send'),
      memo: z.string().describe('Payment memo/description'),
    },
  }, async ({ contact_number, amount, memo }) => {
    try {
      console.log(`🔧 Calling Locus MCP tool: send_to_contact`, { contact_number, amount, memo });
      const result = await callLocusMCPTool('send_to_contact', { contact_number, amount, memo }, locusApiKey);
      return {
        content: [
          {
            type: 'text' as const,
            text: typeof result === 'string' ? result : JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  });

  server.registerTool('send_to_email', {
    title: 'Send to Email',
    description: 'Send USDC via escrow to an email address',
    inputSchema: {
      email: z.string().describe('Recipient email address'),
      amount: z.number().describe('Amount in USDC to send'),
      memo: z.string().optional().describe('Payment memo/description (optional)'),
    },
  }, async ({ email, amount, memo }) => {
    try {
      console.log(`🔧 Calling Locus MCP tool: send_to_email`, { email, amount, memo });
      const result = await callLocusMCPTool('send_to_email', { email, amount, memo }, locusApiKey);
      return {
        content: [
          {
            type: 'text' as const,
            text: typeof result === 'string' ? result : JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  });

  console.log(`✅ Registered 4 built-in payment tools: get_payment_context, send_to_address, send_to_contact, send_to_email`);
  
  // Register x402 tools dynamically from Locus MCP server
  console.log(`📝 Registering ${locusTools.length} x402 tools from Locus MCP server...`);
  for (const tool of locusTools) {
    // Skip if already registered as built-in
    if (['get_payment_context', 'send_to_address', 'send_to_contact', 'send_to_email'].includes(tool.name)) {
      console.log(`⏭️  Skipping ${tool.name} (already registered as built-in)`);
      continue;
    }

    // Convert tool schema to Zod schema
    const inputSchema: any = {};
    if (tool.inputSchema?.properties) {
      for (const [key, prop] of Object.entries(tool.inputSchema.properties as Record<string, any>)) {
        const propType = prop?.type;
        const propDesc = prop?.description || key;
        if (propType === 'string') {
          inputSchema[key] = z.string().describe(propDesc);
        } else if (propType === 'number') {
          inputSchema[key] = z.number().describe(propDesc);
        } else if (propType === 'boolean') {
          inputSchema[key] = z.boolean().describe(propDesc);
        } else {
          inputSchema[key] = z.any().describe(propDesc);
        }
      }
    }

    server.registerTool(tool.name, {
      title: tool.name,
      description: tool.description || `Call ${tool.name} via Locus MCP`,
      inputSchema: Object.keys(inputSchema).length > 0 ? inputSchema : {},
    }, async (args: any, extra: any) => {
      try {
        console.log(`🔧 Calling Locus MCP x402 tool: ${tool.name}`, args);
        const result = await callLocusMCPTool(tool.name, args || {}, locusApiKey);
        return {
          content: [
            {
              type: 'text' as const,
              text: typeof result === 'string' ? result : JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
    console.log(`✅ Registered x402 tool: ${tool.name}`);
  }

  const x402ToolCount = locusTools.filter((t: any) => !['get_payment_context', 'send_to_address', 'send_to_contact', 'send_to_email'].includes(t.name)).length;
  console.log(`✅ MCP server created with ${4 + x402ToolCount} total tools`);
  
  return server;
}

let mcpServerInstance: { server: McpServer; transport: StreamableHTTPServerTransport; handleRequest: (req: IncomingMessage, res: ServerResponse) => Promise<void>; httpServer?: any } | null = null;
let mcpServerPort: number = 7001;

/**
 * Start the MCP server as an HTTP server
 * @param locusApiKey - Locus Buyer API key (buyerApiKey) for authentication
 * @param port - Port to run the server on (default: 7001)
 */
export async function startLocusMCPServer(
  locusApiKey: string,
  port: number = 7001
): Promise<{ server: McpServer; transport: StreamableHTTPServerTransport; handleRequest: (req: IncomingMessage, res: ServerResponse) => Promise<void>; httpServer?: any }> {
  if (mcpServerInstance) {
    console.log('✅ MCP server already running');
    return mcpServerInstance;
  }

  const mcpServer = await createLocusMCPServer(locusApiKey);
  
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  await mcpServer.connect(transport);

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    await transport.handleRequest(req, res);
  };

  // Start HTTP server
  const http = await import('node:http');
  const httpServer = http.createServer(handleRequest);
  
  await new Promise<void>((resolve, reject) => {
    const serverListen = () => {
      httpServer.listen(port, () => {
        console.log(`✅ Locus MCP server running on http://localhost:${port}`);
        resolve();
      });
    };
    
    httpServer.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${port} is already in use. Attempting to use existing server...`);
        // Check if server is actually responding
        fetch(`http://localhost:${port}`, { method: 'GET', signal: AbortSignal.timeout(1000) })
          .then(() => {
            console.log(`✅ MCP server already running on port ${port}, reusing it`);
            // Store a dummy instance to prevent re-initialization
            mcpServerInstance = {
              server: mcpServer,
              transport,
              handleRequest,
              httpServer: null as any,
            };
            resolve();
          })
          .catch(() => {
            console.error(`❌ Port ${port} is in use but server is not responding. Please kill the process using port ${port} or use a different port.`);
            reject(error);
          });
      } else {
        reject(error);
      }
    });
    
    serverListen();
  });

  mcpServerPort = port;
  mcpServerInstance = {
    server: mcpServer,
    transport,
    handleRequest,
    httpServer,
  };

  return mcpServerInstance;
}

/**
 * Ensure MCP server is running, start it if not
 */
export async function ensureMCPServerRunning(locusApiKey: string): Promise<void> {
  if (mcpServerInstance && mcpServerInstance.httpServer) {
    console.log('✅ MCP server instance already exists');
    return;
  }

  // Check if server is already running
  try {
    const response = await fetch(`http://localhost:${mcpServerPort}`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    if (response.ok || response.status === 404) {
      console.log('✅ MCP server already running (detected via HTTP check)');
      // Create a dummy instance to prevent re-initialization
      if (!mcpServerInstance) {
        const mcpServer = await createLocusMCPServer(locusApiKey);
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });
        await mcpServer.connect(transport);
        mcpServerInstance = {
          server: mcpServer,
          transport,
          handleRequest: async () => {},
          httpServer: null as any,
        };
      }
      return;
    }
  } catch (error) {
    // Server not running, start it
    console.log('🚀 Starting MCP server...');
    try {
      await startLocusMCPServer(locusApiKey, mcpServerPort);
      console.log('✅ MCP server started successfully');
    } catch (startError: any) {
      // If port is in use, try to reuse existing server
      if (startError?.code === 'EADDRINUSE') {
        console.log('⚠️ Port in use, checking if existing server is functional...');
        try {
          const checkResponse = await fetch(`http://localhost:${mcpServerPort}`, {
            method: 'GET',
            signal: AbortSignal.timeout(1000),
          });
          if (checkResponse.ok || checkResponse.status === 404) {
            console.log('✅ Existing MCP server is functional, reusing it');
            // Create a dummy instance
            const mcpServer = await createLocusMCPServer(locusApiKey);
            const transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID(),
            });
            await mcpServer.connect(transport);
            mcpServerInstance = {
              server: mcpServer,
              transport,
              handleRequest: async () => {},
              httpServer: null as any,
            };
            return;
          }
        } catch (checkError) {
          console.error('❌ Existing server is not responding');
        }
      }
      console.error('❌ Failed to start MCP server:', startError);
      throw new Error(`Failed to start MCP server: ${startError instanceof Error ? startError.message : 'Unknown error'}`);
    }
  }
}

