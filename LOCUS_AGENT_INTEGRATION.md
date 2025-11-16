# Locus Agent-to-Agent Integration

## ✅ Implementation Summary

The Locus agent-to-agent payment system is now fully implemented. Each API key represents an agent that must be manually created on Locus, and all payments are processed as agent-to-agent transfers.

## 🔑 Key Concepts

### **Agents, Not Wallets**
- Each **API key is an agent** (not a wallet)
- Agents must be **manually created** on the Locus platform
- Payments are **agent-to-agent** transfers
- No automatic wallet creation - API keys are the agents

### **API Key Format**
- Buyer Agent API Key: `locus_dev_...` or `locus_...`
- Seller Agent API Key: `locus_dev_...` or `locus_...`
- Both must be created manually on Locus platform

## 📋 How It Works

### Creating a Listing

1. User provides **Locus Seller Agent API Key** when creating listing
2. API key is validated (must start with `locus_dev_` or `locus_`)
3. API key is stored in listing as `sellerApiKey`
4. This API key represents the seller agent that will receive payments

### User Connects Wallet

1. User enters **Locus Buyer Agent API Key** in wallet connect dialog
2. API key is validated (must start with `locus_dev_` or `locus_`)
3. API key is stored in `localStorage` as `locus_buyer_api_key`
4. This API key represents the buyer agent that will send payments

### Making a Payment

1. User selects a tier and clicks "Complete Payment"
2. System retrieves:
   - Buyer agent's API key from `localStorage`
   - Seller agent's API key from listing data
3. Calls `/api/listings/checkout` with both API keys
4. Backend uses `executePayment()` for agent-to-agent transfer:
   - `buyerApiKey` (buyer agent)
   - `sellerApiKey` (seller agent)
5. Locus API processes the agent-to-agent payment
6. Transaction hash is returned and funding is updated

## 🔧 API Endpoints

### `POST /api/listings/checkout`
Processes an agent-to-agent payment.

**Request:**
```json
{
  "projectId": "listing_...",
  "tierId": "tier-1",
  "amount": 50,
  "buyerApiKey": "locus_dev_..." // Buyer agent's API key
}
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "message": "Payment processed successfully"
}
```

## 📦 Data Structure

### Listing (MongoDB)
```typescript
{
  id: string;
  sellerApiKey: string; // Seller agent's API key (manually created on Locus)
  sellerWallet: string; // Legacy: CDP address
  sellerWalletId: string; // Legacy: CDP ID
  // ... other fields
}
```

### User (localStorage)
```javascript
{
  locus_buyer_api_key: "locus_dev_..." // Buyer agent's API key (manually created on Locus)
}
```

## 🎯 Creating API Keys on Locus

**Important:** API keys must be manually created on the Locus platform before use.

1. Go to Locus platform: https://docs.payai.network/locus
2. Create a new agent/API key
3. Copy the API key (format: `locus_dev_...` or `locus_...`)
4. Use this API key in the application

### For Sellers (Listings)
- Create a seller agent on Locus
- Use the API key when creating a listing
- This agent will receive payments

### For Buyers (Users)
- Create a buyer agent on Locus
- Use the API key when connecting wallet
- This agent will send payments

## 🔄 Payment Flow

```
Buyer Agent (API Key) → Locus API → Seller Agent (API Key)
```

1. Buyer agent's API key authenticates the payment request
2. Locus API processes the agent-to-agent transfer
3. Payment is sent from buyer agent to seller agent
4. Transaction hash is returned for confirmation

## 🧪 Testing

1. **Create API Keys:**
   - Create seller agent API key on Locus platform
   - Create buyer agent API key on Locus platform

2. **Create a listing:**
   - Go to `/creator`
   - Fill form with seller agent API key
   - Check MongoDB: listing should have `sellerApiKey`

3. **Connect wallet:**
   - Click "Connect Wallet" in header
   - Enter buyer agent API key
   - Check `localStorage`: should have `locus_buyer_api_key`

3. **Make payment:**
   - Go to a listing
   - Select tier and checkout
   - Payment should process as agent-to-agent transfer
   - Check transaction hash is returned

## 📚 Code Files

- `lib/locus-agent.ts` - Agent-to-agent payment functions
- `app/api/listings/create/route.ts` - Listing creation with seller agent API key
- `app/api/listings/checkout/route.ts` - Agent-to-agent payment processing
- `components/WalletConnectDialog.tsx` - Buyer agent connection UI
- `components/ProjectCheckout.tsx` - Checkout UI with agent API keys

## ⚠️ Important Notes

- **No automatic wallet creation** - API keys are agents, not wallets
- **API keys must be manually created** on Locus platform
- **Each API key = one agent** that can send/receive payments
- **Agent-to-agent transfers** - buyer agent sends to seller agent
- **API key format validation** - must start with `locus_dev_` or `locus_`

## 🎯 Next Steps

- [ ] Add link to Locus platform for creating API keys
- [ ] Add agent ID display in listing details
- [ ] Add transaction history per agent
- [ ] Add agent balance checking

