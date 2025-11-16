/**
 * Coinbase API Key JWT Generator
 * Generates JWTs for Coinbase API authentication using CDP API keys
 * Based on: https://docs.cdp.coinbase.com/coinbase-app/authentication-authorization/api-key-authentication
 */

import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

export interface CoinbaseApiKeyConfig {
  apiKeyName: string; // Format: "organizations/{org_id}/apiKeys/{key_id}"
  apiKeyPrivateKey: string; // EC private key in PEM format
}

/**
 * Generate a JWT token for Coinbase API authentication
 * @param requestMethod - HTTP method (GET, POST, etc.)
 * @param requestHost - API host (e.g., "api.coinbase.com")
 * @param requestPath - API path (e.g., "/api/v3/brokerage/accounts")
 * @param config - Coinbase API key configuration
 * @returns JWT token string
 */
export function generateCoinbaseJWT(
  requestMethod: string,
  requestHost: string,
  requestPath: string,
  config: CoinbaseApiKeyConfig
): string {
  const { apiKeyName, apiKeyPrivateKey } = config;

  if (!apiKeyName || !apiKeyPrivateKey) {
    throw new Error('Coinbase API key name and private key are required');
  }

  // Format URI as per Coinbase spec: "METHOD HOSTPATH"
  const uri = `${requestMethod} ${requestHost}${requestPath}`;

  // JWT payload
  const payload = {
    iss: 'cdp', // Issuer
    nbf: Math.floor(Date.now() / 1000), // Not before (current time)
    exp: Math.floor(Date.now() / 1000) + 120, // Expires in 2 minutes
    sub: apiKeyName, // Subject (API key name)
    uri, // Request URI
  };

  // JWT header
  const header = {
    alg: 'ES256', // ECDSA with P-256 curve (required, NOT Ed25519)
    kid: apiKeyName, // Key ID
    nonce: crypto.randomBytes(16).toString('hex'), // Random nonce for replay protection
  };

  // Ensure private key has proper formatting
  let formattedKey = apiKeyPrivateKey;
  if (!formattedKey.includes('BEGIN EC PRIVATE KEY')) {
    // If key doesn't have headers, add them
    formattedKey = `-----BEGIN EC PRIVATE KEY-----\n${formattedKey.replace(/\s/g, '')}\n-----END EC PRIVATE KEY-----`;
  }

  // Generate JWT
  const token = jwt.sign(payload, formattedKey, {
    algorithm: 'ES256',
    header,
  });

  return token;
}

/**
 * Make an authenticated request to Coinbase API
 * @param method - HTTP method
 * @param path - API path
 * @param config - Coinbase API key configuration
 * @param body - Optional request body
 * @returns Response data
 */
export async function makeCoinbaseRequest(
  method: string,
  path: string,
  config: CoinbaseApiKeyConfig,
  body?: any
): Promise<any> {
  const requestHost = 'api.coinbase.com';
  
  // Generate JWT for this request
  const jwtToken = generateCoinbaseJWT(method, requestHost, path, config);

  // Make the request
  const url = `https://${requestHost}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Coinbase API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

