'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ProjectListing from '@/components/ProjectListing';
import { ProjectListing as ProjectListingType } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import CreateListingDialog from '@/components/CreateListingDialog';

// Mock projects data
const mockProjects: ProjectListingType[] = [
  {
    id: 'project-1',
    name: 'Mechanical Keyboard Pro',
    description: 'Premium mechanical keyboard with custom switches and RGB lighting',
    fullDescription: `Introducing the Mechanical Keyboard Pro - a premium mechanical keyboard designed for enthusiasts and professionals.

Features:
- Custom mechanical switches (Cherry MX, Gateron, or Kailh options)
- Full RGB backlighting with customizable effects
- Aluminum frame construction
- USB-C connectivity with detachable cable
- Programmable keys and macros
- Multiple layout options (60%, 65%, TKL, Full-size)

This project has been in development for over 2 years, with extensive prototyping and community feedback. We're ready to bring this to production and need your support to make it happen.

Timeline:
- Month 1-2: Finalize tooling and manufacturing setup
- Month 3-4: Production run
- Month 5: Quality control and packaging
- Month 6: Shipping to backers

We've partnered with established manufacturers and have secured all necessary certifications.`,
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
      {
        id: 'tier-2',
        name: 'Standard',
        description: 'Standard backing tier',
        amount: 129,
        rewards: ['Mechanical Keyboard Pro', 'Custom keycap set', 'USB-C cable', 'Carrying case'],
        estimatedDelivery: 'July 2025',
      },
      {
        id: 'tier-3',
        name: 'Premium',
        description: 'Premium tier with extra accessories',
        amount: 199,
        rewards: [
          'Mechanical Keyboard Pro',
          'Premium keycap set',
          'USB-C cable',
          'Carrying case',
          'Custom wrist rest',
          'Lifetime warranty',
        ],
        estimatedDelivery: 'July 2025',
      },
    ],
  },
  {
    id: 'project-2',
    name: 'AI-Powered Drone',
    description: 'Advanced drone with AI navigation and 4K camera',
    fullDescription: `The AI-Powered Drone represents the next generation of consumer drones, combining cutting-edge AI technology with professional-grade camera capabilities.

Key Features:
- AI-powered obstacle avoidance
- 4K video recording at 60fps
- 30-minute flight time
- GPS and GLONASS positioning
- Follow-me mode
- Gesture control
- Live streaming capabilities

Our team has over 10 years of experience in drone technology and has worked with major manufacturers. This is our passion project to bring professional-grade features to consumers at an affordable price.`,
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
      {
        id: 'tier-2',
        name: 'Pro',
        description: 'Professional package',
        amount: 499,
        rewards: [
          'AI-Powered Drone',
          'Remote controller',
          '2x Batteries',
          'Charging station',
          'Carrying case',
          'ND filter set',
        ],
        estimatedDelivery: 'August 2025',
      },
    ],
  },
  {
    id: 'project-3',
    name: 'Smart Home Hub',
    description: 'Open-source smart home automation hub',
    fullDescription: `The Smart Home Hub is an open-source platform that brings all your smart devices together in one unified system.

Features:
- Support for 100+ device protocols
- Local processing (no cloud required)
- Voice control integration
- Mobile app for iOS and Android
- Web interface
- Automation rules engine
- Privacy-first design

We believe in open-source technology and user privacy. All code will be available on GitHub, and the device will work completely offline if desired.`,
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
      {
        id: 'tier-2',
        name: 'Standard',
        description: 'Standard package',
        amount: 129,
        rewards: ['Smart Home Hub', 'Quick start guide', '1 year support'],
        estimatedDelivery: 'June 2025',
      },
    ],
  },
];

export default function ListingsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListingType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filteredProjects, setFilteredProjects] = useState<ProjectListingType[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch listings from API
  const fetchListings = async () => {
    try {
      // Add cache-busting to ensure we get fresh data
      const response = await fetch(`/api/listings/create?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.listings && data.listings.length > 0) {
            // Convert API listings to ProjectListingType format
            const apiListings: ProjectListingType[] = data.listings.map((listing: any) => ({
              id: listing.id,
              name: listing.name,
              description: listing.description,
              fullDescription: listing.fullDescription,
              companyProfile: listing.companyProfile,
              fundingGoal: listing.fundingGoal,
              amountRaised: listing.amountRaised,
              backers: listing.backers,
              daysLeft: listing.daysLeft,
              category: listing.category,
              tiers: listing.tiers,
              sellerWalletAddress: listing.sellerWalletAddress || listing.sellerWallet,
              sellerEmail: listing.sellerEmail,
              sellerApiKey: listing.sellerApiKey,
            }));
          
          // Don't include mock projects - they should be in the database if needed
          // Filter out any remaining mock/test listings that might have slipped through
          const filteredApiListings = apiListings.filter(listing => {
            const mockIds = ['project-1', 'project-2', 'project-3'];
            return !mockIds.includes(listing.id) && 
                   !listing.name?.toLowerCase().includes('test');
          });
          
          setProjects(filteredApiListings);
        } else {
          // If no API listings, show empty state
          setProjects([]);
        }
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      // Show empty state on error instead of mock projects
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  // Refresh listings when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchListings();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Sync wallet balances for all listings every 3 seconds
  useEffect(() => {
    if (projects.length === 0) return;

    const syncAllBalances = async () => {
      // Sync balances for all listings with wallet addresses
      const syncPromises = projects
        .filter((p: any) => p.sellerWalletAddress || p.sellerWallet)
        .map(async (project: any) => {
          try {
            await fetch(`/api/listings/${project.id}/sync-balance`, {
              method: 'POST',
            });
          } catch (error) {
            // Silently fail for individual listings
            console.debug(`Balance sync failed for ${project.id}:`, error);
          }
        });

      await Promise.all(syncPromises);
      
      // Refresh listings after syncing to get updated amounts
      // Only refresh if page is visible to avoid unnecessary requests
      if (document.visibilityState === 'visible') {
        fetchListings();
      }
    };

    // Initial sync after 1 second
    const initialTimeout = setTimeout(syncAllBalances, 1000);

    // Poll every 3 seconds
    const interval = setInterval(syncAllBalances, 3000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [projects.length]); // Only re-run when number of projects changes

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = projects.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProjects(filtered);
    } else {
      setFilteredProjects(projects);
    }
  }, [searchQuery, projects]);

  const handleBack = async (projectId: string, tierId: string, amount: number) => {
    // Update project funding locally (will be updated via real-time updates)
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            amountRaised: p.amountRaised + amount,
            backers: p.backers + 1,
          };
        }
        return p;
      })
    );
    // Real-time updates will sync automatically via SSE
  };

  const handleCreateProject = (newProject: ProjectListingType) => {
    setProjects((prev) => [newProject, ...prev]);
    setShowCreateDialog(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Project Listings</h1>
              <p className="text-muted-foreground">
                Discover and back innovative projects
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Listing
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-12"
            />
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProjects.map((project, index) => {
              // Generate unique key: use id + index for uniqueness (deduplication ensures no duplicate IDs)
              // Add a random component to ensure uniqueness even if same ID appears
              const uniqueKey = `${project.id}-${index}-${project.name?.substring(0, 3) || 'pro'}`;
              return (
                <div
                  key={uniqueKey}
                  onClick={() => router.push(`/listings/${project.id}`)}
                  className="cursor-pointer"
                >
                  <ProjectListing
                    project={project}
                    onBack={handleBack}
                  />
                </div>
              );
            })}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No projects found matching your search.</p>
            </div>
          )}
        </div>
      </main>

      <CreateListingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreateProject}
      />
    </div>
  );
}

