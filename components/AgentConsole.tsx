'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Play, Zap } from 'lucide-react';

interface ActivityLog {
  timestamp: number;
  action: string;
  details: string;
  status: 'success' | 'error' | 'pending';
}

export default function AgentConsole() {
  const [budget, setBudget] = useState('100');
  const [preferences, setPreferences] = useState('');
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);

  const addLog = (action: string, details: string, status: ActivityLog['status'] = 'success') => {
    setActivityLog(prev => [{
      timestamp: Date.now(),
      action,
      details,
      status,
    }, ...prev]);
  };

  const handleStartMatching = async () => {
    if (!budget || !preferences) {
      alert('Please set budget and preferences');
      return;
    }

    setIsActive(true);
    addLog('Agent Started', 'Beginning investment matching process', 'pending');

    try {
      const response = await fetch('/api/agent/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget: parseFloat(budget),
          preferences,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to match investments');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
      setAllocations(data.allocations || []);
      
      const totalAllocated = data.allocations.reduce((sum: number, a: { amount: number }) => sum + a.amount, 0);
      addLog(
        'Matching Complete',
        `Found ${data.totalProjects} projects, allocated $${totalAllocated.toFixed(2)}`,
        'success'
      );
    } catch (error) {
      addLog('Matching Failed', error instanceof Error ? error.message : 'Unknown error', 'error');
    } finally {
      setIsActive(false);
    }
  };

  const handleExecuteInvestments = async () => {
    if (allocations.length === 0) {
      alert('No investments to execute. Run matching first.');
      return;
    }

    setIsActive(true);
    addLog('Executing Investments', `Processing ${allocations.length} investments`, 'pending');

    try {
      const walletId = 'wallet_mock_' + Date.now();
      const response = await fetch('/api/invest/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investments: allocations,
          walletId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to execute investments');
      }

      const data = await response.json();
      addLog(
        'Investments Executed',
        `Successfully invested in ${data.summary.successful} projects. Total: $${data.summary.totalInvested.toFixed(2)}`,
        'success'
      );
      
      setAllocations([]);
    } catch (error) {
      addLog('Investment Failed', error instanceof Error ? error.message : 'Unknown error', 'error');
    } finally {
      setIsActive(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Budget Settings</CardTitle>
          <CardDescription>Configure your investment budget</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Total Budget (USDC)</Label>
              <Input
                id="budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="100"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preference Tuning</CardTitle>
          <CardDescription>Describe your investment preferences in natural language</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="preferences">Investment Preferences</Label>
              <Textarea
                id="preferences"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                rows={4}
                placeholder="e.g., $50 for keyboard projects, $100 for drone development"
              />
            </div>
            <Button
              onClick={handleStartMatching}
              disabled={isActive}
              className="w-full gap-2"
            >
              <Play className="h-4 w-4" />
              {isActive ? 'Matching...' : 'Start AI Matching'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Recommendations
            </CardTitle>
            <CardDescription>
              Projects matched to your preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {recommendations.map((rec) => (
                <div key={rec.projectId} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{rec.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rec.matchReason}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant="secondary" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        {rec.score}
                      </Badge>
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                        ${rec.suggestedAmount?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {allocations.length > 0 && (
              <Button
                onClick={handleExecuteInvestments}
                disabled={isActive}
                className="w-full gap-2"
                variant="default"
              >
                <Zap className="h-4 w-4" />
                {isActive ? 'Executing...' : `Execute ${allocations.length} Investments`}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Track agent actions and results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activityLog.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No activity yet</p>
            ) : (
              activityLog.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border-l-4 ${
                    log.status === 'success' 
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                      : log.status === 'error'
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                      : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">{log.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
