# Wishlist - AI-Powered Crypto Fundraising Platform

AI-powered crypto fundraising platform with autonomous investment matching using Claude Agent SDK, Locus payment agent, x402 protocol, and CDP wallets.

## Features

- **Creator Dashboard**: Create projects, set funding goals, track progress
- **AI Investment Matching**: Claude agent analyzes and matches projects to backer preferences
- **Autonomous Payments**: Locus agent orchestrates payments through x402 protocol
- **CDP Wallets**: Secure embedded wallets for creators and backers
- **Real-time Updates**: Track funding progress and investment history

## Tech Stack

- **Frontend**: Next.js 14+, React, TypeScript, Tailwind CSS, shadcn/ui
- **AI Agent**: Claude Agent SDK (Anthropic)
- **Payment**: Locus payment agent, x402 protocol
- **Blockchain**: Coinbase CDP Embedded Wallets, Base/Ethereum, USDC

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- API keys for:
  - Anthropic (Claude)
  - Coinbase CDP
  - Locus (optional for MVP)
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
LOCUS_API_KEY=your_locus_key (optional)
X402_BAZAAR_ENDPOINT=https://bazaar.x402.example.com
NETWORK=base
```

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

## License

MIT

