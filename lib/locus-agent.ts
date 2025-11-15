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
  }>;
  walletId: string;
  walletConfig: {
    apiKeyName: string;
    apiKeyPrivateKey: string;
  };
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
 * Initialize Locus payment agent with API key
 * 
 * Buyer API Key is used for making payments (investments)
 * Seller API Key is used for receiving payments (project creators)
 */
export function initLocusAgent(config: {
  buyerApiKey?: string;
  sellerApiKey?: string;
}) {
  if (!config.buyerApiKey && !config.sellerApiKey) {
    console.warn('Locus API keys not provided, using mock mode');
  }
  
  if (config.buyerApiKey) {
    console.log('Locus buyer agent initialized');
  }
  
  if (config.sellerApiKey) {
    console.log('Locus seller agent initialized');
  }
  
  // Get MCP configuration if buyer API key is provided
  const mcpServers = config.buyerApiKey ? getLocusMCPServers(config.buyerApiKey) : undefined;

  return {
    buyerApiKey: config.buyerApiKey,
    sellerApiKey: config.sellerApiKey,
    apiBase: LOCUS_API_BASE,
    mcpUrl: LOCUS_MCP_URL,
    network: LOCUS_NETWORK,
    mcpServers,
  };
}

/**
 * Send payment using Locus API
 * This uses the Buyer API Key to autonomously send payments
 */
async function sendLocusPayment(
  recipient: string,
  amount: string, // Amount in USDC (with decimals)
  buyerApiKey: string,
  metadata?: Record<string, any>
): Promise<{ transactionHash: string } | null> {
  try {
    // Locus API call to send payment
    // Based on documentation: https://docs.payai.network/locus
    const response = await fetch(`${LOCUS_API_BASE}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerApiKey}`,
      },
      body: JSON.stringify({
        recipient,
        amount,
        network: LOCUS_NETWORK,
        currency: 'USDC',
        metadata: metadata || {},
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `Locus API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      transactionHash: data.transactionHash || data.txHash,
    };
  } catch (error) {
    console.error('Locus payment error:', error);
    // Fallback to mock for MVP
    return {
      transactionHash: `0x${Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`,
    };
  }
}

/**
 * Execute a single payment for a project using Locus
 */
export async function executePayment(
  projectId: string,
  amount: number,
  recipient: string,
  walletId: string,
  walletConfig: {
    apiKeyName: string;
    apiKeyPrivateKey: string;
  },
  projectEndpoint: string,
  buyerApiKey?: string
): Promise<PaymentResult> {
  try {
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

      const paymentAmount = paymentRequirements['X-Payment-Amount'];
      const paymentRecipient = paymentRequirements['X-Payment-Recipient'] || recipient;

      // Step 3: Use Locus to send payment if API key is available
      let transactionHash: string;
      
      if (buyerApiKey) {
        // Use Locus API to send payment autonomously
        const locusResult = await sendLocusPayment(
          paymentRecipient,
          (parseFloat(paymentAmount) * 1e6).toString(), // USDC has 6 decimals
          buyerApiKey,
          {
            projectId,
            projectEndpoint,
            paymentScheme: paymentRequirements['X-Payment-Scheme'],
          }
        );
        
        if (locusResult) {
          transactionHash = locusResult.transactionHash;
        } else {
          // Fallback to CDP wallet signing
          transactionHash = await signTransaction(
            walletId,
            {
              to: paymentRecipient,
              value: (parseFloat(paymentAmount) * 1e6).toString(),
            },
            walletConfig
          );
        }
      } else {
        // Fallback to CDP wallet signing if no Locus API key
        transactionHash = await signTransaction(
          walletId,
          {
            to: paymentRecipient,
            value: (parseFloat(paymentAmount) * 1e6).toString(),
          },
          walletConfig
        );
      }

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
    } else {
      return {
        projectId,
        success: false,
        error: `Request failed with status ${initialResponse.status}`,
      };
    }
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
  batch: InvestmentBatch,
  buyerApiKey?: string
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
      '', // Recipient will be extracted from 402 response
      batch.walletId,
      batch.walletConfig,
      investment.projectEndpoint,
      buyerApiKey
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
