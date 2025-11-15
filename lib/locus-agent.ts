/**
 * Locus Payment Agent Orchestrator
 * Handles payment orchestration and multi-step payment chains
 */

// Locus integration
// In production, import the actual Locus SDK
// import { Locus } from '@locus/sdk';
import { signTransaction, WalletInfo } from './cdp-wallet';
import { createPaymentHeader, requestWithPayment, extractPaymentRequirements } from './x402-client';

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

/**
 * Initialize Locus payment agent
 */
export function initLocusAgent(config: {
  apiKey?: string;
  endpoint?: string;
}) {
  if (!config.apiKey && !config.endpoint) {
    console.warn('Locus configuration not provided, using mock mode');
  }
  
  // Initialize Locus if available
  try {
    if (config.apiKey) {
      // In production, initialize Locus SDK:
      // const locus = new Locus({ apiKey: config.apiKey, endpoint: config.endpoint });
      console.log('Locus agent initialized with API key');
    }
  } catch (error) {
    console.warn('Locus initialization failed, using fallback:', error);
  }
  
  return config;
}

/**
 * Execute a single payment for a project
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
  projectEndpoint: string
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

      // Step 3: Sign transaction using CDP wallet
      const transactionHash = await signTransaction(
        walletId,
        {
          to: paymentRequirements['X-Payment-Recipient'],
          value: (parseFloat(paymentRequirements['X-Payment-Amount']) * 1e6).toString(), // USDC has 6 decimals
        },
        walletConfig
      );

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
 * Execute batch investments
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
      '', // Recipient will be extracted from 402 response
      batch.walletId,
      batch.walletConfig,
      investment.projectEndpoint
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

