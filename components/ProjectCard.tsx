'use client';

import { useState } from 'react';
import InvestmentModal from './InvestmentModal';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles } from 'lucide-react';

export interface Project {
  id: string;
  title: string;
  description: string;
  fundingGoal: number;
  currentFunding: number;
  score?: number;
  matchReason?: string;
  suggestedAmount?: number;
}

interface ProjectCardProps {
  project: Project;
  onInvest?: (projectId: string, amount: number) => void;
}

export default function ProjectCard({ project, onInvest }: ProjectCardProps) {
  const [showModal, setShowModal] = useState(false);
  const fundingProgress = (project.currentFunding / project.fundingGoal) * 100;

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl">{project.title}</CardTitle>
            {project.score && (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                {project.score}
              </Badge>
            )}
          </div>
          <CardDescription className="line-clamp-2 mt-2">
            {project.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {project.matchReason && (
            <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
              <p className="text-sm text-primary font-medium">{project.matchReason}</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Funding Progress</span>
              <span className="font-semibold">
                ${project.currentFunding.toLocaleString()} / ${project.fundingGoal.toLocaleString()}
              </span>
            </div>
            <Progress value={Math.min(fundingProgress, 100)} className="h-2" />
          </div>

          {project.suggestedAmount && (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-900">
              <span className="text-sm text-muted-foreground">Suggested Investment</span>
              <span className="font-bold text-green-600 dark:text-green-400">
                ${project.suggestedAmount.toFixed(2)}
              </span>
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Button
            onClick={() => setShowModal(true)}
            className="w-full"
            disabled={fundingProgress >= 100}
          >
            {fundingProgress >= 100 ? 'Fully Funded' : 'Invest Now'}
          </Button>
        </CardFooter>
      </Card>

      {showModal && (
        <InvestmentModal
          project={project}
          onClose={() => setShowModal(false)}
          onInvest={onInvest}
        />
      )}
    </>
  );
}
