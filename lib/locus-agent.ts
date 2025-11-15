/**
 * Locus Payment Agent Orchestrator
 * Handles payment orchestration and multi-step payment chains
 * 
 * Documentation: https://docs.payai.network/locus
 * Uses MCP (Model Context Protocol) for Locus integration
 */

import { signTransaction, WalletInfo } from './cdp-wallet';
import { createPaymentHeader, requestWithPayment, extractPaymentRequirements } from './x402-client';
import { getLocusMCPServers } from './locus-mcp';

export interface InvestmentBatch {
  investments: Array<{
    projectId: string;
    amount: number;
    projectEndpoint: string;
    recipient: string; // Can be API key, email, or wallet address
    paymentMethod: 'agent' | 'email' | 'wallet' | 'x402';
  }>;
  buyerApiKey?: string; // Optional: Buyer agent's API key
}

export interface PaymentResult {
  projectId: string;
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface BatchPaymentResult {
  results: PaymentResult[];
  totalInvested: number;
  successful: number;
  failed: number;
}

// Locus API configuration
const LOCUS_API_BASE = 'https://api.payai.network';
const LOCUS_MCP_URL = 'https://mcp.paywithlocus.com/mcp';
const LOCUS_NETWORK = 'base-mainnet'; // Base Mainnet as per documentation

/**
 * Locus Wallet Info
 */
export interface LocusWalletInfo {
  walletId: string;
  address: string;
  network: string;
}

/**
 * Initialize Locus payment agent with API key
 * 
 * Buyer API Key is used for making payments (investments)
 * Note: Agents can only send payments, not receive them. Only wallets can receive payments.
 */
export function initLocusAgent(config: {
  buyerApiKey?: string;
}) {
  if (!config.buyerApiKey) {
    console.warn('Locus buyer API key not provided, using mock mode');
  } else {
    console.log('Locus buyer agent initialized');
  }
  
  // Get MCP configuration if buyer API key is provided
  const mcpServers = config.buyerApiKey ? getLocusMCPServers(config.buyerApiKey) : undefined;

  return {
    buyerApiKey: config.buyerApiKey,
    apiBase: LOCUS_API_BASE,
    mcpUrl: LOCUS_MCP_URL,
    network: LOCUS_NETWORK,
    mcpServers,
  };
}

/**
 * Get agent ID from API key
 * Each API key represents an agent that must be manually created on Locus
 */
export function getAgentIdFromApiKey(apiKey: string): string {
  // Extract agent identifier from API key
  // Format: locus_dev_<agentId> or locus_<agentId>
  if (apiKey.startsWith('locus_dev_')) {
    return apiKey.replace('locus_dev_', '');
  } else if (apiKey.startsWith('locus_')) {
    return apiKey.replace('locus_', '');
  }
  // Fallback: use hash of API key as agent ID
  return apiKey.substring(0, 16);
}

/**
 * Call Locus MCP tool using JSON-RPC 2.0 protocol
 * Documentation: https://docs.paywithlocus.com/mcp-spec
 */
export async function callLocusMCPTool(
  toolName: string,
  params: Record<string, any>,
  apiKey: string
): Promise<any> {
  if (!apiKey) {
    throw new Error('API key is required for MCP tool calls');
  }

  const mcpRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: params,
    },
  };

  const response = await fetch(LOCUS_MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(mcpRequest),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`MCP request failed: ${response.status} ${errorText}`);
  }

  // Check content type to determine if it's an event stream or JSON
  const contentType = response.headers.get('content-type') || '';
  const isEventStream = contentType.includes('text/event-stream');

  if (isEventStream) {
    // Parse Server-Sent Events (SSE) format
    const text = await response.text();
    console.log('MCP Event Stream Response (first 500 chars):', text.substring(0, 500));
    
    const lines = text.split('\n');
    let foundResult = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines, event type lines, and comment lines
      if (!trimmedLine || trimmedLine.startsWith('event:') || trimmedLine.startsWith(':')) {
        continue;
      }
      
      // Parse data lines (format: "data: {...}")
      if (trimmedLine.startsWith('data: ')) {
        const jsonStr = trimmedLine.substring(6); // Remove 'data: ' prefix
        let jsonData;
        
        try {
          jsonData = JSON.parse(jsonStr);
        } catch (parseError) {
          console.warn('Failed to parse data line as JSON:', trimmedLine.substring(0, 100));
          continue;
        }
        
        console.log('Parsed JSON-RPC from data line:', JSON.stringify(jsonData, null, 2));
        
        if (jsonData.error) {
          throw new Error(jsonData.error.message || `MCP tool call failed: ${JSON.stringify(jsonData.error)}`);
        }
        
        if (jsonData.result) {
          foundResult = true;
          // extractResult will throw if it finds an error message (e.g., Policy Violation)
          // Let it propagate up - don't catch it here
          return extractResult(jsonData.result);
        }
      } else {
        // Try parsing the line as direct JSON (some MCP servers return JSON without 'data:' prefix)
        try {
          const jsonData = JSON.parse(trimmedLine);
          console.log('Parsed JSON-RPC from direct line:', JSON.stringify(jsonData, null, 2));
          
          if (jsonData.error) {
            throw new Error(jsonData.error.message || `MCP tool call failed: ${JSON.stringify(jsonData.error)}`);
          }
          if (jsonData.result) {
            foundResult = true;
            return extractResult(jsonData.result);
          }
        } catch {
          // Not JSON, continue
          continue;
        }
      }
    }
    
    // If we got here, we didn't find a result
    console.error('Event stream parsing failed. Full response:', text);
    throw new Error(`Could not parse MCP event stream response. Response preview: ${text.substring(0, 200)}`);
  } else {
    // Standard JSON response
    const data = await response.json();
    
    if (data.error) {
      const errorMsg = data.error.message || JSON.stringify(data.error);
      throw new Error(`MCP tool call failed: ${errorMsg}`);
    }

    if (!data.result) {
      throw new Error('MCP tool call returned no result');
    }

    return extractResult(data.result);
  }
}

/**
 * Extract and parse result from MCP response
 * Handles content array format: {content: [{type: "text", text: "..."}]}
 */
function extractResult(result: any): any {
  // Handle content array format: {content: [{type: "text", text: "..."}]}
  if (result.content && Array.isArray(result.content)) {
    const textContent = result.content.find((c: any) => c.type === 'text');
    if (textContent?.text) {
      const text = textContent.text;
      
      // Check for actual error messages (not success messages)
      // Only throw if it's clearly an error, not if it contains "Payment" in a success context
      if (text.includes('❌') || 
          (text.includes('Failed') && !text.includes('✅')) ||
          text.includes('Policy Violation') ||
          text.includes('Error:') ||
          (text.includes('error') && text.toLowerCase().includes('error') && !text.includes('✅'))) {
        throw new Error(text);
      }
      
      // If it's a success message, try to extract transaction info
      if (text.includes('✅') || text.includes('Transaction ID') || text.includes('queued successfully')) {
        // Try to extract transaction ID from the text
        const txIdMatch = text.match(/Transaction ID[:\s]+([a-f0-9-]+)/i);
        const amountMatch = text.match(/Amount[:\s]+\$?([\d.]+)/i);
        const toMatch = text.match(/To[:\s]+(0x[a-fA-F0-9]{40})/i);
        
        return {
          transactionId: txIdMatch ? txIdMatch[1] : undefined,
          transactionHash: txIdMatch ? txIdMatch[1] : undefined,
          amount: amountMatch ? amountMatch[1] : undefined,
          recipientAddress: toMatch ? toMatch[1] : undefined,
          paymentStatus: 'queued',
          message: text,
        };
      }
      
      // Try to parse as JSON (some tools return JSON strings)
      try {
        return JSON.parse(text);
      } catch {
        // If not JSON, return as message
        return { message: text };
      }
    }
  }

  // Return result directly (standard format)
  return result;
}

/**
 * Send payment using Locus MCP tools
 * Supports multiple payment methods:
 * 1. Email addresses (escrow payments) - uses `send_to_email` tool
 * 2. Wallet addresses (direct transfers) - uses `send_to_address` tool
 * 3. Agent payments - uses `send_to_address` (requires wallet address, not API key)
 * 
 * Documentation: https://docs.paywithlocus.com/mcp-spec
 * 
 * Response formats:
 * - send_to_email: { transactionId, escrowId, amount, recipientEmail, paymentStatus }
 * - send_to_address: { transactionId, amount, recipientAddress, paymentStatus }
 */
async function sendLocusPayment(
  recipient: string, // Email address or wallet address (0x...)
  amount: string, // Amount in USDC smallest units (6 decimals)
  senderApiKey: string, // Required: Buyer agent's API key
  paymentMethod: 'agent' | 'email' | 'wallet' | 'x402' = 'wallet',
  metadata?: Record<string, any>
): Promise<{ transactionHash: string }> {
  if (!senderApiKey) {
    throw new Error('API key is required for MCP payments');
  }

  // Convert amount from smallest units (6 decimals) to USDC
  const amountInUSDC = parseFloat(amount) / 1e6;
  if (isNaN(amountInUSDC) || amountInUSDC <= 0) {
    throw new Error(`Invalid payment amount: ${amount}`);
  }

  const memo = metadata?.memo || metadata?.projectId || 'Payment via Wishlist';

  console.log('Sending Locus MCP payment:', {
    method: paymentMethod,
    recipient: recipient.substring(0, 20) + '...',
    amount: amountInUSDC,
    tool: paymentMethod === 'email' ? 'send_to_email' : 'send_to_address',
    apiKeyPrefix: senderApiKey.substring(0, 20) + '...',
  });

  let result;

  if (paymentMethod === 'email') {
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      throw new Error(`Invalid email address: ${recipient}`);
    }

    // Use send_to_email MCP tool
    // Requires: email_payments:write scope
    // Response: { transactionId, escrowId, amount, recipientEmail, paymentStatus }
    result = await callLocusMCPTool(
      'send_to_email',
      {
        email: recipient,
        amount: amountInUSDC,
        memo: memo,
      },
      senderApiKey
    );

    // Extract transaction ID from response
    if (!result.transactionId) {
      throw new Error('MCP send_to_email did not return transactionId');
    }
  } else if (paymentMethod === 'wallet' || paymentMethod === 'agent') {
    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      throw new Error(`Invalid wallet address format: ${recipient}`);
    }

    // Use send_to_address MCP tool
    // Requires: address_payments:write scope
    // Response: { transactionId, amount, recipientAddress, paymentStatus }
    result = await callLocusMCPTool(
      'send_to_address',
      {
        address: recipient,
        amount: amountInUSDC,
        memo: memo,
      },
      senderApiKey
    );

    console.log('send_to_address result:', JSON.stringify(result, null, 2));

    // Check if result contains an error message (but not success messages)
    if (result.message) {
      const msg = result.message;
      // Only treat as error if it's clearly an error, not a success message
      if ((msg.includes('❌') || 
           (msg.includes('Failed') && !msg.includes('✅')) ||
           msg.includes('Policy Violation') ||
           msg.includes('Error:')) &&
          !msg.includes('✅') &&
          !msg.includes('queued successfully') &&
          !msg.includes('Transaction ID')) {
        throw new Error(msg);
      }
    }

    // Extract transaction ID from response - check multiple possible field names
    const transactionId = result.transactionId || result.transactionHash || result.txHash || result.id || result.transaction_id;
    
    // If we have a success message with transaction info but no ID field, that's okay
    // The payment was queued successfully
    if (!transactionId && result.message && (result.message.includes('✅') || result.message.includes('queued successfully'))) {
      // Payment was queued but we couldn't extract the ID - this is still a success
      // Try to extract it from the message
      const txIdMatch = result.message.match(/Transaction ID[:\s]+([a-f0-9-]+)/i);
      if (txIdMatch) {
        return {
          transactionHash: txIdMatch[1],
        };
      }
      // If we still can't find it, log a warning but don't fail
      console.warn('Payment queued but transaction ID not found in response:', result);
      // Return a placeholder - the payment was still successful
      return {
        transactionHash: 'queued-' + Date.now(),
      };
    }
    
    if (!transactionId) {
      console.error('MCP send_to_address response:', result);
      
      // Provide helpful error message based on response
      if (result.message && !result.message.includes('✅') && !result.message.includes('queued successfully')) {
        throw new Error(`Payment failed: ${result.message}`);
      }
      
      // If we got here, the payment might have succeeded but no transaction ID was returned
      // This could mean the API key doesn't have the right scope
      throw new Error(`Payment failed: No transaction ID returned. Your API key may not have the 'address_payments:write' scope. Check your Locus dashboard to ensure your API key has the correct permissions.`);
    }
    
    // Update result to use the found transaction ID
    result.transactionId = transactionId;
  } else {
    throw new Error(`Unsupported payment method: ${paymentMethod}`);
  }

  console.log('Locus MCP payment result:', result);

  // Transaction ID is the transaction hash
  return {
    transactionHash: result.transactionId,
  };
}

/**
 * Execute a single payment for a project using Locus
 * Supports multiple payment methods: agent-to-agent, email, wallet, x402
 * 
 * @param projectId - Project/listing ID
 * @param amount - Payment amount in USDC
 * @param recipient - Recipient (API key, email, or wallet address)
 * @param paymentMethod - Payment method: 'agent', 'email', 'wallet', or 'x402'
 * @param buyerApiKey - Optional: Buyer agent's API key
 * @param projectEndpoint - Project API endpoint
 */
export async function executePayment(
  projectId: string,
  amount: number,
  recipient: string, // Can be API key, email, or wallet address
  paymentMethod: 'agent' | 'email' | 'wallet' | 'x402',
  buyerApiKey?: string, // Optional: Buyer agent's API key
  projectEndpoint?: string // Optional: For x402 payments
): Promise<PaymentResult> {
  try {
    let transactionHash: string;

    // Handle x402 API payments
    if (paymentMethod === 'x402' && projectEndpoint) {
      // Step 1: Make initial request to project API
      const initialResponse = await fetch(projectEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Step 2: Check for 402 Payment Required
      if (initialResponse.status === 402) {
        const paymentRequirements = extractPaymentRequirements(initialResponse);
        
        if (!paymentRequirements) {
          return {
            projectId,
            success: false,
            error: 'Could not extract payment requirements',
          };
        }

        // Use the actual payment amount from the checkout request, not the funding goal
        // The x402 endpoint returns fundingGoal, but we want the user's selected amount
        const paymentAmountToUse = amount; // Use the amount passed to executePayment
        const paymentRecipient = paymentRequirements['X-Payment-Recipient'] || recipient;
        
        // Step 3: Use Locus MCP to send payment to recipient address
        // x402 payments require sending USDC to the recipient address from the 402 response
        if (!buyerApiKey) {
          return {
            projectId,
            success: false,
            error: 'Buyer API key is required for x402 payments',
          };
        }

        if (!paymentRecipient || !/^0x[a-fA-F0-9]{40}$/.test(paymentRecipient)) {
          return {
            projectId,
            success: false,
            error: `Invalid payment recipient address from x402 response: ${paymentRecipient}`,
          };
        }

        console.log('x402 payment:', {
          requestedAmount: amount,
          x402HeaderAmount: paymentRequirements['X-Payment-Amount'],
          usingAmount: paymentAmountToUse,
          recipient: paymentRecipient.substring(0, 20) + '...',
        });

        const locusResult = await sendLocusPayment(
          paymentRecipient, // Use recipient address from 402 response
          (paymentAmountToUse * 1e6).toString(), // USDC has 6 decimals - use actual payment amount
          buyerApiKey,
          'wallet', // x402 payments use wallet address transfers
          {
            projectId,
            projectEndpoint,
            paymentScheme: paymentRequirements['X-Payment-Scheme'],
            memo: `x402 payment for project: ${projectId}`,
          }
        );
        
        transactionHash = locusResult.transactionHash;

        // Step 4: Create X-PAYMENT header
        const paymentHeader = createPaymentHeader(
          transactionHash,
          paymentRequirements['X-Payment-Scheme']
        );

        // Step 5: Retry request with payment header
        const paidResponse = await requestWithPayment(projectEndpoint, paymentHeader);

        if (paidResponse.ok || paidResponse.status === 200) {
          return {
            projectId,
            success: true,
            transactionHash,
          };
        } else {
          return {
            projectId,
            success: false,
            error: `Payment failed with status ${paidResponse.status}`,
          };
        }
      } else if (initialResponse.ok) {
        // No payment required
        return {
          projectId,
          success: true,
        };
      } else if (initialResponse.status === 404) {
        // Endpoint not found - fallback to direct payment using recipient
        console.warn(`x402 endpoint not found (404) for ${projectEndpoint}, falling back to direct wallet payment`);
        
        // Use recipient as wallet address for direct payment
        if (!buyerApiKey) {
          return {
            projectId,
            success: false,
            error: 'Buyer API key is required for payments',
          };
        }

        if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
          return {
            projectId,
            success: false,
            error: `Invalid recipient address for fallback payment: ${recipient}`,
          };
        }

        // Execute direct wallet payment
        const locusResult = await sendLocusPayment(
          recipient,
          (amount * 1e6).toString(), // USDC has 6 decimals
          buyerApiKey,
          'wallet',
          {
            projectId,
            memo: `Direct payment for project: ${projectId}`,
          }
        );

        return {
          projectId,
          success: true,
          transactionHash: locusResult.transactionHash,
        };
      } else {
        // x402 endpoint returned unexpected status
        return {
          projectId,
          success: false,
          error: `x402 endpoint returned unexpected status: ${initialResponse.status}`,
        };
      }
    }
    
    // Direct payment (email, wallet, or agent) - only reached if not x402
    if (!buyerApiKey) {
      return {
        projectId,
        success: false,
        error: 'Buyer API key is required for payments',
      };
    }

    const locusResult = await sendLocusPayment(
      recipient,
      (amount * 1e6).toString(), // USDC has 6 decimals
      buyerApiKey,
      paymentMethod,
      {
        projectId,
        memo: `Payment for project: ${projectId}`,
      }
    );
    
    return {
      projectId,
      success: true,
      transactionHash: locusResult.transactionHash,
    };
  } catch (error) {
    return {
      projectId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute batch investments using Locus
 * Processes multiple payments in sequence
 */
export async function executeBatchInvestments(
  batch: InvestmentBatch
): Promise<BatchPaymentResult> {
  const results: PaymentResult[] = [];
  let totalInvested = 0;
  let successful = 0;
  let failed = 0;

  // Process each investment sequentially
  for (const investment of batch.investments) {
    const result = await executePayment(
      investment.projectId,
      investment.amount,
      investment.recipient, // Can be API key, email, or wallet address
      investment.paymentMethod, // Payment method
      batch.buyerApiKey, // Optional: Buyer agent's API key
      investment.paymentMethod === 'x402' ? investment.projectEndpoint : undefined
    );

    results.push(result);

    if (result.success) {
      successful++;
      totalInvested += investment.amount;
    } else {
      failed++;
    }
  }

  return {
    results,
    totalInvested,
    successful,
    failed,
  };
}

/**
 * Track payment confirmations
 */
export async function confirmPayment(
  transactionHash: string,
  network: string = 'base'
): Promise<boolean> {
  // In production, this would query the blockchain to confirm the transaction
  // For MVP, return true after a short delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  return true;
}
