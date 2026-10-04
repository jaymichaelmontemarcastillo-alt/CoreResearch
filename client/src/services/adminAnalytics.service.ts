// src/services/adminAnalytics.service.ts
import { userService } from './user.service';
import { titleProposalService } from './titleProposal.service';
import { researchWorkspaceService } from './researchWorkspace.service';
import { groupService } from './group.service';
import { courseService } from './course.service';
import { UserProfile } from '../types/user.types';
import { TitleProposal } from '../types/proposal.types';
import { ManuscriptWorkspace } from '../types/researchWorkspace.types';
import { ResearchGroup } from '../types/group.types';
import { Course } from '../types/course.types';

export interface AnalyticsFilterOptions {
  academicYear?: string; // 'all' | '2025-2026' | ...
  semester?: string;     // 'all' | '1st' | '2nd' | 'summer'
  program?: string;      // 'all' | courseId
}

export interface SummaryCardsData {
  totalStudents: number;
  activeProjects: number;
  pendingReviews: number;
  completedProjects: number;
}

export interface StatusDistributionItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface ProgressTrendItem {
  month: string;
  rawDate: string;
  progressing: number;
  approved: number;
  completed: number;
  totalActive: number;
}

export interface AdviserWorkloadItem {
  adviserId: string;
  adviserName: string;
  department?: string;
  assignedGroups: number;
  assignedProjects: number;
  studentCount: number;
  exceedsLimit: boolean;
}

export interface ProgramDistributionItem {
  courseId: string;
  courseCode: string;
  courseName: string;
  studentCount: number;
  percentage: number;
  color: string;
}

export interface ProposalStatusItem {
  statusKey: string;
  label: string;
  count: number;
  color: string;
  percentage: number;
}

export interface CompletionRateData {
  rate: number;
  completedCount: number;
  totalProjects: number;
  inProgressCount: number;
  underReviewCount: number;
}

export interface AdminAnalyticsDataset {
  summary: SummaryCardsData;
  statusDistribution: StatusDistributionItem[];
  progressTrend: ProgressTrendItem[];
  adviserWorkload: AdviserWorkloadItem[];
  studentsByProgram: ProgramDistributionItem[];
  proposalOverview: ProposalStatusItem[];
  completionRate: CompletionRateData;
  availableAcademicYears: string[];
  availableSemesters: { id: string; label: string }[];
  availablePrograms: { id: string; code: string; name: string }[];
}

export const RECOMMENDED_ADVISER_LIMIT = 5;

// Color mapping aligned with existing badges and status semantics
export const STATUS_COLORS = {
  titleProposal: '#8b5cf6',       // purple-500
  underReview: '#3b82f6',         // blue-500
  revisionRequired: '#f97316',    // orange-500
  approved: '#10b981',            // emerald-500
  manuscriptDev: '#06b6d4',       // cyan-500
  readyForDefense: '#6366f1',     // indigo-500
  completed: '#22c55e',           // green-500
  rejected: '#f43f5e',            // rose-500
  pending: '#f59e0b',             // amber-500
};

const PROGRAM_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#6366f1', // indigo
];

/**
 * Determine the academic year of a given ISO timestamp.
 * In typical higher education calendars:
 * August (month 7) through December (month 11) is 1st Sem of AY (year)-(year+1).
 * January (month 0) through July (month 6) belongs to AY (year-1)-(year).
 */
export function getAcademicYearFromDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = d.getMonth(); // 0 = Jan, 7 = Aug
  if (month >= 7) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

/**
 * Determine the semester of a given ISO timestamp.
 */
export function getSemesterFromDate(dateStr?: string | null): '1st' | '2nd' | 'summer' | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const month = d.getMonth(); // 0 = Jan, 11 = Dec
  if (month >= 7 && month <= 11) return '1st';
  if (month >= 0 && month <= 4) return '2nd';
  return 'summer';
}

export const adminAnalyticsService = {
  /**
   * Fetch all raw database entities concurrently.
   * DEPRECATED: Use fetchAnalyticsData(filters) for optimized, filtered fetching.
   */
  async fetchRawData() {
    return { users: [], proposals: [], workspaces: [], groups: [], courses: [] };
  },

  /**
   * Process raw data according to active filters.
   * DEPRECATED: Logic moved to fetchAnalyticsData.
   */
  processAnalytics(raw: any, filters: AnalyticsFilterOptions = {}): AdminAnalyticsDataset {
    return {} as AdminAnalyticsDataset;
  },

  /**
   * Optimized Phase 2 Analytics Fetcher.
   * Leverages Firestore where() clauses to drastically reduce payload,
   * and count() where full document bodies are not needed.
   */
  async fetchAnalyticsData(filters: AnalyticsFilterOptions = {}): Promise<AdminAnalyticsDataset> {
    const { getDocs, query, where, collection, getCountFromServer } = await import('firebase/firestore');
    const { db } = await import('../firebase/firebase');
    const { default: dataCache, CACHE_TTL } = await import('./dataCache');

    const filterAY = filters.academicYear && filters.academicYear !== 'all' ? filters.academicYear : null;
    const filterSem = filters.semester && filters.semester !== 'all' ? filters.semester : null;
    const filterProg = filters.program && filters.program !== 'all' ? filters.program.toLowerCase() : null;

    // 1. Build Base Constraints
    const wsConstraints = [];
    const propConstraints = [];
    const studentConstraints = [where('role', '==', 'student')];
    const groupConstraints = [];

    if (filterAY) {
      wsConstraints.push(where('academicYear', '==', filterAY));
      propConstraints.push(where('academicYear', '==', filterAY));
      studentConstraints.push(where('academicYear', '==', filterAY));
      groupConstraints.push(where('academicYear', '==', filterAY));
    }
    if (filterSem) {
      wsConstraints.push(where('semester', '==', filterSem));
      propConstraints.push(where('semester', '==', filterSem));
      studentConstraints.push(where('semester', '==', filterSem));
      groupConstraints.push(where('semester', '==', filterSem));
    }
    if (filterProg) {
      wsConstraints.push(where('courseId', '==', filterProg));
      propConstraints.push(where('courseId', '==', filterProg));
      studentConstraints.push(where('courseId', '==', filterProg));
      groupConstraints.push(where('courseId', '==', filterProg));
    }

    // 2. Setup Queries
    const wsQuery = query(collection(db, 'manuscript_workspaces'), ...wsConstraints);
    const propQuery = query(collection(db, 'proposals'), ...propConstraints);
    const studentQuery = query(collection(db, 'users'), ...studentConstraints);
    const advisersQuery = query(collection(db, 'users'), where('role', '==', 'adviser'));
    const groupsQuery = query(collection(db, 'research_groups'), ...groupConstraints);

    // 3. Execute Optimized Fetches
    // We fetch full filtered workspaces and proposals because we need them for Progress Trend and Status Distribution.
    // However, they are now strictly limited to the applied global filters!
    const [
      courses,
      filteredWsSnap,
      filteredPropSnap,
      filteredStudentsSnap,
      advisersSnap,
      filteredGroupsSnap
    ] = await Promise.all([
      dataCache.getOrFetch('courses', () => courseService.getAllCourses(), CACHE_TTL.STABLE).catch(() => [] as Course[]),
      getDocs(wsQuery),
      getDocs(propQuery),
      getDocs(studentQuery),
      getDocs(advisersQuery), // For advisers
      getDocs(groupsQuery) // For adviser workload
    ]);

    const filteredWorkspaces = filteredWsSnap.docs.map(d => d.data() as ManuscriptWorkspace);
    const filteredProposals = filteredPropSnap.docs.map(d => d.data() as TitleProposal);
    const studentUsers = filteredStudentsSnap.docs.map(d => d.data() as UserProfile);
    const advisers = advisersSnap.docs.map(d => d.data() as UserProfile);
    const groups = filteredGroupsSnap.docs.map(d => d.data() as ResearchGroup);

    const courseMap = new Map<string, Course>();
    courses.forEach((c) => {
      courseMap.set(c.id.toLowerCase(), c);
      if (c.code) courseMap.set(c.code.toLowerCase(), c);
    });

    // ─────────────────────────────────────────────────────────────
    // 1. SUMMARY CARDS (using the filtered datasets)
    // ─────────────────────────────────────────────────────────────
    const totalStudents = studentUsers.length;
    const activeProjects = filteredWorkspaces.filter(w => w.status !== 'completed' && w.status !== 'not_started').length;
    const pendingProposals = filteredProposals.filter(p => p.status === 'submitted' || p.status === 'under_review').length;
    let pendingSections = 0;
    filteredWorkspaces.forEach((w) => {
      if (w.status === 'submitted_for_review' || w.status === 'under_review') {
        pendingSections += 1;
      } else if (Array.isArray(w.sections)) {
        w.sections.forEach((sec) => {
          if (sec.status === 'submitted' || sec.status === 'under_review') pendingSections += 1;
        });
      }
    });
    const pendingReviews = pendingProposals + pendingSections;
    const completedProjects = filteredWorkspaces.filter(w => w.status === 'completed' || w.researchPhase === 'COMPLETED').length;

    // ─────────────────────────────────────────────────────────────
    // 2. STATUS DISTRIBUTION
    // ─────────────────────────────────────────────────────────────
    const countsByStage: Record<string, number> = {
      'Title Proposal': 0, 'Under Review': 0, 'Revision Required': 0, 'Approved': 0,
      'Manuscript Development': 0, 'Ready for Defense': 0, 'Completed': 0,
    };

    filteredProposals.forEach((p) => {
      if (p.status === 'submitted') countsByStage['Title Proposal'] += 1;
      else if (p.status === 'under_review') countsByStage['Under Review'] += 1;
      else if (p.status === 'needs_revision') countsByStage['Revision Required'] += 1;
      else if (p.status === 'approved' && !p.manuscriptWorkspaceId) countsByStage['Approved'] += 1;
    });

    filteredWorkspaces.forEach((w) => {
      if (w.status === 'completed' || w.researchPhase === 'COMPLETED') countsByStage['Completed'] += 1;
      else if (w.researchPhase === 'PROPOSAL_DEFENSE' || w.researchPhase === 'FINAL_MANUSCRIPT') countsByStage['Ready for Defense'] += 1;
      else if (w.status === 'revision_required') countsByStage['Revision Required'] += 1;
      else if (w.status === 'under_review' || w.status === 'submitted_for_review') countsByStage['Under Review'] += 1;
      else if (w.status === 'approved') countsByStage['Approved'] += 1;
      else countsByStage['Manuscript Development'] += 1;
    });

    const totalStageCount = Object.values(countsByStage).reduce((a, b) => a + b, 0);
    const statusDistribution: StatusDistributionItem[] = [
      { name: 'Title Proposal', value: countsByStage['Title Proposal'], color: STATUS_COLORS.titleProposal, percentage: totalStageCount ? Math.round((countsByStage['Title Proposal'] / totalStageCount) * 100) : 0 },
      { name: 'Under Review', value: countsByStage['Under Review'], color: STATUS_COLORS.underReview, percentage: totalStageCount ? Math.round((countsByStage['Under Review'] / totalStageCount) * 100) : 0 },
      { name: 'Revision Required', value: countsByStage['Revision Required'], color: STATUS_COLORS.revisionRequired, percentage: totalStageCount ? Math.round((countsByStage['Revision Required'] / totalStageCount) * 100) : 0 },
      { name: 'Approved', value: countsByStage['Approved'], color: STATUS_COLORS.approved, percentage: totalStageCount ? Math.round((countsByStage['Approved'] / totalStageCount) * 100) : 0 },
      { name: 'Manuscript Development', value: countsByStage['Manuscript Development'], color: STATUS_COLORS.manuscriptDev, percentage: totalStageCount ? Math.round((countsByStage['Manuscript Development'] / totalStageCount) * 100) : 0 },
      { name: 'Ready for Defense', value: countsByStage['Ready for Defense'], color: STATUS_COLORS.readyForDefense, percentage: totalStageCount ? Math.round((countsByStage['Ready for Defense'] / totalStageCount) * 100) : 0 },
      { name: 'Completed', value: countsByStage['Completed'], color: STATUS_COLORS.completed, percentage: totalStageCount ? Math.round((countsByStage['Completed'] / totalStageCount) * 100) : 0 },
    ].filter(item => item.value > 0);

    // ─────────────────────────────────────────────────────────────
    // 3. PROGRESS TREND
    // ─────────────────────────────────────────────────────────────
    const monthMap = new Map<string, { progressing: number; approved: number; completed: number; rawDate: string }>();
    const getMonthKey = (dStr?: string | null) => {
      if (!dStr) return null;
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const label = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      return { sortKey: `${year}-${month}`, label };
    };

    filteredProposals.forEach((p) => {
      const m = getMonthKey(p.createdAt || p.submittedAt);
      if (m) {
        if (!monthMap.has(m.sortKey)) monthMap.set(m.sortKey, { progressing: 0, approved: 0, completed: 0, rawDate: m.label });
        const record = monthMap.get(m.sortKey)!;
        if (p.status === 'approved') record.approved += 1;
        else if (p.status !== 'draft') record.progressing += 1;
      }
    });

    filteredWorkspaces.forEach((w) => {
      const m = getMonthKey(w.updatedAt || w.createdAt);
      if (m) {
        if (!monthMap.has(m.sortKey)) monthMap.set(m.sortKey, { progressing: 0, approved: 0, completed: 0, rawDate: m.label });
        const record = monthMap.get(m.sortKey)!;
        if (w.status === 'completed' || w.researchPhase === 'COMPLETED') record.completed += 1;
        else record.progressing += 1;
      }
    });

    const sortedMonthKeys = Array.from(monthMap.keys()).sort();
    const progressTrend: ProgressTrendItem[] = sortedMonthKeys.map((key) => {
      const data = monthMap.get(key)!;
      return { month: data.rawDate, rawDate: key, progressing: data.progressing, approved: data.approved, completed: data.completed, totalActive: data.progressing + data.approved + data.completed };
    });

    // ─────────────────────────────────────────────────────────────
    // 4. ADVISER WORKLOAD
    // ─────────────────────────────────────────────────────────────
    const adviserWorkloadMap = new Map<string, AdviserWorkloadItem>();

    advisers.forEach((adv) => {
      adviserWorkloadMap.set(adv.uid, {
        adviserId: adv.uid,
        adviserName: adv.fullName || `${adv.first_name || ''} ${adv.last_name || ''}`.trim() || adv.email,
        department: adv.department,
        assignedGroups: 0,
        assignedProjects: 0,
        studentCount: 0,
        exceedsLimit: false,
      });
    });

    groups.forEach((g) => {
      if (g.adviserId && adviserWorkloadMap.has(g.adviserId)) {
        const entry = adviserWorkloadMap.get(g.adviserId)!;
        entry.assignedGroups += 1;
        entry.studentCount += g.memberIds?.length || g.members?.length || 0;
      }
    });

    filteredWorkspaces.forEach((w) => {
      if (w.adviserId && adviserWorkloadMap.has(w.adviserId)) {
        adviserWorkloadMap.get(w.adviserId)!.assignedProjects += 1;
      }
    });

    const adviserWorkload: AdviserWorkloadItem[] = Array.from(adviserWorkloadMap.values())
      .map((item) => {
        const totalWorkload = Math.max(item.assignedGroups, item.assignedProjects);
        return { ...item, assignedProjects: totalWorkload, exceedsLimit: totalWorkload >= RECOMMENDED_ADVISER_LIMIT };
      })
      .sort((a, b) => b.assignedProjects - a.assignedProjects || b.assignedGroups - a.assignedGroups);

    // ─────────────────────────────────────────────────────────────
    // 5. STUDENTS BY PROGRAM
    // ─────────────────────────────────────────────────────────────
    const programStudentCounts = new Map<string, number>();
    studentUsers.forEach((stu) => {
      const code = stu.courseId ? stu.courseId.trim().toUpperCase() : 'UNASSIGNED';
      programStudentCounts.set(code, (programStudentCounts.get(code) || 0) + 1);
    });

    const studentsByProgram: ProgramDistributionItem[] = [];
    let colorIdx = 0;
    programStudentCounts.forEach((count, code) => {
      const matchedCourse = courseMap.get(code.toLowerCase());
      studentsByProgram.push({
        courseId: matchedCourse?.id || code.toLowerCase(),
        courseCode: matchedCourse?.code || code,
        courseName: matchedCourse?.name || (code === 'UNASSIGNED' ? 'Unassigned Course' : code),
        studentCount: count,
        percentage: totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0,
        color: PROGRAM_PALETTE[colorIdx % PROGRAM_PALETTE.length],
      });
      colorIdx++;
    });
    studentsByProgram.sort((a, b) => b.studentCount - a.studentCount);

    // ─────────────────────────────────────────────────────────────
    // 6. PROPOSAL STATUS OVERVIEW
    // ─────────────────────────────────────────────────────────────
    const proposalStatusCounts = { pending: 0, approved: 0, needs_revision: 0, rejected: 0 };
    filteredProposals.forEach((p) => {
      if (p.status === 'submitted' || p.status === 'under_review') proposalStatusCounts.pending += 1;
      else if (p.status === 'approved') proposalStatusCounts.approved += 1;
      else if (p.status === 'needs_revision') proposalStatusCounts.needs_revision += 1;
      else if (p.status === 'rejected') proposalStatusCounts.rejected += 1;
    });

    const totalCountedProposals = Object.values(proposalStatusCounts).reduce((a, b) => a + b, 0);
    const proposalOverview: ProposalStatusItem[] = [
      { statusKey: 'pending', label: 'Pending Review', count: proposalStatusCounts.pending, color: STATUS_COLORS.pending, percentage: totalCountedProposals ? Math.round((proposalStatusCounts.pending / totalCountedProposals) * 100) : 0 },
      { statusKey: 'approved', label: 'Approved', count: proposalStatusCounts.approved, color: STATUS_COLORS.approved, percentage: totalCountedProposals ? Math.round((proposalStatusCounts.approved / totalCountedProposals) * 100) : 0 },
      { statusKey: 'needs_revision', label: 'Needs Revision', count: proposalStatusCounts.needs_revision, color: STATUS_COLORS.revisionRequired, percentage: totalCountedProposals ? Math.round((proposalStatusCounts.needs_revision / totalCountedProposals) * 100) : 0 },
      { statusKey: 'rejected', label: 'Rejected', count: proposalStatusCounts.rejected, color: STATUS_COLORS.rejected, percentage: totalCountedProposals ? Math.round((proposalStatusCounts.rejected / totalCountedProposals) * 100) : 0 },
    ];

    // ─────────────────────────────────────────────────────────────
    // 7. COMPLETION RATE
    // ─────────────────────────────────────────────────────────────
    const totalProjects = filteredWorkspaces.length;
    const completedCount = completedProjects;
    const rate = totalProjects > 0 ? Math.round((completedCount / totalProjects) * 100) : 0;
    const inProgressCount = filteredWorkspaces.filter(w => w.status === 'in_progress' || w.status === 'not_started').length;
    const underReviewCount = filteredWorkspaces.filter(w => w.status === 'submitted_for_review' || w.status === 'under_review').length;

    const completionRate: CompletionRateData = { rate, completedCount, totalProjects, inProgressCount, underReviewCount };

    // ─────────────────────────────────────────────────────────────
    // Generate Dropdowns
    // ─────────────────────────────────────────────────────────────
    const currentYear = new Date().getFullYear();
    const availableAcademicYears = [];
    for (let i = 0; i < 5; i++) {
      const y = currentYear - i;
      availableAcademicYears.push(`${y}-${y + 1}`);
    }

    const availableSemesters = [
      { id: '1st', label: '1st Semester' },
      { id: '2nd', label: '2nd Semester' },
      { id: 'summer', label: 'Summer / Midyear' },
    ];

    const availablePrograms = courses.map((c) => ({
      id: c.id,
      code: c.code || c.name,
      name: c.name,
    }));

    return {
      summary: { totalStudents, activeProjects, pendingReviews, completedProjects },
      statusDistribution,
      progressTrend,
      adviserWorkload,
      studentsByProgram,
      proposalOverview,
      completionRate,
      availableAcademicYears,
      availableSemesters,
      availablePrograms,
    };
  },
};

export default adminAnalyticsService;
