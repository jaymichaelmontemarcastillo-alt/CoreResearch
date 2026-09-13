// src/services/progress.service.ts
import {
  ManuscriptWorkspace,
  ManuscriptSection,
  ResearchTask,
  ResearchMilestone,
  ResearchFeedback,
  DEFAULT_MANUSCRIPT_SECTIONS,
} from '../types/researchWorkspace.types';

export const MANUSCRIPT_CHAPTERS = [
  {
    id: 'chapter_1',
    order: 1,
    title: 'Chapter 1: The Problem and Its Background',
    shortTitle: 'Chapter 1: Introduction',
    focusTitle: 'CHAPTER 1 — THE PROBLEM & ITS BACKGROUND',
    description: 'Introduction, statement of the problem, and research objectives',
  },
  {
    id: 'chapter_2',
    order: 2,
    title: 'Chapter 2: Review of Related Literature and Studies',
    shortTitle: 'Chapter 2: Literature Review',
    focusTitle: 'CHAPTER 2 — LITERATURE REVIEW',
    description: 'Theoretical framework, related research, and literature matrix',
  },
  {
    id: 'chapter_3',
    order: 3,
    title: 'Chapter 3: Methodology',
    shortTitle: 'Chapter 3: Methodology',
    focusTitle: 'CHAPTER 3 — METHODOLOGY',
    description: 'Research design, data collection, and system architecture',
  },
  {
    id: 'chapter_4',
    order: 4,
    title: 'Chapter 4: Results and Discussion',
    shortTitle: 'Chapter 4: Results & Discussion',
    focusTitle: 'CHAPTER 4 — RESULTS & DISCUSSION',
    description: 'Empirical data analysis, system evaluation, and findings',
  },
  {
    id: 'chapter_5',
    order: 5,
    title: 'Chapter 5: Summary, Conclusions, and Recommendations',
    shortTitle: 'Chapter 5: Summary & Conclusions',
    focusTitle: 'CHAPTER 5 — SUMMARY & RECOMMENDATIONS',
    description: 'Synthesis of findings, conclusions, and institutional recommendations',
  },
];

export const progressService = {
  /**
   * Helper to determine if a task is resolved or completed
   */
  isTaskResolved(task: ResearchTask | any): boolean {
    if (!task) return false;
    return task.status === 'completed' || task.status === 'resolved';
  },

  /**
   * Helper to determine if a feedback item is resolved
   */
  isFeedbackResolved(feedback: ResearchFeedback | any): boolean {
    if (!feedback) return false;
    return feedback.status === 'resolved' || feedback.status === 'addressed';
  },

  /**
   * Calculate task & adviser action item completion statistics
   */
  calculateTaskProgress(
    tasks: ResearchTask[] = [],
    feedbacks: any[] = []
  ): {
    completed: number;
    total: number;
    percentage: number;
  } {
    const validTasks = tasks || [];
    const validFeedbacks = feedbacks || [];

    const completedTasks = validTasks.filter((t) => this.isTaskResolved(t)).length;
    const completedFeedbacks = validFeedbacks.filter((f) => this.isFeedbackResolved(f)).length;

    const total = validTasks.length + validFeedbacks.length;
    const completed = completedTasks + completedFeedbacks;

    if (total === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const percentage = Math.round((completed / total) * 100);
    return { completed, total, percentage };
  },

  /**
   * Dynamically augment sections strictly for Chapters 1 through 5
   */
  getDynamicSections(
    workspace: ManuscriptWorkspace | null,
    tasks: ResearchTask[] = [],
    feedbacks: any[] = []
  ): ManuscriptSection[] {
    const existingSections = workspace?.sections || [];
    const validTasks = tasks || [];
    const validFeedbacks = feedbacks || [];

    return MANUSCRIPT_CHAPTERS.map((chapDef, idx) => {
      // Find matching section in workspace by ID or order
      let sec = existingSections.find(
        (s) => s.id === chapDef.id || s.order === chapDef.order
      );

      if (!sec) {
        sec = {
          id: chapDef.id,
          name: chapDef.title,
          order: chapDef.order,
          status: 'not_started',
          progress: 0,
        };
      }

      // Find tasks assigned to this specific chapter
      const secTasks = validTasks.filter(
        (t) =>
          t.sectionId === sec.id ||
          (t.title && t.title.toLowerCase().includes(sec.id.replace('_', ' '))) ||
          (t.title && sec.name && t.title.toLowerCase().includes(sec.name.toLowerCase()))
      );

      // Find feedback assigned to this section
      const secFeedbacks = validFeedbacks.filter(
        (f) =>
          f.sectionId === sec.id ||
          (f.comment && f.comment.toLowerCase().includes(sec.id.replace('_', ' ')))
      );

      const totalItems = secTasks.length + secFeedbacks.length;
      let dynamicStatus = sec.status || 'not_started';

      if (dynamicStatus === 'pending') {
        dynamicStatus = 'not_started';
      }

      // If already approved/completed by adviser, it remains completed
      if (sec.status === 'completed') {
        return {
          ...sec,
          name: chapDef.title,
          order: idx + 1,
          status: 'completed',
          progress: 100,
        };
      }

      // If submitted, it is waiting for review
      if (sec.status === 'submitted' || sec.status === 'under_review') {
        return {
          ...sec,
          name: chapDef.title,
          order: idx + 1,
          status: 'submitted',
          progress: 75,
        };
      }

      // If revision required, mark as revision_required
      if (sec.status === 'revision_required') {
        return {
          ...sec,
          name: chapDef.title,
          order: idx + 1,
          status: 'revision_required',
          progress: 50,
        };
      }

      // If students have active tasks or resolved items, advance from not_started to in_progress
      if (totalItems > 0) {
        const resolvedItems =
          secTasks.filter((t) => this.isTaskResolved(t)).length +
          secFeedbacks.filter((f) => this.isFeedbackResolved(f)).length;

        if (resolvedItems > 0 || secTasks.length > 0) {
          dynamicStatus = 'in_progress';
        }

        const dynamicPercentage = Math.max(
          25,
          Math.round((resolvedItems / totalItems) * 100)
        );

        return {
          ...sec,
          name: chapDef.title,
          order: idx + 1,
          status: dynamicStatus,
          progress: dynamicPercentage,
        };
      }

      return {
        ...sec,
        name: chapDef.title,
        order: idx + 1,
        status: dynamicStatus,
        progress: dynamicStatus === 'in_progress' ? Math.max(25, sec.progress || 25) : 0,
      };
    });
  },

  /**
   * Calculate manuscript sections completion (strictly 5 chapters, up to 20% each)
   */
  calculateSectionProgress(
    sections: ManuscriptSection[] = []
  ): {
    completed: number;
    total: number;
    percentage: number;
  } {
    const chapterIds = MANUSCRIPT_CHAPTERS.map((c) => c.id);
    const chapters = (sections || []).filter((s) => chapterIds.includes(s.id));
    const completedCount = chapters.filter((s) => s.status === 'completed').length;

    let totalProgress = 0;
    chapters.forEach((chap) => {
      const chapterPct =
        typeof chap.progress === 'number'
          ? chap.progress
          : chap.status === 'completed'
          ? 100
          : 0;
      const clampedPct = Math.min(100, Math.max(0, chapterPct));
      totalProgress += (clampedPct / 100) * 20;
    });

    return {
      completed: completedCount,
      total: 5,
      percentage: Math.min(100, Math.max(0, Math.round(totalProgress))),
    };
  },

  /**
   * Calculate overall manuscript progress based on Chapters 1–5.
   * Each chapter represents 20% of total manuscript progress.
   * In-progress chapters contribute their proportional percentage (up to 20% each)
   * so that overall progress dynamically and fluidly reflects real manuscript advancement
   * (e.g. 25%, 30%, 35%, etc. instead of only jumping at 20, 40, 60, 80, 100).
   */
  calculateWorkspaceProgress(
    workspace: ManuscriptWorkspace | null,
    tasks: ResearchTask[] = [],
    feedbacks: any[] = []
  ): number {
    if (!workspace) return 0;

    const dynamicSections = this.getDynamicSections(workspace, tasks, feedbacks);
    const chapterIds = MANUSCRIPT_CHAPTERS.map((c) => c.id);
    const chapters = dynamicSections.filter((s) => chapterIds.includes(s.id));

    let totalProgress = 0;
    chapters.forEach((chap) => {
      const chapterPct =
        typeof chap.progress === 'number'
          ? chap.progress
          : chap.status === 'completed'
          ? 100
          : 0;
      const clampedPct = Math.min(100, Math.max(0, chapterPct));
      totalProgress += (clampedPct / 100) * 20;
    });

    return Math.min(100, Math.max(0, Math.round(totalProgress)));
  },

  /**
   * Determine exactly 5 research manuscript milestones for Chapters 1 through 5
   */
  getResearchMilestones(
    workspace: ManuscriptWorkspace | null,
    tasks: ResearchTask[] = [],
    feedbacks: any[] = []
  ): ResearchMilestone[] {
    const sections = this.getDynamicSections(workspace, tasks, feedbacks);
    let foundActive = false;

    return MANUSCRIPT_CHAPTERS.map((chap, idx) => {
      const sec = sections.find((s) => s.id === chap.id);
      const isCompleted = sec?.status === 'completed';

      let isActive = false;
      if (!isCompleted && !foundActive) {
        isActive = true;
        foundActive = true;
      }

      return {
        id: chap.id,
        title: chap.title,
        description: chap.description,
        completed: isCompleted,
        active: isActive,
        status: sec?.status || 'not_started',
        order: idx + 1,
        progress: typeof sec?.progress === 'number' ? sec.progress : (isCompleted ? 100 : 0),
        submittedAt: sec?.submittedAt,
        reviewedAt: sec?.reviewedAt,
        completedAt: sec?.completedAt,
      } as ResearchMilestone;
    });
  },

  /**
   * Determine the current single focus area chapter (e.g. "CHAPTER 3 — METHODOLOGY")
   */
  getCurrentFocusArea(
    workspace: ManuscriptWorkspace | null,
    tasks: ResearchTask[] = [],
    feedbacks: any[] = []
  ): string {
    const milestones = this.getResearchMilestones(workspace, tasks, feedbacks);
    const activeMilestone = milestones.find((m) => !m.completed);

    if (!activeMilestone) {
      return 'COMPLETED — ALL CHAPTERS APPROVED';
    }

    const chapDef = MANUSCRIPT_CHAPTERS.find((c) => c.id === activeMilestone.id);
    return chapDef?.focusTitle || `CHAPTER ${activeMilestone.order || 1}`;
  },

  /**
   * Calculate group progress for a research group ID (5 chapters basis)
   */
  async getGroupProgress(
    groupId: string
  ): Promise<{ overallProgress: number; completedChapters: number }> {
    try {
      const { researchWorkspaceService } = await import('./researchWorkspace.service');
      const ws = await researchWorkspaceService.getWorkspaceByStudentOrGroup('', groupId);
      if (!ws) return { overallProgress: 0, completedChapters: 0 };
      const dynamicSections = this.getDynamicSections(ws, [], []);
      const chapterIds = MANUSCRIPT_CHAPTERS.map((c) => c.id);
      const completedCount = dynamicSections.filter(
        (s) => chapterIds.includes(s.id) && s.status === 'completed'
      ).length;
      const overallProgress = Math.min(100, Math.max(0, Math.round((completedCount / 5) * 100)));
      return { overallProgress, completedChapters: completedCount };
    } catch (err) {
      return { overallProgress: 0, completedChapters: 0 };
    }
  },

  /**
   * Backward-compatible calculateOverallProgress
   */
  calculateOverallProgress(
    workspace: ManuscriptWorkspace | null,
    tasks: ResearchTask[] = []
  ): number {
    return this.calculateWorkspaceProgress(workspace, tasks, []);
  },
};

export default progressService;
