// src/services/progress.service.ts
import {
  ManuscriptWorkspace,
  ManuscriptSection,
  ResearchTask,
  ResearchMilestone,
} from '../types/researchWorkspace.types';

export const progressService = {
  /**
   * Calculate task completion statistics
   */
  calculateTaskProgress(tasks: ResearchTask[]): {
    completed: number;
    total: number;
    percentage: number;
  } {
    if (!tasks || tasks.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const completed = tasks.filter(
      (t) => t.status === 'completed'
    ).length;
    const total = tasks.length;
    const percentage = Math.round((completed / total) * 100);

    return { completed, total, percentage };
  },

  /**
   * Calculate manuscript sections average completion
   */
  calculateSectionProgress(sections: ManuscriptSection[]): {
    completed: number;
    total: number;
    percentage: number;
  } {
    if (!sections || sections.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    let totalPoints = 0;
    let completedCount = 0;

    sections.forEach((sec) => {
      if (sec.status === 'completed') {
        totalPoints += 100;
        completedCount += 1;
      } else if (sec.status === 'under_review' || sec.status === 'submitted') {
        totalPoints += 75;
      } else if (sec.status === 'revision_required') {
        totalPoints += 50;
      } else if (sec.status === 'in_progress') {
        totalPoints += sec.progress || 35;
      }
    });

    const percentage = Math.round(totalPoints / (sections.length * 100) * 100);
    return {
      completed: completedCount,
      total: sections.length,
      percentage: Math.min(100, Math.max(0, percentage)),
    };
  },

  /**
   * Determine milestone step progression
   */
  getResearchMilestones(
    workspace: ManuscriptWorkspace | null,
    tasks: ResearchTask[] = []
  ): ResearchMilestone[] {
    const isProposalApproved = Boolean(workspace?.proposalId);
    const isAdviserAssigned = Boolean(workspace?.adviserId);

    const sections = workspace?.sections || [];
    const ch1 = sections.find((s) => s.id === 'chapter_1');
    const ch2 = sections.find((s) => s.id === 'chapter_2');
    const ch3 = sections.find((s) => s.id === 'chapter_3');
    const ch4 = sections.find((s) => s.id === 'chapter_4');
    const ch5 = sections.find((s) => s.id === 'chapter_5');
    const finalDoc = sections.find((s) => s.id === 'final_manuscript');

    return [
      {
        id: 'm1_proposal',
        title: 'Title Proposal Approved',
        description: 'Research concept & problem formulation verified by coordinator',
        completed: isProposalApproved,
        active: !isProposalApproved,
      },
      {
        id: 'm2_adviser',
        title: 'Adviser Assigned',
        description: 'Faculty mentor matched and confirmed to guide study',
        completed: isAdviserAssigned,
        active: isProposalApproved && !isAdviserAssigned,
      },
      {
        id: 'm3_ch1',
        title: 'Chapter 1: Introduction',
        description: 'Rationale, problem statement, and study objectives drafted',
        completed: ch1?.status === 'completed',
        active: isAdviserAssigned && ch1?.status !== 'completed',
      },
      {
        id: 'm4_ch2',
        title: 'Chapter 2: Literature Review',
        description: 'Theoretical framework and literature matrix compiled',
        completed: ch2?.status === 'completed',
        active: ch1?.status === 'completed' && ch2?.status !== 'completed',
      },
      {
        id: 'm5_ch3',
        title: 'Chapter 3: Methodology',
        description: 'System architecture, design, and research methods defined',
        completed: ch3?.status === 'completed',
        active: ch2?.status === 'completed' && ch3?.status !== 'completed',
      },
      {
        id: 'm6_ch4_5',
        title: 'Chapters 4–5: Results & Discussion',
        description: 'Implementation, analysis, and recommendations concluded',
        completed: ch4?.status === 'completed' && ch5?.status === 'completed',
        active: ch3?.status === 'completed' && (ch4?.status !== 'completed' || ch5?.status !== 'completed'),
      },
      {
        id: 'm7_final',
        title: 'Final Manuscript Defense Ready',
        description: 'Complete manuscript approved for defense and institutional archiving',
        completed: finalDoc?.status === 'completed' || workspace?.status === 'completed',
        active: ch4?.status === 'completed' && ch5?.status === 'completed' && finalDoc?.status !== 'completed',
      },
    ];
  },

  /**
   * Centralized dynamic calculation of overall research progress percentage
   * Weighted formula:
   * - Proposal & Adviser Milestones: 20%
   * - Manuscript Sections: 50%
   * - Assigned Tasks: 30% (or 0% if no tasks yet, gracefully redistributing to sections)
   */
  calculateOverallProgress(
    workspace: ManuscriptWorkspace | null,
    tasks: ResearchTask[] = []
  ): number {
    if (!workspace) return 0;

    // 1. Milestones component (Base 20%)
    let milestoneScore = 0;
    if (workspace.proposalId) milestoneScore += 10;
    if (workspace.adviserId) milestoneScore += 10;

    // 2. Sections component (Max 50%)
    const { percentage: sectionPct } = this.calculateSectionProgress(
      workspace.sections || []
    );

    // 3. Tasks component (Max 30%)
    if (tasks && tasks.length > 0) {
      const { percentage: taskPct } = this.calculateTaskProgress(tasks);
      const overall = Math.round(
        milestoneScore + (sectionPct * 0.5) + (taskPct * 0.3)
      );
      return Math.min(100, Math.max(0, overall));
    } else {
      // If no tasks created yet by adviser, distribute 80% to sections
      const overall = Math.round(milestoneScore + (sectionPct * 0.8));
      return Math.min(100, Math.max(0, overall));
    }
  },
};

export default progressService;
