/**
 * Locus MCP Integration
 * Connects to Locus via Model Context Protocol (MCP)
 * 
 * Documentation: https://docs.payai.network/locus
 */

export interface LocusMCPConfig {
  apiKey: string;
  mcpUrl?: string;
}

/**
 * Configure Locus MCP connection
 */
export function getLocusMCPConfig(apiKey: string): LocusMCPConfig {
  return {
    apiKey,
    mcpUrl: 'https://mcp.paywithlocus.com/mcp',
  };
}

/**
 * Get MCP server configuration for Locus
 * According to https://docs.paywithlocus.com/mcp-spec
 * This is used with Claude Agent SDK's query function
 */
export function getLocusMCPServers(apiKey: string) {
  return {
    'locus': {
      type: 'http' as const,
      url: 'https://mcp.paywithlocus.com/mcp',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json, text/event-stream',
        'Content-Type': 'application/json',
      }
    }
  };
}

/**
 * Get allowed tools for Locus MCP
 * According to https://docs.paywithlocus.com/mcp-spec:
 * - Tools are auto-discovered from the MCP server at connection time
 * - Built-in tools: get_payment_context, send_to_contact, send_to_address, send_to_email, send_to_sms
 * - x402 tools are dynamically generated based on approved endpoints
 * 
 * Returns undefined to allow automatic tool discovery from the MCP server.
 * The canUseTool function will approve/disapprove tools based on their names.
 */
export function getLocusAllowedTools(): string[] | undefined {
  // Return undefined to allow all tools to be auto-discovered from the MCP server
  // The MCP server will provide the actual tool names, and canUseTool will approve them
  return undefined;
}

/**
 * Tool usage approval function for Locus
 * Allows Claude to use all Locus payment tools autonomously
 * According to https://docs.paywithlocus.com/mcp-spec:
 * - Tools are auto-discovered from the MCP server
 * - Built-in tools: get_payment_context, send_to_contact, send_to_address, send_to_email, send_to_sms
 * - x402 tools are dynamically generated
 * 
 * This function is called for each tool that the MCP server provides.
 * Since tools come from the Locus MCP server, we trust and allow them all.
 */
export async function canUseLocusTool(toolName: string, input: Record<string, unknown>) {
  // Normalize tool name - remove any prefixes to check base name
  const normalizedName = toolName
    .replace(/^mcp__locus__/, '')
    .replace(/^locus__/, '')
    .replace(/^mcp__/, '')
    .toLowerCase();
  
  // Built-in payment tools from https://docs.paywithlocus.com/mcp-spec
  const builtInTools = [
    'get_payment_context',
    'send_to_contact',
    'send_to_address',
    'send_to_email',
    'send_to_sms',
  ];
  
  // Check if it's a built-in tool
  const isBuiltInTool = builtInTools.includes(normalizedName);
  
  // x402 tools are dynamically generated - they follow naming patterns from endpoint URLs
  // Examples: forecast, get_headlines, price_data, etc.
  const isX402Tool = normalizedName.match(/^[a-z][a-z0-9_]*$/) && !isBuiltInTool;
  
  // MCP resource tools (for listing/reading resources)
  const isMCPResourceTool = toolName.includes('list_resources') || toolName.includes('read_resource');
  
  // Allow if:
  // 1. It's a built-in payment tool
  // 2. It's an x402 tool (dynamically generated)
  // 3. It's an MCP resource tool
  // 4. It contains "locus" in the name (from Locus MCP server)
  // 5. It's a simple alphanumeric name (likely an x402 tool)
  const shouldAllow = isBuiltInTool || isX402Tool || isMCPResourceTool || 
                      toolName.toLowerCase().includes('locus') ||
                      (normalizedName.match(/^[a-z][a-z0-9_]*$/) && normalizedName.length > 0);
  
  if (shouldAllow) {
    console.log(`✅ Allowing Claude to use Locus tool: ${toolName}`, { 
      normalizedName, 
      isBuiltInTool,
      isX402Tool,
      input 
    });
    return {
      behavior: 'allow' as const,
      updatedInput: input
    };
  }
  
  // Deny unknown tools for security (should rarely happen if tools come from Locus MCP server)
  console.warn(`❌ Denying unknown tool: ${toolName} (normalized: ${normalizedName})`);
  return {
    behavior: 'deny' as const,
    message: `Tool ${toolName} is not allowed. Only Locus payment tools are permitted.`
  };
}

