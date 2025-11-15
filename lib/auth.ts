/**
 * Simple authentication utilities
 * Uses bcrypt for password hashing and cookies for sessions
 */

import { cookies } from 'next/headers';
import crypto from 'crypto';

// Simple session token generation
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Get current user from session
export async function getCurrentUser(): Promise<{ username: string; buyerApiKey?: string } | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  
  if (!sessionToken) {
    return null;
  }

  // In a real app, you'd validate the session token against a sessions table
  // For simplicity, we'll decode it (it contains username)
  try {
    const decoded = Buffer.from(sessionToken, 'base64').toString('utf-8');
    const [username, buyerApiKey] = decoded.split('::');
    return { username, buyerApiKey: buyerApiKey || undefined };
  } catch {
    return null;
  }
}

// Create session cookie
export function createSession(username: string, buyerApiKey?: string): string {
  const sessionData = buyerApiKey ? `${username}::${buyerApiKey}` : username;
  return Buffer.from(sessionData).toString('base64');
}

// Hash password (simple hash for demo - use bcrypt in production)
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + process.env.AUTH_SALT || 'wishlist-salt').digest('hex');
}

// Verify password
export function verifyPassword(password: string, hash: string): boolean {
  const hashed = hashPassword(password);
  return hashed === hash;
}

