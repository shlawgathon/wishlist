/**
 * Standalone script to start the Locus MCP server
 * Run with: npx tsx scripts/start-mcp-server.ts
 * 
 * Note: LOCUS_API_KEY = Locus Buyer API key (buyerApiKey from user settings)
 */

import http from 'node:http';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { startLocusMCPServer } from '../lib/locus-mcp-server.js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });
// Also try .env as fallback
config({ path: resolve(process.cwd(), '.env') });

// Locus API key = Locus Buyer API key (buyerApiKey)
const LOCUS_API_KEY = process.env.LOCUS_API_KEY || process.env.LOCUS_BUYER_API_KEY || process.env.NEXT_PUBLIC_LOCUS_API_KEY || '';

if (!LOCUS_API_KEY) {
  console.error('❌ LOCUS_API_KEY environment variable is required');
  console.error('   This should be your Locus Buyer API key (buyerApiKey)');
  process.exit(1);
}

const PORT = parseInt(process.env.MCP_SERVER_PORT || '7001', 10);

async function main() {
  try {
    // startLocusMCPServer already creates and starts the HTTP server
    const { httpServer } = await startLocusMCPServer(LOCUS_API_KEY, PORT);
    
    if (httpServer) {
      console.log(`🚀 Locus MCP server running on http://localhost:${PORT}`);
      console.log(`📡 Ready to accept connections from Claude Agent SDK`);
      console.log(`\n💡 Press Ctrl+C to stop the server\n`);
      
      // Keep process alive
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down MCP server...');
        httpServer.close(() => {
          console.log('✅ MCP server stopped');
          process.exit(0);
        });
      });
      
      process.on('SIGTERM', () => {
        console.log('\n🛑 Shutting down MCP server...');
        httpServer.close(() => {
          console.log('✅ MCP server stopped');
          process.exit(0);
        });
      });
    } else {
      console.log('✅ MCP server is already running on another process');
    }
  } catch (error: any) {
    if (error?.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${PORT} is already in use. The MCP server may already be running.`);
      console.log(`   If you need to restart it, kill the process using port ${PORT} first.`);
      process.exit(0);
    } else {
      console.error('❌ Failed to start MCP server:', error);
      process.exit(1);
    }
  }
}

main();

