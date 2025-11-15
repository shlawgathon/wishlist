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
      }
    }
  };
}

/**
 * Get allowed tools for Locus MCP
 */
export function getLocusAllowedTools() {
  return [
    'mcp__locus__*',      // Allow all Locus tools
    'mcp__list_resources',
    'mcp__read_resource'
  ];
}

/**
 * Tool usage approval function for Locus
 */
export async function canUseLocusTool(toolName: string, input: Record<string, unknown>) {
  if (toolName.startsWith('mcp__locus__')) {
    return {
      behavior: 'allow' as const,
      updatedInput: input
    };
  }
  return {
    behavior: 'deny' as const,
    message: 'Only Locus tools are allowed'
  };
}

