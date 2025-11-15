/**
 * Investment Analyzer
 * Scores and ranks projects based on investment criteria
 */

export interface Project {
  id: string;
  title: string;
  description: string;
  category?: string;
  fundingGoal: number;
  currentFunding: number;
  creator?: string;
}

export interface InvestmentCriteria {
  budget: number;
  preferences: string;
  categories?: string[];
}

export interface ScoredProject extends Project {
  score: number;
  matchReason: string;
  suggestedAmount: number;
}

/**
 * Score a single project based on criteria
 */
export function scoreProject(
  project: Project,
  criteria: InvestmentCriteria
): ScoredProject {
  let score = 50; // Base score
  const reasons: string[] = [];

  // Check category match
  if (criteria.categories && criteria.categories.length > 0) {
    const categoryMatch = criteria.categories.some(cat =>
      project.category?.toLowerCase().includes(cat.toLowerCase()) ||
      project.title.toLowerCase().includes(cat.toLowerCase()) ||
      project.description.toLowerCase().includes(cat.toLowerCase())
    );
    if (categoryMatch) {
      score += 20;
      reasons.push('Category match');
    }
  }

  // Check keyword match in preferences
  const preferenceKeywords = criteria.preferences.toLowerCase().split(/\s+/);
  const projectText = `${project.title} ${project.description}`.toLowerCase();
  const keywordMatches = preferenceKeywords.filter(keyword =>
    projectText.includes(keyword) && keyword.length > 3
  );
  if (keywordMatches.length > 0) {
    score += keywordMatches.length * 5;
    reasons.push(`${keywordMatches.length} keyword matches`);
  }

  // Check funding progress (prefer projects that need funding)
  const fundingProgress = project.currentFunding / project.fundingGoal;
  if (fundingProgress < 0.5) {
    score += 10;
    reasons.push('Needs funding');
  } else if (fundingProgress > 0.9) {
    score -= 5;
    reasons.push('Nearly funded');
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  // Calculate suggested amount (distribute budget proportionally)
  const suggestedAmount = Math.min(
    criteria.budget * (score / 100),
    project.fundingGoal - project.currentFunding
  );

  return {
    ...project,
    score,
    matchReason: reasons.join(', ') || 'General match',
    suggestedAmount: Math.max(0, suggestedAmount),
  };
}

/**
 * Score and rank multiple projects
 */
export function scoreAndRankProjects(
  projects: Project[],
  criteria: InvestmentCriteria
): ScoredProject[] {
  const scored = projects.map(project => scoreProject(project, criteria));
  
  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);
  
  return scored;
}

/**
 * Allocate budget across projects
 */
export function allocateBudget(
  scoredProjects: ScoredProject[],
  totalBudget: number
): Array<{ projectId: string; amount: number }> {
  const allocations: Array<{ projectId: string; amount: number }> = [];
  let remainingBudget = totalBudget;

  // Allocate based on suggested amounts, but ensure we don't exceed budget
  for (const project of scoredProjects) {
    if (remainingBudget <= 0) break;

    const amount = Math.min(project.suggestedAmount, remainingBudget);
    if (amount > 0) {
      allocations.push({
        projectId: project.id,
        amount,
      });
      remainingBudget -= amount;
    }
  }

  return allocations;
}

