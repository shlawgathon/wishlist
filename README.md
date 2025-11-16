# Wishlist - AI-Powered Crypto Fundraising Platform

AI-powered crypto fundraising platform with autonomous investment matching using Claude Agent SDK, Locus payment agent, x402 protocol, and CDP wallets. Coinbase Payment WIP.

**🌐 Live Demo**: https://wishlist-two-rho.vercel.app

## Features

- **Creator Dashboard**: Create projects, set funding goals, track progress
- **AI Investment Matching**: Claude agent analyzes and matches projects to backer preferences
- **Autonomous Payments**: Locus agent orchestrates payments through x402 protocol
- **CDP Wallets**: Secure embedded wallets for creators and backers
- **Real-time Updates**: Track funding progress and investment history, live updates via Locus
- **Semantic Search with Vector Embeddings**: Uses Voyage AI to generate vector embeddings for project descriptions, enabling semantic search that understands meaning and context rather than just keywords. Projects are stored in MongoDB Atlas with vector indexes for fast similarity searches.
- **MongoDB Atlas**: Cloud-hosted database with vector search capabilities. Stores project listings, chat histories, and user data with automatic scaling and high availability. Vector indexes enable semantic search across project descriptions.
- **Voyage AI Embeddings**: Generates high-quality vector embeddings (1536-dimensional) for project descriptions and user queries. These embeddings capture semantic meaning, allowing the platform to find relevant projects even when exact keywords don't match, improving discovery and recommendation accuracy.

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

### Building

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

## License

MIT
