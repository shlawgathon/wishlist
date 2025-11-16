# Wishlist - AI-Powered Crypto Fundraising Platform

AI-powered crypto fundraising platform with autonomous investment matching using Claude Agent SDK, Locus payment agent, x402 protocol, and CDP wallets.

**🌐 Live Demo**: https://wishlist-two-rho.vercel.app

## Features

- **Creator Dashboard**: Create projects, set funding goals, and track progress in real-time
- **AI Investment Matching**: Claude agent analyzes projects and matches them to backer preferences
- **Autonomous Payments**: Locus agent orchestrates payments through x402 protocol automatically
- **CDP Wallets**: Secure embedded wallets for creators and backers with seamless integration
- **Real-time Updates**: Track funding progress and investment history with live updates via Locus
- **Semantic Search**: Voyage AI generates vector embeddings for intelligent project discovery beyond keywords
- **MongoDB Atlas**: Cloud-hosted database with vector search indexes for fast similarity matching
- **Vector Embeddings**: 1536-dimensional embeddings capture semantic meaning for accurate recommendations

## Tech Stack

- **Frontend**: Next.js 14+, React, TypeScript, Tailwind CSS, shadcn/ui
- **AI Agent**: Claude Agent SDK (Anthropic)
- **Payment**: Locus payment agent, x402 protocol
- **Blockchain**: Coinbase CDP Embedded Wallets, Base/Ethereum, USDC
- **Database**: MongoDB Atlas with vector search indexes
- **Embeddings**: Voyage AI (1536-dimensional vectors)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- API keys for:
  - Anthropic (Claude)
  - Coinbase CDP
  - Locus (Wallet Agent and Seller API Keys - Required for payments)
  - x402 Bazaar endpoint

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd Wishlist
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your API keys:

```
ANTHROPIC_API_KEY=your_key_here
CDP_API_KEY_NAME=your_key_name
CDP_API_KEY_PRIVATE_KEY=your_private_key

# Locus API Keys (Required for payments)
# Wallet Agent API Key: Used for making payments (investments)
# When creating an agent in your wallet, make sure to select "Create API Key" so it can buy stuff.
LOCUS_BUYER_API_KEY=locus_dev_MCkl3AYiHaJ2nMIZ76OUbyR2kbsTgUsm
# Seller API Key: Used for receiving payments (project creators)
LOCUS_SELLER_API_KEY=locus_dev_I1mtiYkoDe6_pLBJhgl3PZxmDEpXbGWP

X402_BAZAAR_ENDPOINT=https://bazaar.x402.example.com
NETWORK=base
```

**Locus Integration**:

- Locus enables AI agents to autonomously send payments on Base Mainnet using USDC
- Uses MCP (Model Context Protocol) for integration with Claude Agent SDK
- Wallet Agent API Key is used when making investments (backers)
  - When creating an agent in your wallet, make sure to select "Create API Key" so it can buy stuff
- Seller API Key is used when receiving payments (creators)
- MCP Server: `https://mcp.paywithlocus.com/mcp`
- Documentation: https://docs.payai.network/locus

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── projects/     # Project management
│   │   ├── agent/        # AI matching
│   │   ├── invest/       # Investment execution
│   │   └── x402/         # Service discovery
│   ├── creator/          # Creator dashboard
│   ├── agent/            # Agent console
│   └── page.tsx          # Main dashboard
├── components/           # React components
│   ├── Header.tsx
│   ├── ProjectCard.tsx
│   ├── InvestmentModal.tsx
│   └── AgentConsole.tsx
└── lib/                  # Core libraries
    ├── cdp-wallet.ts     # CDP wallet utilities
    ├── claude-agent.ts   # Claude Agent SDK wrapper
    ├── x402-client.ts    # x402 protocol client
    ├── locus-agent.ts   # Locus payment orchestrator
    └── investment-analyzer.ts
```

## API Endpoints

### Projects

- `POST /api/projects/create` - Create a new project
- `GET /api/projects/create` - List all projects

### Agent

- `POST /api/agent/match` - Match investments using AI

### Investment

- `POST /api/invest/execute` - Execute batch investments

### x402

- `GET /api/x402/discover` - Discover available services

## Usage

### For Creators

1. Navigate to `/creator`
2. Fill out the project creation form
3. A CDP wallet is automatically generated
4. Project is registered with x402 Bazaar
5. Track funding progress in real-time

### For Backers

1. Connect your wallet on the main dashboard
2. Navigate to `/agent` to set investment preferences
3. Click "Start AI Matching" to get recommendations
4. Review AI-scored projects
5. Execute investments with one click
6. Track investments on the main dashboard

## Development

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## MVP Notes

This is an MVP implementation. In production, you would:

- Replace in-memory storage with a database
- Integrate real CDP Server Wallet API v2
- Connect to actual x402 Bazaar endpoint
- Implement real blockchain transactions
- Add authentication and user management
- Enhance error handling and validation
- Add comprehensive testing

## Deployment

**🌐 Live Demo**: [https://wishlist-oo8z2560c-locus-hackathon.vercel.app](https://wishlist-oo8z2560c-locus-hackathon.vercel.app)

### Deploy to Vercel

1. **Push to Git**: Ensure your code is committed and pushed to GitHub/GitLab/Bitbucket
2. **Connect to Vercel**:

   - Go to https://vercel.com/new
   - Import your repository
   - Vercel will auto-detect Next.js
3. **Set Environment Variables** in Vercel dashboard (Settings → Environment Variables):

   - `MONGODB_URI` - Your MongoDB connection string
   - `ANTHROPIC_API_KEY` - Claude AI API key
   - `LOCUS_BUYER_API_KEY` - Locus Wallet Agent API key (when creating an agent in your wallet, make sure to select "Create API Key" so it can buy stuff)
   - `LOCUS_SELLER_API_KEY` - Locus seller API key
   - `X402_BAZAAR_ENDPOINT` - x402 Bazaar endpoint
   - `NEXT_PUBLIC_APP_URL` - Your Vercel app URL (auto-set)
   - `VOYAGE_API_KEY` - (Optional) Voyage AI for semantic search
   - `CDP_API_KEY_NAME` - Coinbase CDP API key name (format: "organizations/{org_id}/apiKeys/{key_id}") - Required for Coinbase Pay
   - `CDP_API_KEY_PRIVATE_KEY` - Coinbase CDP API private key (EC private key in PEM format, must use ECDSA/ES256, NOT Ed25519) - Required for Coinbase Pay
   - `NETWORK` - Blockchain network (default: `base`)
   - `BASE_RPC_URL` - Base RPC endpoint
   - `AUTH_SALT` - Random string for password hashing
4. **Deploy**: Click "Deploy" or push a new commit

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel --prod
```

## License

MIT
