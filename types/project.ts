export interface ProjectTier {
  id: string;
  name: string;
  description: string;
  amount: number;
  rewards: string[];
  estimatedDelivery?: string;
}

export interface ProjectListing {
  id: string;
  name: string;
  description: string;
  fullDescription: string;
  companyProfile: {
    name: string;
    logo?: string;
    bio: string;
    website?: string;
  };
  fundingGoal: number;
  amountRaised: number;
  backers: number;
  daysLeft: number;
  tiers: ProjectTier[];
  images?: string[];
  category: string;
  sellerApiKey?: string; // Optional: Agent API key
  sellerEmail?: string; // Optional: Email for escrow payments
  sellerWalletAddress?: string; // Optional: Wallet address for direct transfers
}

