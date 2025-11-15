'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Share2, Check } from 'lucide-react';
import type { ProjectListing, ProjectTier } from '@/types/project';
import ProjectCheckout from './ProjectCheckout';
import ProjectComments from './ProjectComments';

interface ProjectListingProps {
  project: ProjectListing;
  onBack?: (projectId: string, tierId: string, amount: number) => void;
}

export default function ProjectListing({ project, onBack }: ProjectListingProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const progress = (project.amountRaised / project.fundingGoal) * 100;
  const remaining = project.fundingGoal - project.amountRaised;

  const handleSelectTier = (tierId: string) => {
    setSelectedTier(tierId);
    setShowCheckout(true);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: project.name,
          text: project.description,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
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
              <div>
                <p className="font-semibold text-sm">{project.companyProfile.name}</p>
                <p className="text-xs text-muted-foreground">{project.companyProfile.bio}</p>
              </div>
            </div>
          </div>

          {/* Share Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2"
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
            <span className="text-2xl font-bold">${project.amountRaised.toLocaleString()}</span>
            <span className="text-muted-foreground">of ${project.fundingGoal.toLocaleString()} goal</span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{project.backers} backers</span>
            <span>{project.daysLeft} days left</span>
          </div>
        </div>

        <Separator />

        {/* Expandable Description */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="description">
            <AccordionTrigger className="text-sm font-medium">
              Product Description
            </AccordionTrigger>
            <AccordionContent>
              <ScrollArea className="h-64 w-full pr-4">
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {project.fullDescription}
                </div>
              </ScrollArea>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Separator />

        {/* Funding Tiers - Expandable */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="backing">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">Back this project</h3>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
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

        <Separator />

        {/* Comments Section - Expandable */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="comments">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <h3 className="font-semibold text-lg">Comments</h3>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
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

