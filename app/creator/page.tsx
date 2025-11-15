'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle2 } from 'lucide-react';

export default function CreatorDashboard() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fundingGoal: '',
    milestones: '',
  });
  const [loading, setLoading] = useState(false);
  const [createdProject, setCreatedProject] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fundingGoal: parseFloat(formData.fundingGoal),
          milestones: formData.milestones.split(',').map(m => m.trim()).filter(m => m),
          userId: 'user_' + Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const data = await response.json();
      setCreatedProject(data.project);
      setFormData({ title: '', description: '', fundingGoal: '', milestones: '' });
      loadProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create project';
      alert(`Project creation failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects/create');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Creator Dashboard</h1>
          <p className="text-muted-foreground">Create and manage your fundraising projects</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Project
              </CardTitle>
              <CardDescription>
                Launch a new fundraising campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Project Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fundingGoal">Funding Goal (USDC)</Label>
                  <Input
                    id="fundingGoal"
                    type="number"
                    value={formData.fundingGoal}
                    onChange={(e) => setFormData({ ...formData, fundingGoal: e.target.value })}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="milestones">Milestones (comma-separated)</Label>
                  <Input
                    id="milestones"
                    value={formData.milestones}
                    onChange={(e) => setFormData({ ...formData, milestones: e.target.value })}
                    placeholder="e.g., Prototype, Beta, Launch"
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Creating...' : 'Create Project'}
                </Button>
              </form>

              {createdProject && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-green-800 dark:text-green-200">Project Created!</h3>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Wallet: {createdProject.creatorWallet.substring(0, 10)}...
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Project ID: {createdProject.id}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Projects</CardTitle>
              <CardDescription>
                Track funding progress for your projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No projects yet. Create one to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => {
                    const progress = (project.currentFunding / project.fundingGoal) * 100;
                    return (
                      <div key={project.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold">{project.title}</h3>
                          {progress >= 100 && (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Funded
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-semibold">
                              ${project.currentFunding.toLocaleString()} / ${project.fundingGoal.toLocaleString()}
                            </span>
                          </div>
                          <Progress value={Math.min(progress, 100)} className="h-2" />
                        </div>
                        {progress >= 100 && (
                          <Button className="w-full" variant="default">
                            Withdraw Funds
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
