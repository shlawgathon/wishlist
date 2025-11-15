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
      model: 'claude-3-5-sonnet-20241022',
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
      model: 'claude-3-5-sonnet-20241022',
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
 * Use Claude Agent SDK with Locus MCP for autonomous payments
 * This enables Claude to directly use Locus tools via MCP
 * 
 * @export
 * @param {string} prompt - The prompt to send to Claude
 * @param {string} anthropicApiKey - Anthropic API key
 * @param {string} locusApiKey - Locus API key for MCP
 * @returns {Promise<string>} The response from Claude
 */
export async function useLocusWithClaude(
  prompt: string,
  anthropicApiKey: string,
  locusApiKey: string
): Promise<string> {
  try {
    const mcpServers = getLocusMCPServers(locusApiKey);
    const options = {
      mcpServers,
      allowedTools: getLocusAllowedTools(),
      apiKey: anthropicApiKey,
      canUseTool: canUseLocusTool,
    };

    // Helper function to extract text from various result structures
    function extractTextFromResult(result: any): string {
      if (!result) return '';
      
      // If it's already a string
      if (typeof result === 'string') {
        // Check if it's a JSON-encoded string (starts and ends with quotes)
        if (result.startsWith('"') && result.endsWith('"')) {
          try {
            return JSON.parse(result);
          } catch {
            return result;
          }
        }
        return result;
      }
      
      // Try various object structures
      if (result.content?.[0]?.text) {
        return result.content[0].text;
      }
      if (result.text) {
        return result.text;
      }
      if (result.message) {
        return result.message;
      }
      if (Array.isArray(result) && result[0]?.text) {
        return result[0].text;
      }
      
      // Last resort: convert to string without JSON.stringify to avoid quotes
      return String(result);
    }

    let finalResult: string = '';
    let hasResult = false;
    
    try {
      for await (const message of query({
        prompt,
        options
      })) {
        hasResult = true;
        
        // Handle different message types
        if (message.type === 'result') {
          if ((message as any).subtype === 'success') {
            const result = (message as any).result;
            const extracted = extractTextFromResult(result);
            if (extracted) {
              finalResult = extracted;
            }
          } else if ((message as any).subtype === 'error') {
            const errorMsg = (message as any).error || (message as any).message || 'Unknown error';
            console.error('Claude Agent SDK error:', errorMsg);
            throw new Error(`Claude Agent SDK error: ${errorMsg}`);
          }
        } else if ((message as any).type === 'text') {
          // Direct text message
          const text = (message as any).text || (message as any).content || '';
          if (text) {
            finalResult = text;
          }
        } else if ((message as any).type === 'content' && (message as any).content) {
          // Content block message
          const content = (message as any).content;
          if (typeof content === 'string') {
            finalResult = content;
          } else if (content?.text) {
            finalResult = content.text;
          } else if (Array.isArray(content) && content[0]?.text) {
            finalResult = content[0].text;
          }
        } else if ((message as any).content) {
          // Handle content blocks directly
          const content = (message as any).content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text' && block.text) {
                finalResult = block.text;
                break;
              }
            }
          }
        }
      }

      if (!hasResult) {
        console.warn('Claude Agent SDK query returned no messages');
        return 'No response generated';
      }

      if (!finalResult) {
        console.warn('Claude Agent SDK query completed but no text content was extracted');
        return 'No response generated';
      }

      return finalResult;
    } catch (iterError) {
      // If the error is from the query iteration itself, wrap it
      if (iterError instanceof Error) {
        console.error('Error during Claude Agent SDK query iteration:', iterError.message);
        throw new Error(`Claude Agent SDK query failed: ${iterError.message}`);
      }
      throw iterError;
    }
  } catch (error) {
    console.error('Error using Locus with Claude:', error);
    throw error;
  }
}

