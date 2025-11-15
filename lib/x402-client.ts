/**
 * x402 Protocol Client
 * Handles service discovery and payment header management
 */

export interface X402Service {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  pricing: {
    amount: string;
    currency: string;
    scheme: string;
  };
}

export interface X402PaymentHeader {
  'X-Payment': string;
}

export interface PaymentRequiredResponse {
  status: 402;
  headers: {
    'X-Payment-Required': string;
    'X-Payment-Amount': string;
    'X-Payment-Currency': string;
    'X-Payment-Recipient': string;
    'X-Payment-Scheme': string;
  };
}

/**
 * Query x402 Bazaar for available services/projects
 */
export async function discoverServices(
  bazaarEndpoint?: string,
  filters?: {
    category?: string;
    minAmount?: number;
    maxAmount?: number;
  }
): Promise<X402Service[]> {
  const endpoint = bazaarEndpoint || process.env.X402_BAZAAR_ENDPOINT || 'https://bazaar.x402.example.com';
  
  try {
    // In production, this would make an actual HTTP request to the x402 Bazaar
    // For MVP, return mock services
    const mockServices: X402Service[] = [
      {
        id: 'project_1',
        name: 'Mechanical Keyboard Project',
        description: 'High-quality mechanical keyboard with custom switches',
        endpoint: `${endpoint}/projects/1`,
        pricing: {
          amount: '50',
          currency: 'USDC',
          scheme: 'x402',
        },
      },
      {
        id: 'project_2',
        name: 'Drone Development',
        description: 'Advanced drone with AI navigation',
        endpoint: `${endpoint}/projects/2`,
        pricing: {
          amount: '100',
          currency: 'USDC',
          scheme: 'x402',
        },
      },
      {
        id: 'project_3',
        name: 'Smart Home Hub',
        description: 'Open-source smart home automation hub',
        endpoint: `${endpoint}/projects/3`,
        pricing: {
          amount: '75',
          currency: 'USDC',
          scheme: 'x402',
        },
      },
    ];

    // Apply filters if provided
    let filtered = mockServices;
    if (filters?.category) {
      filtered = filtered.filter(s => 
        s.description.toLowerCase().includes(filters.category!.toLowerCase())
      );
    }
    if (filters?.minAmount) {
      filtered = filtered.filter(s => 
        parseFloat(s.pricing.amount) >= filters.minAmount!
      );
    }
    if (filters?.maxAmount) {
      filtered = filtered.filter(s => 
        parseFloat(s.pricing.amount) <= filters.maxAmount!
      );
    }

    return filtered;
  } catch (error) {
    console.error('Error discovering x402 services:', error);
    return [];
  }
}

/**
 * Make an HTTP request to a project API
 * Handles 402 Payment Required responses
 */
export async function requestWithPayment(
  url: string,
  paymentHeader: X402PaymentHeader
): Promise<Response> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...paymentHeader,
      },
    });

    // If we get a 402, extract payment requirements
    if (response.status === 402) {
      const paymentInfo: PaymentRequiredResponse = {
        status: 402,
        headers: {
          'X-Payment-Required': response.headers.get('X-Payment-Required') || 'true',
          'X-Payment-Amount': response.headers.get('X-Payment-Amount') || '0',
          'X-Payment-Currency': response.headers.get('X-Payment-Currency') || 'USDC',
          'X-Payment-Recipient': response.headers.get('X-Payment-Recipient') || '',
          'X-Payment-Scheme': response.headers.get('X-Payment-Scheme') || 'x402',
        },
      };
      return new Response(JSON.stringify(paymentInfo), {
        status: 402,
        headers: paymentInfo.headers,
      });
    }

    return response;
  } catch (error) {
    console.error('Error making payment request:', error);
    throw error;
  }
}

/**
 * Extract payment requirements from a 402 response
 */
export function extractPaymentRequirements(
  response: Response
): PaymentRequiredResponse['headers'] | null {
  if (response.status !== 402) {
    return null;
  }

  return {
    'X-Payment-Required': response.headers.get('X-Payment-Required') || 'true',
    'X-Payment-Amount': response.headers.get('X-Payment-Amount') || '0',
    'X-Payment-Currency': response.headers.get('X-Payment-Currency') || 'USDC',
    'X-Payment-Recipient': response.headers.get('X-Payment-Recipient') || '',
    'X-Payment-Scheme': response.headers.get('X-Payment-Scheme') || 'x402',
  };
}

/**
 * Create X-PAYMENT header from signed transaction
 */
export function createPaymentHeader(
  transactionHash: string,
  scheme: string = 'x402'
): X402PaymentHeader {
  return {
    'X-Payment': JSON.stringify({
      scheme,
      transactionHash,
      timestamp: Date.now(),
    }),
  };
}

/**
 * Register a project with x402 Bazaar
 */
export async function registerProject(
  project: {
    id: string;
    name: string;
    description: string;
    endpoint: string;
    pricing: {
      amount: string;
      currency: string;
    };
  },
  bazaarEndpoint?: string
): Promise<boolean> {
  const endpoint = bazaarEndpoint || process.env.X402_BAZAAR_ENDPOINT || 'https://bazaar.x402.example.com';
  
  try {
    // In production, this would POST to the x402 Bazaar registration endpoint
    // For MVP, just return success
    console.log(`Registering project ${project.id} with x402 Bazaar at ${endpoint}`);
    return true;
  } catch (error) {
    console.error('Error registering project with x402:', error);
    return false;
  }
}

