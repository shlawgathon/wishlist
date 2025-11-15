// Mock listings data for AI search and fallback
export const mockListings = [
  {
    id: 'project-1',
    name: 'Mechanical Keyboard Pro',
    description: 'Premium mechanical keyboard with custom switches and RGB lighting. Introducing the Mechanical Keyboard Pro - a premium mechanical keyboard designed for enthusiasts and professionals.',
    companyProfile: {
      name: 'KeyTech Innovations',
      bio: 'Building the future of typing, one key at a time',
      website: 'https://keytech.example.com',
    },
    fundingGoal: 50000,
    amountRaised: 32500,
    backers: 234,
    daysLeft: 15,
    category: 'Technology',
    tiers: [
      {
        id: 'tier-1',
        name: 'Early Bird',
        description: 'Get the keyboard at a special early bird price',
        amount: 99,
        rewards: ['Mechanical Keyboard Pro', 'Custom keycap set', 'USB-C cable'],
        estimatedDelivery: 'June 2025',
      },
    ],
  },
  {
    id: 'project-2',
    name: 'AI-Powered Drone',
    description: 'Advanced drone with AI navigation and 4K camera. The AI-Powered Drone represents the next generation of consumer drones, combining cutting-edge AI technology with professional-grade camera capabilities.',
    companyProfile: {
      name: 'SkyTech Drones',
      bio: 'Innovating aerial technology since 2015',
      website: 'https://skytech.example.com',
    },
    fundingGoal: 100000,
    amountRaised: 67800,
    backers: 456,
    daysLeft: 22,
    category: 'Technology',
    tiers: [
      {
        id: 'tier-1',
        name: 'Basic',
        description: 'Essential drone package',
        amount: 299,
        rewards: ['AI-Powered Drone', 'Remote controller', 'Battery', 'Charging cable'],
        estimatedDelivery: 'August 2025',
      },
    ],
  },
  {
    id: 'project-3',
    name: 'Smart Home Hub',
    description: 'Open-source smart home automation hub. The Smart Home Hub is an open-source platform that brings all your smart devices together in one unified system.',
    companyProfile: {
      name: 'OpenHome Labs',
      bio: 'Democratizing smart home technology',
    },
    fundingGoal: 75000,
    amountRaised: 42100,
    backers: 312,
    daysLeft: 18,
    category: 'Technology',
    tiers: [
      {
        id: 'tier-1',
        name: 'Developer',
        description: 'For developers and early adopters',
        amount: 79,
        rewards: ['Smart Home Hub', 'Developer documentation', 'Early access to beta'],
        estimatedDelivery: 'May 2025',
      },
    ],
  },
];
