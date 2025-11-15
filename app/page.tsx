'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ProjectCard, { Project } from '@/components/ProjectCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp } from 'lucide-react';

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [recommendations, setRecommendations] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<Array<{ projectId: string; amount: number }>>([]);

  useEffect(() => {
    loadProjects();
    loadRecommendations();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects/create');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const response = await fetch('/api/x402/discover');
      if (response.ok) {
        const data = await response.json();
        const recommendedProjects: Project[] = data.services.map((service: any) => ({
          id: service.id,
          title: service.name,
          description: service.description,
          fundingGoal: parseFloat(service.pricing.amount),
          currentFunding: 0,
        }));
        setRecommendations(recommendedProjects);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const handleInvest = async (projectId: string, amount: number) => {
    try {
      const walletId = 'wallet_mock_' + Date.now();

      const response = await fetch('/api/invest/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investments: [{ projectId, amount }],
          walletId,
          userId: 'user_' + Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error('Investment failed');
      }

      const data = await response.json();
      setInvestments(prev => [...prev, { projectId, amount }]);
      alert(`Successfully invested $${amount} in project!`);
      loadProjects();
    } catch (error) {
      console.error('Investment error:', error);
      alert('Failed to process investment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Discover and invest in innovative projects</p>
        </div>

        {recommendations.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold">AI Recommendations</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onInvest={handleInvest}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Featured Projects</h2>
          </div>
          {projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No projects available yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onInvest={handleInvest}
                />
              ))}
            </div>
          )}
        </section>

        {investments.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-6">Your Investments</h2>
            <Card>
              <CardHeader>
                <CardTitle>Investment History</CardTitle>
                <CardDescription>Track your active investments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {investments.map((investment, idx) => {
                    const project = [...projects, ...recommendations].find(
                      p => p.id === investment.projectId
                    );
                    return (
                      <div key={idx} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                        <div>
                          <p className="font-semibold">
                            {project?.title || `Project ${investment.projectId}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date().toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600 dark:text-green-400">
                            ${investment.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">USDC</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total Invested</span>
                    <span className="font-bold text-primary text-lg">
                      ${investments.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}
