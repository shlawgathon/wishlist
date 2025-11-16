# MCP Server Setup Guide

## How to Start the MCP Server

The MCP server can be started in two ways:

### Option 1: Automatic Start (Recommended)
The MCP server will automatically start when you make an AI search request. It's handled by the `ensureMCPServerRunning()` function in the API route.

**No action needed** - just use the AI search bar and the server will start automatically.

### Option 2: Manual Start (For Testing)
You can start the MCP server manually as a standalone process:

```bash
# Set your Locus API key
export LOCUS_API_KEY="your_locus_api_key_here"

# Or set it in your .env file
# LOCUS_API_KEY=your_locus_api_key_here

# Start the server
npm run mcp-server
```

The server will run on `http://localhost:7001` by default.

## Verify MCP Server is Working

### Method 1: Test Endpoint
Visit or call the test endpoint:
```
GET /api/mcp-server/test
```

This will:
- Ensure the MCP server is running
- Connect to it
- List all available tools
- Return a JSON response with tool information

**Example response:**
```json
{
  "success": true,
  "mcpServerUrl": "http://localhost:7001",
  "toolCount": 4,
  "tools": [
    {
      "name": "get_payment_context",
      "description": "Get payment context including budget status and whitelisted contacts",
      "hasInputSchema": true
    },
    {
      "name": "send_to_address",
      "description": "Send USDC to any wallet address",
      "hasInputSchema": true
    },
    // ... more tools
  ]
}
```

### Method 2: Check Server Logs
When the server starts, you should see logs like:
```
🔧 Creating Locus MCP server...
🔍 Fetching tools from remote Locus MCP server...
✅ Discovered X tools from Locus MCP server: [...]
📝 Registering built-in payment tools...
✅ Registered 4 built-in payment tools: get_payment_context, send_to_address, send_to_contact, send_to_email
📝 Registering X x402 tools from Locus MCP server...
✅ Registered x402 tool: ...
✅ MCP server created with X total tools
🔧 Setting up transport...
🔧 Connecting server to transport...
✅ Server connected to transport
✅ Locus MCP server running on http://localhost:7001
```

### Method 3: Check Claude Agent SDK Logs
When making an AI search request, check the server logs for:
```
🔌 Connecting to local MCP server at http://localhost:7001...
✅ Connected to local MCP server
✅ Found X tools from MCP server: [...]
📋 Converted X tools for Claude: [...]
📤 Sending to Claude with tools: { toolCount: X, toolNames: [...] }
```

## Troubleshooting

### Server Not Starting
1. **Check if port 7001 is already in use:**
   ```bash
   lsof -i :7001
   ```
   If something is using it, either stop that process or change the port:
   ```bash
   export MCP_SERVER_PORT=7002
   ```

2. **Check your Locus Buyer API key:**
   - Make sure it's set in your environment or `.env` file as `LOCUS_API_KEY`
   - This is the same as `buyerApiKey` in your user settings
   - Verify it's a valid API key (should start with `locus_`)

3. **Check server logs:**
   Look for error messages in the console when the server tries to start.

### Tools Not Being Discovered
1. **Check remote Locus MCP connection:**
   The server tries to fetch tools from `https://mcp.paywithlocus.com/mcp`. If this fails, you'll still have the 4 built-in payment tools.

2. **Verify API key authentication:**
   Make sure your Locus API key is valid and has the right permissions.

3. **Check the test endpoint:**
   Visit `/api/mcp-server/test` to see what tools are available.

### Claude Not Using Tools
1. **Check if tools are being sent:**
   Look for logs showing `📤 Sending to Claude with tools:` - this should list all tool names.

2. **Check Claude's response:**
   Look for `📨 Claude response:` - it should show `hasToolUse: true` if Claude tried to use tools.

3. **Verify tool schemas:**
   Tools need valid JSON Schema. The code automatically converts Zod schemas, but check logs for conversion warnings.

## Expected Tools

The MCP server should have at least these 4 built-in payment tools:
1. `get_payment_context` - Check payment budget
2. `send_to_address` - Send USDC to wallet address
3. `send_to_contact` - Send USDC to whitelisted contact
4. `send_to_email` - Send USDC via email escrow

Plus any x402 tools discovered from the remote Locus MCP server.

## Environment Variables

- `LOCUS_API_KEY` - Your Locus Buyer API key (same as `buyerApiKey` in user settings) (required)
- `MCP_SERVER_URL` - URL of the MCP server (default: `http://localhost:7001`)
- `MCP_SERVER_PORT` - Port for the MCP server (default: `7001`)

**Note:** `LOCUS_API_KEY` = `buyerApiKey` (Locus Buyer API key). These are the same thing.

