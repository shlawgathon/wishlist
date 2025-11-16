'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Share2, Check, Wifi, WifiOff, Mail } from 'lucide-react';
import type { ProjectListing, ProjectTier } from '@/types/project';
import { useListingUpdates } from '@/hooks/useListingUpdates';
import ProjectCheckout from './ProjectCheckout';
import ProjectComments from './ProjectComments';

interface ProjectListingProps {
  project: ProjectListing;
  onBack?: (projectId: string, tierId: string, amount: number) => void;
  showFullDetails?: boolean; // If true, show all expandables (for detail page)
}

export default function ProjectListing({ project: initialProject, onBack, showFullDetails = false }: ProjectListingProps) {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
  // Real-time updates
  const { listing: liveListing, connected } = useListingUpdates(initialProject.id);
  const project = liveListing || initialProject;

  const progress = (project.amountRaised / project.fundingGoal) * 100;
  const remaining = project.fundingGoal - project.amountRaised;

  const handleSelectTier = (tierId: string) => {
    setSelectedTier(tierId);
    setShowCheckout(true);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Failed to copy link. Please copy manually: ' + window.location.href);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('a') ||
      target.closest('[role="button"]') ||
      target.closest('.no-navigate')
    ) {
      return;
    }
    // Navigate to listing page
    router.push(`/listings/${project.id}`);
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" 
      onClick={handleCardClick}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-2xl font-bold mb-2">{project.name}</h2>
              <Badge variant="secondary">{project.category}</Badge>
            </div>
            
            {/* Company Profile */}
            <div className="flex items-center gap-3 pt-2">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {project.companyProfile.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-sm">{project.companyProfile.name}</p>
                <p className="text-xs text-muted-foreground">{project.companyProfile.bio}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {project.sellerEmail || 'None'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Share Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2 no-navigate"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Funding Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">${project.amountRaised.toLocaleString()}</span>
              {connected ? (
                <div title="Live updates active">
                  <Wifi className="h-3 w-3 text-green-500" />
                </div>
              ) : (
                <div title="Live updates disconnected">
                  <WifiOff className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
            <span className="text-muted-foreground">of ${project.fundingGoal.toLocaleString()} goal</span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{project.backers} backers</span>
            <span>{project.daysLeft} days left</span>
          </div>
        </div>

        {showFullDetails ? (
          <>
            {/* Expandable Description */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="description">
                <AccordionTrigger>
                  Product Description
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="h-64 w-full pr-4">
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {project.description || 'No description provided.'}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Funding Tiers - Expandable */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="backing">
                <AccordionTrigger>
                  Back this project
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Select a reward tier</p>
                    
                    <div className="space-y-3">
                      {project.tiers.map((tier) => (
                        <Card
                          key={tier.id}
                          className={`cursor-pointer transition-all ${
                            selectedTier === tier.id
                              ? 'border-primary border-2 bg-primary/5'
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => handleSelectTier(tier.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{tier.name}</h4>
                                  {selectedTier === tier.id && (
                                    <Check className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{tier.description}</p>
                                <ul className="text-sm space-y-1 mt-2">
                                  {tier.rewards.map((reward, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <Check className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                                      <span>{reward}</span>
                                    </li>
                                  ))}
                                </ul>
                                {tier.estimatedDelivery && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Estimated delivery: {tier.estimatedDelivery}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold">${tier.amount}</div>
                                <Button
                                  size="sm"
                                  className="mt-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectTier(tier.id);
                                  }}
                                >
                                  Select
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Comments Section - Expandable */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="comments">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comments
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <ProjectComments projectId={project.id} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowComments(true)}
                      className="w-full gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      View All Comments
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        ) : (
          /* Summary Section for grid view */
          <div className="space-y-2 pt-2">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{project.tiers?.length || 0} reward {project.tiers?.length === 1 ? 'tier' : 'tiers'}</span>
              <span>•</span>
              <span>From ${project.tiers && project.tiers.length > 0 ? Math.min(...project.tiers.map(t => t.amount)) : 0}</span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Checkout Sheet */}
      {showCheckout && selectedTier && (
        <ProjectCheckout
          project={project}
          tier={project.tiers.find(t => t.id === selectedTier)!}
          open={showCheckout}
          onOpenChange={setShowCheckout}
          onComplete={onBack}
        />
      )}

      {/* Comments Dialog */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
            <DialogDescription>
              Community discussions about {project.name}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ProjectComments projectId={project.id} fullView />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

