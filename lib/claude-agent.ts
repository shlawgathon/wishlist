/**
 * Claude Agent SDK Wrapper
 * Handles AI agent operations for investment matching
 * Supports MCP (Model Context Protocol) for Locus integration
 */

import Anthropic from '@anthropic-ai/sdk';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { getLocusMCPServers, getLocusAllowedTools, canUseLocusTool } from './locus-mcp';

export interface InvestmentCriteria {
  budget: number;
  preferences: string; // Natural language preferences
  categories?: string[];
}

export interface ProjectRecommendation {
  projectId: string;
  title: string;
  description: string;
  score: number;
  matchReason: string;
  suggestedAmount: number;
}

export interface AgentMemory {
  investmentHistory: Array<{
    projectId: string;
    amount: number;
    timestamp: number;
  }>;
  successMetrics: {
    totalInvested: number;
    projectsBacked: number;
  };
}

let agentMemory: AgentMemory = {
  investmentHistory: [],
  successMetrics: {
    totalInvested: 0,
    projectsBacked: 0,
  },
};

/**
 * Initialize Claude client
 */
export function initClaudeAgent(apiKey: string): Anthropic {
  if (!apiKey) {
    throw new Error("Anthropic API key is required");
  }
  return new Anthropic({ apiKey });
}

/**
 * Parse user investment intent using Claude
 */
export async function parseInvestmentIntent(
  criteria: InvestmentCriteria,
  client: Anthropic
): Promise<{
  parsedBudget: number;
  categories: string[];
  preferences: Record<string, any>;
}> {
  const prompt = `Parse the following investment criteria and extract structured information:
  
Budget: $${criteria.budget}
Preferences: ${criteria.preferences}

Extract:
1. Total budget amount
2. Categories mentioned (e.g., tech, hardware, software, etc.)
3. Specific preferences or requirements

Return a JSON object with: parsedBudget, categories (array), and preferences (object).`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      // Parse the response (in production, use proper JSON parsing)
      return {
        parsedBudget: criteria.budget,
        categories: criteria.categories || [],
        preferences: { raw: criteria.preferences },
      };
    }
  } catch (error) {
    console.error('Error parsing investment intent:', error);
  }

  return {
    parsedBudget: criteria.budget,
    categories: criteria.categories || [],
    preferences: { raw: criteria.preferences },
  };
}

/**
 * Analyze and score projects using Claude
 */
export async function analyzeProjects(
  projects: Array<{
    id: string;
    title: string;
    description: string;
    category?: string;
  }>,
  criteria: InvestmentCriteria,
  client: Anthropic
): Promise<ProjectRecommendation[]> {
  const prompt = `Analyze the following projects and score them based on the investment criteria:

Investment Criteria:
- Budget: $${criteria.budget}
- Preferences: ${criteria.preferences}

Projects:
${projects.map((p, i) => `${i + 1}. ${p.title}: ${p.description}`).join('\n')}

For each project, provide:
1. A score from 0-100
2. Match reason
3. Suggested investment amount

Return as JSON array with: projectId, title, description, score, matchReason, suggestedAmount.`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      // In production, parse the JSON response properly
      // For MVP, return mock scored projects
      return projects.map((project) => ({
        projectId: project.id,
        title: project.title,
        description: project.description,
        score: Math.floor(Math.random() * 40) + 60, // 60-100
        matchReason: `Matches your interest in ${criteria.preferences}`,
        suggestedAmount: Math.floor(criteria.budget / projects.length),
      }));
    }
  } catch (error) {
    console.error('Error analyzing projects:', error);
  }

  // Fallback: return projects with default scores
  return projects.map((project) => ({
    projectId: project.id,
    title: project.title,
    description: project.description,
    score: 70,
    matchReason: 'Potential match based on criteria',
    suggestedAmount: Math.floor(criteria.budget / projects.length),
  }));
}

/**
 * Get agent memory
 */
export function getAgentMemory(): AgentMemory {
  return agentMemory;
}

/**
 * Update agent memory with new investment
 */
export function updateAgentMemory(projectId: string, amount: number): void {
  agentMemory.investmentHistory.push({
    projectId,
    amount,
    timestamp: Date.now(),
  });
  agentMemory.successMetrics.totalInvested += amount;
  agentMemory.successMetrics.projectsBacked += 1;
}

/**
 * Register tools for Claude agent
 * These tools can be called by Claude during conversations
 */
export function registerTools() {
  return [
    {
      name: 'query_x402_bazaar',
      description: 'Query the x402 Bazaar for available investment projects',
      input_schema: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          minFunding: { type: 'number' },
          maxFunding: { type: 'number' },
        },
      },
    },
    {
      name: 'analyze_project',
      description: 'Analyze a project for investment potential',
      input_schema: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          criteria: { type: 'object' },
        },
      },
    },
    {
      name: 'execute_investment',
      description: 'Execute an investment in a project',
      input_schema: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          amount: { type: 'number' },
        },
      },
    },
  ];
}

/**
 * Use Claude with Locus MCP tools using the official MCP connector API
 * According to https://docs.claude.com/en/docs/agents-and-tools/mcp-connector
 * 
 * @export
 * @param {string} prompt - The prompt to send to Claude
 * @param {string} anthropicApiKey - Anthropic API key
 * @param {string} locusApiKey - Locus API key for MCP authentication
 * @returns {Promise<string>} The response from Claude
 */
/**
 * Test MCP server connection and verify tools are available
 */
async function verifyMCPConnection(locusApiKey: string): Promise<{ success: boolean; tools?: any[]; error?: string }> {
  try {
    const response = await fetch('https://mcp.paywithlocus.com/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${locusApiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    if (data.error) {
      return { success: false, error: data.error.message || JSON.stringify(data.error) };
    }

    const tools = data.result?.tools || [];
    return { success: true, tools };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Use Claude Agent SDK with local Locus MCP server
 * This creates a local MCP server that wraps Locus MCP and connects it to Claude
 * @param locusApiKey - Locus Buyer API key (buyerApiKey) for authentication
 */
export async function useLocusWithClaudeAgentSDK(
  prompt: string,
  anthropicApiKey: string,
  locusApiKey: string
): Promise<string> {
  // Skip MCP on Vercel - only use for local development
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_URL;
  
  if (isVercel) {
    // On Vercel, fall back to regular Claude API without MCP
    console.log('⚠️ Running on Vercel - skipping MCP, using standard Claude API');
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: anthropicApiKey });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    const textContent = message.content.find((c: any) => c.type === 'text');
    return textContent && 'text' in textContent ? textContent.text : 'No response';
  }
  
  // Declare mcpClient outside try block so it's accessible in catch
  let mcpClient: any = null;
  
  try {
    // Import MCP client to connect to local server
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const Anthropic = (await import('@anthropic-ai/sdk')).default;

    // Connect to local MCP server for development
    let MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:7001';
    
    if (!MCP_SERVER_URL) {
      throw new Error('MCP_SERVER_URL not configured');
    }
    
    console.log(`🔌 Connecting to local MCP server at ${MCP_SERVER_URL}...`);
    
    // Add a unique session parameter to ensure each connection gets a fresh session
    const { randomUUID } = await import('node:crypto');
    const sessionParam = randomUUID();
    const mcpUrl = new URL(MCP_SERVER_URL);
    mcpUrl.searchParams.set('session', sessionParam);
    
    const transport = new StreamableHTTPClientTransport(mcpUrl);
    
    mcpClient = new Client({
      name: 'wishlist-claude-agent',
      version: '1.0.0',
    }, {
      capabilities: {},
    });

    try {
      await mcpClient.connect(transport);
      console.log('✅ Connected to local MCP server');
    } catch (connectError: any) {
      // If connection fails with "already initialized", the server session might be reused
      // This can happen if the server maintains state. Try to continue anyway by checking
      // if we can still list tools (which doesn't require initialization)
      if (connectError?.message?.includes('already initialized') || 
          connectError?.message?.includes('Server already initialized')) {
        console.log('⚠️ Server reports already initialized, attempting to continue...');
        // Try to list tools to see if the connection actually works
        try {
          const testTools = await mcpClient.listTools();
          if (testTools.tools && testTools.tools.length > 0) {
            console.log('✅ Connection works despite initialization error, continuing...');
            // Connection is actually functional, continue
          } else {
            throw new Error('Connection failed: server initialized but no tools available');
          }
        } catch (testError) {
          // If we can't list tools, the connection is truly broken
          try {
            await mcpClient.close();
          } catch (closeError) {
            // Ignore close errors
          }
          throw new Error('MCP server session conflict. Please try again.');
        }
      } else {
        throw connectError;
      }
    }

    // Get available tools from MCP server
    const toolsResponse = await mcpClient.listTools();
    const tools = toolsResponse.tools || [];
    console.log(`✅ Found ${tools.length} tools from MCP server:`, tools.map((t: any) => t.name));
    
    if (tools.length === 0) {
      console.error('❌ No tools found from MCP server!');
      throw new Error('No tools available from MCP server');
    }

    // Convert MCP tools to Claude tool format
    const { zodToJsonSchema } = await import('zod-to-json-schema');
    
    const claudeTools = tools.map((tool: any) => {
      // Convert Zod schema to JSON schema if needed
      let inputSchema: any = tool.inputSchema;
      
      // Check if it's a Zod schema (has _def property)
      if (inputSchema && typeof inputSchema === 'object' && '_def' in inputSchema) {
        try {
          // Convert Zod schema to JSON Schema
          inputSchema = zodToJsonSchema(inputSchema, {
            target: 'openApi3',
            $refStrategy: 'none',
          });
        } catch (e) {
          console.warn(`Failed to convert Zod schema for ${tool.name}, using default:`, e);
          inputSchema = { type: 'object', properties: {} };
        }
      }
      
      // If inputSchema is still not a valid JSON Schema, use default
      if (!inputSchema || typeof inputSchema !== 'object' || !('type' in inputSchema)) {
        inputSchema = { type: 'object', properties: {} };
      }
      
      return {
        name: tool.name,
        description: tool.description || `Call ${tool.name} via Locus MCP`,
        input_schema: inputSchema,
      };
    });
    
    console.log(`📋 Converted ${claudeTools.length} tools for Claude:`, claudeTools.map((t: any) => ({ name: t.name, description: t.description })));

    // Create Claude client
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const messages: any[] = [{ role: 'user', content: prompt }];
    let maxIterations = 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      // Send message to Claude with tools
      const requestBody = {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages,
        tools: claudeTools,
      };
      
      console.log('📤 Sending to Claude with tools:', {
        model: requestBody.model,
        messageCount: messages.length,
        toolCount: claudeTools.length,
        toolNames: claudeTools.map((t: any) => t.name),
      });
      
      const response = await anthropic.messages.create(requestBody);

      console.log('📨 Claude response:', {
        stopReason: response.stop_reason,
        contentBlockCount: response.content.length,
        hasToolUse: response.content.some((c: any) => c.type === 'tool_use'),
        contentTypes: response.content.map((c: any) => c.type),
      });
      
      // Log if Claude says it doesn't have access
      const textBlocks = response.content.filter((c: any) => c.type === 'text');
      if (textBlocks.length > 0) {
        const text = (textBlocks[0] as any).text.toLowerCase();
        if (text.includes("don't have access") || text.includes("cannot") || text.includes("unable") || text.includes("no access")) {
          console.error('❌ Claude says it does not have access to tools!');
          console.error('📋 Response text:', (textBlocks[0] as any).text.substring(0, 500));
          console.error('🔍 Available tools were:', claudeTools.map((t: any) => t.name));
        }
      }

      // Add assistant response to conversation
      messages.push({
        role: 'assistant',
        content: response.content,
      });

      // Check if Claude wants to use a tool
      const toolUseBlocks = response.content.filter(
        (c: any) => c.type === 'tool_use'
      ) as Array<{ type: 'tool_use'; id: string; name: string; input: any }>;

      if (toolUseBlocks.length === 0) {
        // No tools to use, return the text response
        const textBlocks = response.content.filter((c: any) => c.type === 'text');
        let result: string;
        if (textBlocks.length > 0) {
          result = (textBlocks[0] as any).text;
        } else {
          result = 'No response generated';
        }
        // Close client before returning
        try {
          await mcpClient.close();
        } catch (closeError) {
          // Ignore close errors
        }
        return result;
      }

      // Execute tool calls via MCP client
      const toolResults: any[] = [];

      for (const toolUse of toolUseBlocks) {
        console.log(`🔧 Claude calling tool: ${toolUse.name}`, toolUse.input);

        try {
          // Call tool via MCP client
          const result = await mcpClient.callTool({
            name: toolUse.name,
            arguments: toolUse.input,
          });

          console.log(`✅ Tool ${toolUse.name} executed successfully`);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.content || result),
              },
            ],
          });
        } catch (error) {
          console.error(`❌ Error calling tool ${toolUse.name}:`, error);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            is_error: true,
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          });
        }
      }

      // Add tool results to conversation
      messages.push({
        role: 'user',
        content: toolResults,
      });
    }

    // Close client before returning
    try {
      await mcpClient.close();
    } catch (closeError) {
      // Ignore close errors
    }
    return 'Maximum iterations reached. Please try again.';
  } catch (error) {
    console.error('Error using Locus MCP with Claude Agent SDK:', error);
    // Try to close client on error if it was initialized
    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch (closeError) {
        // Ignore close errors
      }
    }
    throw error;
  }
}

export async function useLocusWithClaude(
  prompt: string,
  anthropicApiKey: string,
  locusApiKey: string
): Promise<string> {
  try {
    // First, verify MCP server connection and tool availability
    console.log('🔍 Verifying MCP server connection...');
    const verification = await verifyMCPConnection(locusApiKey);
    
    if (!verification.success) {
      console.error('❌ MCP server verification failed:', verification.error);
      throw new Error(`MCP server connection failed: ${verification.error}`);
    }
    
    console.log(`✅ MCP server verified! Found ${verification.tools?.length || 0} tools:`, 
      verification.tools?.map((t: any) => t.name));
    
    // Configure Locus MCP server according to https://docs.claude.com/en/docs/agents-and-tools/mcp-connector
    // According to https://docs.paywithlocus.com/mcp-spec and https://docs.claude.com/en/docs/agents-and-tools/remote-mcp-servers
    const mcpServerConfig = {
      type: 'url' as const,
      url: 'https://mcp.paywithlocus.com/mcp', // MCP server endpoint
      name: 'locus',
      authorization_token: locusApiKey, // Bearer token (API key with locus_ prefix)
      tool_configuration: {
        enabled: true,
        // allowed_tools: undefined means all tools are allowed
      },
    };
    
    console.log('🔌 MCP Server Configuration:', {
      url: mcpServerConfig.url,
      name: mcpServerConfig.name,
      hasAuth: !!mcpServerConfig.authorization_token,
      authPrefix: mcpServerConfig.authorization_token?.substring(0, 10) + '...',
      verifiedTools: verification.tools?.length || 0,
    });

    // Use Anthropic Messages API with MCP connector
    // Requires beta header: "anthropic-beta": "mcp-client-2025-04-04"
    const client = new Anthropic({ 
      apiKey: anthropicApiKey,
      defaultHeaders: {
        'anthropic-beta': 'mcp-client-2025-04-04',
      },
    });

    const messages: any[] = [{ role: 'user', content: prompt }];
    let maxIterations = 10; // Prevent infinite loops
    let iteration = 0;
    
    while (iteration < maxIterations) {
      iteration++;
      
      // Create message with MCP server configuration
      // According to https://docs.claude.com/en/docs/agents-and-tools/mcp-connector
      // mcp_servers is a beta feature, so we need to cast to any to bypass TypeScript
      // The MCP connector automatically discovers tools from the server
      const requestBody = {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages,
        mcp_servers: [mcpServerConfig],
      };
      
      console.log('📤 Sending request to Claude with MCP servers:', {
        model: requestBody.model,
        messageCount: messages.length,
        mcpServerCount: requestBody.mcp_servers.length,
        mcpServerUrl: requestBody.mcp_servers[0].url,
      });
      
      const response = await client.messages.create(requestBody as any);
      
      // Log response structure (but not full content to avoid spam)
      console.log('📨 Claude response received:', {
        stopReason: response.stop_reason,
        contentBlockCount: response.content.length,
        contentBlockTypes: response.content.map((c: any) => c.type),
        hasToolUse: response.content.some((c: any) => c.type === 'mcp_tool_use' || c.type === 'tool_use'),
      });
      
      // Add assistant's response to conversation
      messages.push({
        role: 'assistant',
        content: response.content,
      });
      
      // Check if Claude wants to use an MCP tool
      // According to docs, MCP tools return as "mcp_tool_use" blocks
      // Also check for regular "tool_use" blocks in case the format is different
      const allContent = response.content as any[];
      const mcpToolUseBlocks = allContent.filter(
        (block: any) => block.type === 'mcp_tool_use' || (block.type === 'tool_use' && block.name)
      ) as Array<{ 
        type: 'mcp_tool_use' | 'tool_use'; 
        id: string; 
        name: string; 
        server_name?: string;
        input: any;
      }>;
      
      console.log(`🔍 Found ${mcpToolUseBlocks.length} tool use blocks:`, mcpToolUseBlocks.map((t: any) => ({ type: t.type, name: t.name })));
      
      if (mcpToolUseBlocks.length === 0) {
        // Check if Claude said it doesn't have access - if so, log a warning
        const textBlocks = allContent.filter(
          (block: any) => block.type === 'text'
        ) as Array<{ type: 'text'; text: string }>;
        
        if (textBlocks.length > 0) {
          const text = textBlocks[0].text.toLowerCase();
          if (text.includes("don't have access") || text.includes("cannot") || text.includes("unable") || text.includes("no access")) {
            console.error('❌ Claude says it does not have access to tools! Response:', textBlocks[0].text);
            console.error('📋 Full response content:', JSON.stringify(response.content, null, 2));
          }
          return textBlocks[0].text;
        }
        return 'No response generated';
      }
      
      // Execute MCP tool calls
      // Note: With the MCP connector, Claude handles tool execution automatically
      // But we need to provide tool results in the next message
      const toolResults: any[] = [];
      
      for (const toolUse of mcpToolUseBlocks) {
        const toolName = toolUse.name;
        const serverName = toolUse.server_name || 'locus';
        console.log(`🔧 Claude calling Locus MCP tool: ${toolName} from server ${serverName}`, toolUse.input);
        
        // Import callLocusMCPTool to execute the tool
        const { callLocusMCPTool } = await import('./locus-agent');
        
        try {
          // Call the MCP tool directly
          const result = await callLocusMCPTool(
            toolName,
            toolUse.input,
            locusApiKey
          );
          
          console.log(`✅ Tool ${toolName} executed successfully:`, result);
          
          // Format result according to MCP tool result block format
          toolResults.push({
            type: 'mcp_tool_result',
            tool_use_id: toolUse.id,
            is_error: false,
            content: [
              {
                type: 'text',
                text: typeof result === 'string' ? result : JSON.stringify(result),
              },
            ],
          });
        } catch (error) {
          console.error(`❌ Error calling MCP tool ${toolName}:`, error);
          toolResults.push({
            type: 'mcp_tool_result',
            tool_use_id: toolUse.id,
            is_error: true,
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          });
        }
      }
      
      // Add tool results to conversation for next iteration
      messages.push({
        role: 'user',
        content: toolResults,
      });
    }
    
    return 'Maximum iterations reached. Please try again.';
  } catch (error) {
    console.error('Error using Locus MCP with Claude:', error);
    // Fall back to standard Claude API if MCP fails
    try {
      const client = new Anthropic({ apiKey: anthropicApiKey });
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      const textContent = message.content.find((c: any) => c.type === 'text');
      return textContent && 'text' in textContent ? textContent.text : 'No response';
    } catch (fallbackError) {
      throw new Error(`MCP and fallback both failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

