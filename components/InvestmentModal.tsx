'use client';

import { useState } from 'react';
import { Project } from './ProjectCard';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface InvestmentModalProps {
  project: Project;
  onClose: () => void;
  onInvest?: (projectId: string, amount: number) => void;
}

export default function InvestmentModal({ project, onClose, onInvest }: InvestmentModalProps) {
  const [amount, setAmount] = useState(project.suggestedAmount?.toString() || '');
  const [loading, setLoading] = useState(false);

  const handleInvest = async () => {
    const investAmount = parseFloat(amount);
    if (isNaN(investAmount) || investAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (investAmount > project.fundingGoal - project.currentFunding) {
      alert(`Maximum investment is $${(project.fundingGoal - project.currentFunding).toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      if (onInvest) {
        await onInvest(project.id, investAmount);
      }
      onClose();
    } catch (error) {
      console.error('Investment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process investment';
      alert(`Investment failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invest in {project.title}</DialogTitle>
          <DialogDescription>
            Enter the amount you'd like to invest in this project.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Investment Amount (USDC)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="0"
              max={project.fundingGoal - project.currentFunding}
              step="0.01"
            />
            <p className="text-sm text-muted-foreground">
              Remaining: ${(project.fundingGoal - project.currentFunding).toLocaleString()}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleInvest} disabled={loading}>
            {loading ? 'Processing...' : 'Confirm Investment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
