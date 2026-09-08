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
   */
  async fetchRawData() {
    const [users, proposals, workspaces, groups, courses] = await Promise.all([
      userService.getAllUsers().catch((e) => {
        console.warn('[adminAnalytics] Error fetching users:', e);
        return [] as UserProfile[];
      }),
      titleProposalService.getAllProposals().catch((e) => {
        console.warn('[adminAnalytics] Error fetching proposals:', e);
        return [] as TitleProposal[];
      }),
      researchWorkspaceService.getAllWorkspaces().catch((e) => {
        console.warn('[adminAnalytics] Error fetching workspaces:', e);
        return [] as ManuscriptWorkspace[];
      }),
      groupService.getAllGroups().catch((e) => {
        console.warn('[adminAnalytics] Error fetching groups:', e);
        return [] as ResearchGroup[];
      }),
      courseService.getAllCourses().catch((e) => {
        console.warn('[adminAnalytics] Error fetching courses:', e);
        return [] as Course[];
      }),
    ]);

    return { users, proposals, workspaces, groups, courses };
  },

  /**
   * Process raw data according to active filters and return aggregated datasets.
   */
  processAnalytics(
    raw: {
      users: UserProfile[];
      proposals: TitleProposal[];
      workspaces: ManuscriptWorkspace[];
      groups: ResearchGroup[];
      courses: Course[];
    },
    filters: AnalyticsFilterOptions = {}
  ): AdminAnalyticsDataset {
    const { users, proposals, workspaces, groups, courses } = raw;
    const filterAY = filters.academicYear && filters.academicYear !== 'all' ? filters.academicYear : null;
    const filterSem = filters.semester && filters.semester !== 'all' ? filters.semester : null;
    const filterProg = filters.program && filters.program !== 'all' ? filters.program.toLowerCase() : null;

    // Build course map for fast lookup
    const courseMap = new Map<string, Course>();
    courses.forEach((c) => {
      courseMap.set(c.id.toLowerCase(), c);
      if (c.code) courseMap.set(c.code.toLowerCase(), c);
    });

    // Extract all unique academic years across all records with timestamps
    const aySet = new Set<string>();
    const checkAY = (dStr?: string | null) => {
      const ay = getAcademicYearFromDate(dStr);
      if (ay) aySet.add(ay);
    };

    users.forEach((u) => checkAY(u.created_at));
    proposals.forEach((p) => {
      checkAY(p.createdAt);
      checkAY(p.submittedAt);
      checkAY(p.approvedAt);
    });
    workspaces.forEach((w) => {
      checkAY(w.createdAt);
      checkAY(w.updatedAt);
    });
    groups.forEach((g) => checkAY(g.createdAt));

    // Fallback: If no dates present, ensure current AY is included
    const currentAY = getAcademicYearFromDate(new Date().toISOString());
    if (currentAY) aySet.add(currentAY);
    const availableAcademicYears = Array.from(aySet).sort().reverse();

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

    // Filter Helper: matches AY, Semester, Program
    const matchesRecordFilter = (dateStr?: string | null, recordCourseId?: string | null) => {
      if (filterAY) {
        const itemAY = getAcademicYearFromDate(dateStr);
        if (itemAY && itemAY !== filterAY) return false;
      }
      if (filterSem) {
        const itemSem = getSemesterFromDate(dateStr);
        if (itemSem && itemSem !== filterSem) return false;
      }
      if (filterProg && recordCourseId) {
        const normCourse = recordCourseId.toLowerCase();
        if (normCourse !== filterProg) {
          const matched = courseMap.get(normCourse);
          if (!matched || matched.id.toLowerCase() !== filterProg) return false;
        }
      }
      return true;
    };

    // Filter Students
    const studentUsers = users.filter((u) => {
      if (u.role !== 'student') return false;
      if (filterProg && u.courseId) {
        const norm = u.courseId.toLowerCase();
        if (norm !== filterProg) {
          const matched = courseMap.get(norm);
          if (!matched || matched.id.toLowerCase() !== filterProg) return false;
        }
      }
      if (filterAY) {
        const itemAY = getAcademicYearFromDate(u.created_at);
        if (itemAY && itemAY !== filterAY) return false;
      }
      if (filterSem) {
        const itemSem = getSemesterFromDate(u.created_at);
        if (itemSem && itemSem !== filterSem) return false;
      }
      return true;
    });

    // Filter Proposals
    const filteredProposals = proposals.filter((p) => {
      const date = p.submittedAt || p.createdAt;
      return matchesRecordFilter(date, p.courseId);
    });

    // Filter Workspaces
    const filteredWorkspaces = workspaces.filter((w) => {
      const date = w.createdAt || w.updatedAt;
      // Associate workspace with student or group course if available
      const linkedGroup = groups.find((g) => g.id === w.groupId);
      const courseId = linkedGroup?.courseId;
      return matchesRecordFilter(date, courseId);
    });

    // ─────────────────────────────────────────────────────────────
    // 1. SUMMARY CARDS
    // ─────────────────────────────────────────────────────────────
    const totalStudents = studentUsers.length;

    // Active research projects: workspaces in progress or under review, not completed
    const activeProjects = filteredWorkspaces.filter(
      (w) => w.status !== 'completed' && w.status !== 'not_started'
    ).length;

    // Pending Reviews: Proposals awaiting review + workspace sections submitted for review
    const pendingProposals = filteredProposals.filter(
      (p) => p.status === 'submitted' || p.status === 'under_review'
    ).length;

    let pendingSections = 0;
    filteredWorkspaces.forEach((w) => {
      if (w.status === 'submitted_for_review' || w.status === 'under_review') {
        pendingSections += 1;
      } else if (Array.isArray(w.sections)) {
        w.sections.forEach((sec) => {
          if (sec.status === 'submitted' || sec.status === 'under_review') {
            pendingSections += 1;
          }
        });
      }
    });
    const pendingReviews = pendingProposals + pendingSections;

    // Completed Projects
    const completedProjects = filteredWorkspaces.filter(
      (w) => w.status === 'completed' || w.researchPhase === 'COMPLETED'
    ).length;

    // ─────────────────────────────────────────────────────────────
    // 2. RESEARCH STATUS DISTRIBUTION (Donut)
    // ─────────────────────────────────────────────────────────────
    const countsByStage: Record<string, number> = {
      'Title Proposal': 0,
      'Under Review': 0,
      'Revision Required': 0,
      'Approved': 0,
      'Manuscript Development': 0,
      'Ready for Defense': 0,
      'Completed': 0,
    };

    // Include proposals that haven't transitioned to active workspaces
    filteredProposals.forEach((p) => {
      if (p.status === 'submitted') countsByStage['Title Proposal'] += 1;
      else if (p.status === 'under_review') countsByStage['Under Review'] += 1;
      else if (p.status === 'needs_revision') countsByStage['Revision Required'] += 1;
      else if (p.status === 'approved' && !p.manuscriptWorkspaceId) countsByStage['Approved'] += 1;
    });

    // Include workspaces
    filteredWorkspaces.forEach((w) => {
      if (w.status === 'completed' || w.researchPhase === 'COMPLETED') {
        countsByStage['Completed'] += 1;
      } else if (
        w.researchPhase === 'PROPOSAL_DEFENSE' ||
        w.researchPhase === 'FINAL_MANUSCRIPT'
      ) {
        countsByStage['Ready for Defense'] += 1;
      } else if (w.status === 'revision_required') {
        countsByStage['Revision Required'] += 1;
      } else if (w.status === 'under_review' || w.status === 'submitted_for_review') {
        countsByStage['Under Review'] += 1;
      } else if (w.status === 'approved') {
        countsByStage['Approved'] += 1;
      } else {
        countsByStage['Manuscript Development'] += 1;
      }
    });

    const totalStageCount = Object.values(countsByStage).reduce((a, b) => a + b, 0);

    const statusDistribution: StatusDistributionItem[] = [
      {
        name: 'Title Proposal',
        value: countsByStage['Title Proposal'],
        color: STATUS_COLORS.titleProposal,
        percentage: totalStageCount ? Math.round((countsByStage['Title Proposal'] / totalStageCount) * 100) : 0,
      },
      {
        name: 'Under Review',
        value: countsByStage['Under Review'],
        color: STATUS_COLORS.underReview,
        percentage: totalStageCount ? Math.round((countsByStage['Under Review'] / totalStageCount) * 100) : 0,
      },
      {
        name: 'Revision Required',
        value: countsByStage['Revision Required'],
        color: STATUS_COLORS.revisionRequired,
        percentage: totalStageCount ? Math.round((countsByStage['Revision Required'] / totalStageCount) * 100) : 0,
      },
      {
        name: 'Approved',
        value: countsByStage['Approved'],
        color: STATUS_COLORS.approved,
        percentage: totalStageCount ? Math.round((countsByStage['Approved'] / totalStageCount) * 100) : 0,
      },
      {
        name: 'Manuscript Development',
        value: countsByStage['Manuscript Development'],
        color: STATUS_COLORS.manuscriptDev,
        percentage: totalStageCount ? Math.round((countsByStage['Manuscript Development'] / totalStageCount) * 100) : 0,
      },
      {
        name: 'Ready for Defense',
        value: countsByStage['Ready for Defense'],
        color: STATUS_COLORS.readyForDefense,
        percentage: totalStageCount ? Math.round((countsByStage['Ready for Defense'] / totalStageCount) * 100) : 0,
      },
      {
        name: 'Completed',
        value: countsByStage['Completed'],
        color: STATUS_COLORS.completed,
        percentage: totalStageCount ? Math.round((countsByStage['Completed'] / totalStageCount) * 100) : 0,
      },
    ].filter((item) => item.value > 0); // Omit 0 slices from donut for clean aesthetics if some categories have data

    // ─────────────────────────────────────────────────────────────
    // 3. RESEARCH PROGRESS TREND (Line Chart)
    // ─────────────────────────────────────────────────────────────
    // Group monthly milestones using real timestamps
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
        if (!monthMap.has(m.sortKey)) {
          monthMap.set(m.sortKey, { progressing: 0, approved: 0, completed: 0, rawDate: m.label });
        }
        const record = monthMap.get(m.sortKey)!;
        if (p.status === 'approved') {
          record.approved += 1;
        } else if (p.status !== 'draft') {
          record.progressing += 1;
        }
      }
    });

    filteredWorkspaces.forEach((w) => {
      const m = getMonthKey(w.updatedAt || w.createdAt);
      if (m) {
        if (!monthMap.has(m.sortKey)) {
          monthMap.set(m.sortKey, { progressing: 0, approved: 0, completed: 0, rawDate: m.label });
        }
        const record = monthMap.get(m.sortKey)!;
        if (w.status === 'completed' || w.researchPhase === 'COMPLETED') {
          record.completed += 1;
        } else {
          record.progressing += 1;
        }
      }
    });

    const sortedMonthKeys = Array.from(monthMap.keys()).sort();
    const progressTrend: ProgressTrendItem[] = sortedMonthKeys.map((key) => {
      const data = monthMap.get(key)!;
      return {
        month: data.rawDate,
        rawDate: key,
        progressing: data.progressing,
        approved: data.approved,
        completed: data.completed,
        totalActive: data.progressing + data.approved + data.completed,
      };
    });

    // ─────────────────────────────────────────────────────────────
    // 4. ADVISER WORKLOAD DISTRIBUTION (Horizontal Bar)
    // ─────────────────────────────────────────────────────────────
    // Identify all faculty advisers in the system
    const advisers = users.filter((u) => u.role === 'adviser');
    const adviserWorkloadMap = new Map<string, AdviserWorkloadItem>();

    // Initialize map with all registered advisers
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

    // Match groups assigned to advisers
    groups.forEach((g) => {
      if (g.adviserId) {
        let entry = adviserWorkloadMap.get(g.adviserId);
        if (!entry) {
          entry = {
            adviserId: g.adviserId,
            adviserName: g.adviserName || 'Faculty Adviser',
            assignedGroups: 0,
            assignedProjects: 0,
            studentCount: 0,
            exceedsLimit: false,
          };
          adviserWorkloadMap.set(g.adviserId, entry);
        }
        entry.assignedGroups += 1;
        entry.studentCount += g.memberIds?.length || g.members?.length || 0;
      }
    });

    // Match workspaces assigned to advisers
    filteredWorkspaces.forEach((w) => {
      if (w.adviserId) {
        let entry = adviserWorkloadMap.get(w.adviserId);
        if (!entry) {
          entry = {
            adviserId: w.adviserId,
            adviserName: w.adviserName || 'Faculty Adviser',
            assignedGroups: 0,
            assignedProjects: 0,
            studentCount: 0,
            exceedsLimit: false,
          };
          adviserWorkloadMap.set(w.adviserId, entry);
        }
        entry.assignedProjects += 1;
      }
    });

    // Determine limit and sort highest to lowest
    const adviserWorkload: AdviserWorkloadItem[] = Array.from(adviserWorkloadMap.values())
      .map((item) => {
        const totalWorkload = Math.max(item.assignedGroups, item.assignedProjects);
        return {
          ...item,
          assignedProjects: totalWorkload,
          exceedsLimit: totalWorkload >= RECOMMENDED_ADVISER_LIMIT,
        };
      })
      .sort((a, b) => b.assignedProjects - a.assignedProjects || b.assignedGroups - a.assignedGroups);

    // ─────────────────────────────────────────────────────────────
    // 5. STUDENTS BY PROGRAM (Bar Chart)
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
    // 6. PROPOSAL STATUS OVERVIEW (Bar Chart)
    // ─────────────────────────────────────────────────────────────
    const proposalStatusCounts = {
      pending: 0,
      approved: 0,
      needs_revision: 0,
      rejected: 0,
    };

    filteredProposals.forEach((p) => {
      if (p.status === 'submitted' || p.status === 'under_review') {
        proposalStatusCounts.pending += 1;
      } else if (p.status === 'approved') {
        proposalStatusCounts.approved += 1;
      } else if (p.status === 'needs_revision') {
        proposalStatusCounts.needs_revision += 1;
      } else if (p.status === 'rejected') {
        proposalStatusCounts.rejected += 1;
      }
    });

    const totalCountedProposals = Object.values(proposalStatusCounts).reduce((a, b) => a + b, 0);

    const proposalOverview: ProposalStatusItem[] = [
      {
        statusKey: 'pending',
        label: 'Pending Review',
        count: proposalStatusCounts.pending,
        color: STATUS_COLORS.pending,
        percentage: totalCountedProposals ? Math.round((proposalStatusCounts.pending / totalCountedProposals) * 100) : 0,
      },
      {
        statusKey: 'approved',
        label: 'Approved',
        count: proposalStatusCounts.approved,
        color: STATUS_COLORS.approved,
        percentage: totalCountedProposals ? Math.round((proposalStatusCounts.approved / totalCountedProposals) * 100) : 0,
      },
      {
        statusKey: 'needs_revision',
        label: 'Needs Revision',
        count: proposalStatusCounts.needs_revision,
        color: STATUS_COLORS.revisionRequired,
        percentage: totalCountedProposals ? Math.round((proposalStatusCounts.needs_revision / totalCountedProposals) * 100) : 0,
      },
      {
        statusKey: 'rejected',
        label: 'Rejected',
        count: proposalStatusCounts.rejected,
        color: STATUS_COLORS.rejected,
        percentage: totalCountedProposals ? Math.round((proposalStatusCounts.rejected / totalCountedProposals) * 100) : 0,
      },
    ];

    // ─────────────────────────────────────────────────────────────
    // 7. RESEARCH COMPLETION RATE (Radial / Circular Progress)
    // ─────────────────────────────────────────────────────────────
    const totalProjects = filteredWorkspaces.length;
    const completedCount = completedProjects;
    const rate = totalProjects > 0 ? Math.round((completedCount / totalProjects) * 100) : 0;
    const inProgressCount = filteredWorkspaces.filter(
      (w) => w.status === 'in_progress' || w.status === 'not_started'
    ).length;
    const underReviewCount = filteredWorkspaces.filter(
      (w) => w.status === 'submitted_for_review' || w.status === 'under_review'
    ).length;

    const completionRate: CompletionRateData = {
      rate,
      completedCount,
      totalProjects,
      inProgressCount,
      underReviewCount,
    };

    return {
      summary: {
        totalStudents,
        activeProjects,
        pendingReviews,
        completedProjects,
      },
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
