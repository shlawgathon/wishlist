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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, CheckCircle2, Edit, Sparkles, MapPin, Calendar, Tag } from 'lucide-react';

export default function CreatorDashboard() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fundingGoal: '',
    milestones: '',
    category: '',
    deadline: '',
    location: '',
  });
  const [loading, setLoading] = useState(false);
  const [createdProject, setCreatedProject] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    fundingGoal: '',
    milestones: '',
    category: '',
    deadline: '',
    location: '',
    status: 'ongoing' as 'ongoing' | 'completed',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'completed'>('all');

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
          deadline: formData.deadline,
          userId: 'user_' + Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const data = await response.json();
      setCreatedProject(data.project);
      setFormData({ title: '', description: '', fundingGoal: '', milestones: '', category: '', deadline: '', location: '' });
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

  const handleCreateTestProject = async () => {
    setLoading(true);
    try {
      const testProject = {
        title: 'Test Project - ' + new Date().toLocaleDateString(),
        description: 'This is a test project created to demonstrate the platform functionality. You can edit this project to customize it.',
        fundingGoal: '10000',
        milestones: 'Setup, Development, Testing, Launch',
        category: 'Technology',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        location: 'San Francisco, CA',
        userId: 'test_user_' + Date.now(),
      };

      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testProject,
          fundingGoal: parseFloat(testProject.fundingGoal),
          milestones: testProject.milestones.split(',').map(m => m.trim()).filter(m => m),
          deadline: testProject.deadline,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create test project');
      }

      const data = await response.json();
      setCreatedProject(data.project);
      loadProjects();
    } catch (error) {
      console.error('Error creating test project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create test project';
      alert(`Test project creation failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (project: any) => {
    setEditingProject(project);
    setEditFormData({
      title: project.title,
      description: project.description,
      fundingGoal: project.fundingGoal.toString(),
      milestones: project.milestones.join(', '),
      category: project.category || '',
      deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '',
      location: project.location || '',
      status: project.status || 'ongoing',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    setEditLoading(true);
    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          fundingGoal: parseFloat(editFormData.fundingGoal),
          milestones: editFormData.milestones,
          deadline: editFormData.deadline,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      setEditingProject(null);
      loadProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update project';
      alert(`Project update failed: ${errorMessage}`);
    } finally {
      setEditLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    if (statusFilter === 'all') return true;
    return project.status === statusFilter;
  });

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

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Technology, Art, Music"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., San Francisco, CA"
                  />
                </div>

                <div className="space-y-2">
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Creating...' : 'Create Project'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCreateTestProject}
                    disabled={loading}
                    className="w-full"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Test Project
                  </Button>
                </div>
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
                <>
                  {/* Status Filter */}
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant={statusFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter('all')}
                    >
                      All ({projects.length})
                    </Button>
                    <Button
                      variant={statusFilter === 'ongoing' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter('ongoing')}
                    >
                      Ongoing ({projects.filter(p => p.status === 'ongoing').length})
                    </Button>
                    <Button
                      variant={statusFilter === 'completed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter('completed')}
                    >
                      Completed ({projects.filter(p => p.status === 'completed').length})
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {filteredProjects.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">
                          No {statusFilter === 'all' ? '' : statusFilter} projects found.
                        </p>
                      </div>
                    ) : (
                      filteredProjects.map((project) => {
                        const progress = (project.currentFunding / project.fundingGoal) * 100;
                        const isCompleted = project.status === 'completed';
                        return (
                          <div 
                            key={project.id} 
                            className={`border rounded-lg p-4 space-y-3 ${
                              isCompleted ? 'opacity-75 bg-muted/30' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold">{project.title}</h3>
                                <div className="flex gap-2 mt-1">
                                  {project.status === 'completed' ? (
                                    <Badge variant="secondary" className="gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Completed
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="gap-1">
                                      Ongoing
                                    </Badge>
                                  )}
                                  {progress >= 100 && project.status !== 'completed' && (
                                    <Badge variant="default" className="gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Funded
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(project)}
                                className="ml-2"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {project.description}
                            </p>
                            {(project.category || project.location || project.deadline) && (
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {project.category && (
                                  <div className="flex items-center gap-1">
                                    <Tag className="h-3 w-3" />
                                    <span>{project.category}</span>
                                  </div>
                                )}
                                {project.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{project.location}</span>
                                  </div>
                                )}
                                {project.deadline && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(project.deadline).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-semibold">
                                  ${project.currentFunding.toLocaleString()} / ${project.fundingGoal.toLocaleString()}
                                </span>
                              </div>
                              <Progress value={Math.min(progress, 100)} className="h-2" />
                            </div>
                            {progress >= 100 && project.status !== 'completed' && (
                              <Button className="w-full" variant="default">
                                Withdraw Funds
                              </Button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Edit Project Dialog */}
          <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit Project</DialogTitle>
                <DialogDescription>
                  Update your project details. Changes will be saved immediately.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Project Title</Label>
                  <Input
                    id="edit-title"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-fundingGoal">Funding Goal (USDC)</Label>
                  <Input
                    id="edit-fundingGoal"
                    type="number"
                    value={editFormData.fundingGoal}
                    onChange={(e) => setEditFormData({ ...editFormData, fundingGoal: e.target.value })}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-milestones">Milestones (comma-separated)</Label>
                  <Input
                    id="edit-milestones"
                    value={editFormData.milestones}
                    onChange={(e) => setEditFormData({ ...editFormData, milestones: e.target.value })}
                    placeholder="e.g., Prototype, Beta, Launch"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Input
                    id="edit-category"
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    placeholder="e.g., Technology, Art, Music"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-deadline">Deadline</Label>
                  <Input
                    id="edit-deadline"
                    type="date"
                    value={editFormData.deadline}
                    onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-location">Location (Optional)</Label>
                  <Input
                    id="edit-location"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    placeholder="e.g., San Francisco, CA"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-status">Project Status</Label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(value) => setEditFormData({ ...editFormData, status: value as 'ongoing' | 'completed' })}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingProject(null)}
                    disabled={editLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editLoading}>
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
