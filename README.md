# Wishlist - AI-Powered Crypto Fundraising Platform

AI-powered crypto fundraising platform with autonomous investment matching using Claude Agent SDK, Locus payment agent, x402 protocol, and CDP wallets. Coinbase Payment WIP.

**🌐 Live Demo**: https://wishlist-two-rho.vercel.app

## Features

- **Creator Dashboard**: Create projects, set funding goals, track progress
- **AI Investment Matching**: Claude agent analyzes and matches projects to backer preferences
- **Autonomous Payments**: Locus agent orchestrates payments through x402 protocol
- **CDP Wallets**: Secure embedded wallets for creators and backers
- **Real-time Updates**: Track funding progress and investment history, live updates via Locus
- **Semantic Search**: Voyage AI generates vector embeddings for intelligent project discovery beyond keywords
- **MongoDB Atlas**: Cloud-hosted database with vector search indexes for fast similarity matching
- **Vector Embeddings**: 1536-dimensional embeddings capture semantic meaning for accurate recommendations
- **Authentication System**: Cookie-based session authentication with password hashing and MongoDB user storage 

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
# Authentication
AUTH_SALT=your_random_salt_string  # Random string for password hashing
MONGODB_URI=your_mongodb_connection_string  # MongoDB connection string

# AI & APIs
ANTHROPIC_API_KEY=your_key_here
VOYAGE_API_KEY=your_voyage_key  # Optional: For semantic search

# Coinbase CDP
CDP_API_KEY_NAME=your_key_name
CDP_API_KEY_PRIVATE_KEY=your_private_key

# Locus API Keys (Required for payments)
# Wallet Agent API Key: Used for making payments (investments)
# When creating an agent in your wallet, make sure to select "Create API Key" so it can buy stuff.
LOCUS_BUYER_API_KEY=locus_dev_MCkl3AYiHaJ2nMIZ76OUbyR2kbsTgUsm
# Seller API Key: Used for receiving payments (project creators)
LOCUS_SELLER_API_KEY=locus_dev_I1mtiYkoDe6_pLBJhgl3PZxmDEpXbGWP

# x402 Protocol
X402_BAZAAR_ENDPOINT=https://bazaar.x402.example.com
NETWORK=base
BASE_RPC_URL=your_base_rpc_url  # Optional: Base network RPC endpoint
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

## Authentication System

The platform uses a cookie-based session authentication system with MongoDB for user storage.

### Features

- **User Registration**: Username/password signup with Locus API key requirement
- **Session Management**: HTTP-only cookies with 30-day expiration
- **Password Security**: SHA-256 hashing with salt (use bcrypt in production)
- **Protected Routes**: Creator dashboard and API endpoints require authentication
- **User Data**: Stores username, hashed password, Locus API keys, and optional wallet addresses

### User Model

```typescript
interface User {
  username: string;                    // Unique username (min 3 chars)
  passwordHash: string;                // SHA-256 hashed password
  buyerApiKey: string;                 // Required: Locus Wallet Agent API key
  personalWalletAddress?: string;      // Optional: Personal wallet for balance viewing
  createdAt: number;
  updatedAt: number;
}
```

### API Endpoints

#### Authentication

- `POST /api/auth/signup` - Create new account
  - Requires: `username`, `password`, `buyerApiKey`
  - Validates: Username uniqueness, password length (min 6), API key format
  - Returns: User object with session cookie

- `POST /api/auth/login` - Authenticate user
  - Requires: `username`, `password`
  - Returns: User object with session cookie

- `POST /api/auth/logout` - End session
  - Clears session cookie

- `GET /api/auth/me` - Get current user
  - Returns: Authenticated user data or 401 if not logged in

#### User Management

- `PUT /api/auth/update-buyer-key` - Update Locus API key
- `PUT /api/auth/update-personal-wallet` - Update personal wallet address

### Session Flow

1. **Signup/Login**: User credentials validated → Session token created → HTTP-only cookie set
2. **Request**: Cookie sent with each request → Server decodes session → User authenticated
3. **Logout**: Cookie deleted → Session invalidated

### Security Notes

- Session tokens are base64-encoded and stored in HTTP-only cookies
- Passwords are hashed with SHA-256 + salt (consider bcrypt for production)
- Cookies are secure in production (HTTPS required)
- Usernames must be unique and at least 3 characters
- Passwords must be at least 6 characters
- Locus API key is required for account creation (enables payment functionality)

### Environment Variables

```bash
AUTH_SALT=your_random_salt_string  # Used for password hashing
MONGODB_URI=your_mongodb_connection_string  # User data storage
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
