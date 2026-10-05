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

export interface TopicalTrendPoint {
  period: string; // e.g. "Oct 2026" or "1st Sem AY 2026-2027"
  sortKey: string;
  total: number;
  [topicId: string]: any;
}

export interface TopicSummaryItem {
  id: string;
  name: string;
  shortLabel: string;
  color: string;
  count: number;
  totalVolume: number;
  growthRate?: number;
  percentage: number;
  projectTitles?: string[];
}

export interface ResearchTopicsTrendData {
  monthly?: TopicalTrendPoint[];
  bySemester?: TopicalTrendPoint[];
  topics: TopicSummaryItem[];
  existingTopics: TopicSummaryItem[];
  topTopic?: TopicSummaryItem;
  surgingTopic?: {
    id: string;
    name: string;
    growth: number;
    volume: number;
  };
  totalClassified: number;
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
  progressTrend?: ProgressTrendItem[];
  topicalTrends: ResearchTopicsTrendData;
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

export interface TopicDomainConfig {
  id: string;
  name: string;
  shortLabel: string;
  color: string;
  keywords: string[];
}

export const TOPIC_DOMAINS: TopicDomainConfig[] = [
  {
    id: 'ai',
    name: 'AI & Machine Learning',
    shortLabel: 'AI & ML',
    color: '#3b82f6', // blue-500
    keywords: [
      'ai', 'artificial intelligence', 'machine learning', 'deep learning',
      'neural network', 'neural networks', 'computer vision', 'object detection',
      'cnn', 'rnn', 'lstm', 'yolo', 'reinforcement learning', 'image processing',
      'pattern recognition', 'model training', 'random forest', 'svm', 'deepfake',
      'autonomous', 'classification algorithm'
    ],
  },
  {
    id: 'nlp',
    name: 'Natural Language Processing',
    shortLabel: 'NLP',
    color: '#8b5cf6', // purple-500
    keywords: [
      'nlp', 'natural language', 'sentiment analysis', 'sentiment', 'text mining',
      'chatbot', 'chat bot', 'language model', 'llm', 'translation', 'speech recognition',
      'text classification', 'tokenization', 'bert', 'gpt', 'semantic analysis',
      'summarization', 'speech-to-text', 'named entity', 'conversational'
    ],
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity',
    shortLabel: 'Cybersecurity',
    color: '#ef4444', // red-500
    keywords: [
      'cybersecurity', 'cyber security', 'cryptography', 'blockchain', 'encryption',
      'phishing', 'malware', 'vulnerability', 'authentication', 'penetration testing',
      'pen testing', 'firewall', 'intrusion detection', 'network security', 'ransomware',
      'access control', 'zero trust', 'hash', 'steganography', 'crypto'
    ],
  },
  {
    id: 'data_analytics',
    name: 'Data Analytics',
    shortLabel: 'Data Analytics',
    color: '#10b981', // emerald-500
    keywords: [
      'data analytics', 'analytics', 'big data', 'data science', 'business intelligence',
      'data mining', 'predictive', 'prediction', 'forecasting', 'visualization',
      'bi', 'clustering', 'regression analysis', 'data warehouse', 'statistical analysis',
      'dashboard', 'trend analysis', 'decision support'
    ],
  },
  {
    id: 'iot',
    name: 'Internet of Things (IoT)',
    shortLabel: 'IoT',
    color: '#f59e0b', // amber-500
    keywords: [
      'iot', 'internet of things', 'arduino', 'raspberry pi', 'sensor', 'sensors',
      'smart home', 'smart agriculture', 'automation', 'embedded', 'rfid',
      'microcontroller', 'telemetry', 'hardware device', 'esp32', 'actuator',
      'smart city', 'wearable', 'water monitoring', 'soil monitoring'
    ],
  },
  {
    id: 'web_mobile',
    name: 'Web & Mobile Systems',
    shortLabel: 'Web & Mobile',
    color: '#06b6d4', // cyan-500
    keywords: [
      'web', 'mobile app', 'android', 'ios', 'mobile application', 'e-commerce',
      'portal', 'management system', 'information system', 'cloud computing',
      'web-based', 'pwa', 'cross-platform', 'reservation system', 'inventory system',
      'booking system', 'attendance system'
    ],
  },
  {
    id: 'edtech',
    name: 'Educational Technology',
    shortLabel: 'EdTech',
    color: '#ec4899', // pink-500
    keywords: [
      'edtech', 'education', 'e-learning', 'learning management', 'lms', 'academic',
      'curriculum', 'classroom', 'student performance', 'interactive learning',
      'quiz system', 'grading system', 'gamification in education', 'virtual classroom'
    ],
  },
  {
    id: 'healthtech',
    name: 'Healthcare & Biomedical',
    shortLabel: 'HealthTech',
    color: '#14b8a6', // teal-500
    keywords: [
      'health', 'healthcare', 'medical', 'hospital', 'clinic', 'disease detection',
      'telemedicine', 'patient monitoring', 'diagnosis', 'biomedical', 'vital signs',
      'mental health', 'health records', 'ehr'
    ],
  },
];

/**
 * Classifies a project into its primary topic domain tag based on keywords, category, title and description.
 * RULE: If a project matches AI & ML and has NLP implementation, stick strictly with AI & ML and exclude it from NLP.
 */
export function classifyProjectTopic(item: {
  title?: string;
  keywords?: string[] | string;
  category?: string;
  researchCategory?: string;
  description?: string;
  rationale?: string;
  abstract?: string;
}): string {
  const kwList = Array.isArray(item.keywords)
    ? item.keywords
    : typeof item.keywords === 'string'
    ? item.keywords.split(/[,;\s]+/)
    : [];

  const textToSearch = [
    item.title || '',
    item.category || '',
    item.researchCategory || '',
    kwList.join(' '),
    (item.description || '').slice(0, 500),
    (item.rationale || '').slice(0, 500),
    (item.abstract || '').slice(0, 500),
  ].join(' ').toLowerCase();

  const domainScores: Record<string, number> = {};

  for (const domain of TOPIC_DOMAINS) {
    let score = 0;
    // Check keywords array with highest weight
    for (const kw of kwList) {
      const cleanKw = kw.trim().toLowerCase();
      if (!cleanKw) continue;
      if (domain.keywords.some((k) => k === cleanKw || cleanKw.includes(k) || k.includes(cleanKw))) {
        score += 4;
      }
    }

    // Check title match
    const titleLower = (item.title || '').toLowerCase();
    for (const k of domain.keywords) {
      if (titleLower.includes(k)) {
        score += 3;
      }
    }

    // Check category / researchCategory
    const catLower = [item.category || '', item.researchCategory || ''].join(' ').toLowerCase();
    for (const k of domain.keywords) {
      if (catLower.includes(k)) {
        score += 3;
      }
    }

    // General text match
    for (const k of domain.keywords) {
      if (textToSearch.includes(k)) {
        score += 1;
      }
    }

    domainScores[domain.id] = score;
  }

  const aiScore = domainScores['ai'] || 0;
  const nlpScore = domainScores['nlp'] || 0;

  // RULE REQUIREMENT:
  // "if 1 topic here is AI and ML and they have NLP implementation in project, you have to stick with AI and ML and exclude it in the NLP."
  if (aiScore > 0 && nlpScore > 0) {
    return 'ai';
  }

  // Find highest scoring domain
  let highestScore = 0;
  let bestDomainId = 'ai';

  for (const domain of TOPIC_DOMAINS) {
    const s = domainScores[domain.id] || 0;
    if (s > highestScore) {
      highestScore = s;
      bestDomainId = domain.id;
    }
  }

  // Enforce rule again: if best was NLP but there is ANY AI component, stick with AI
  if (bestDomainId === 'nlp' && aiScore > 0) {
    return 'ai';
  }

  // Fallbacks if no specific score matched
  if (highestScore === 0) {
    const t = (item.title || '').toLowerCase();
    if (t.includes('learn') || t.includes('student') || t.includes('school')) {
      return 'edtech';
    }
    if (t.includes('data') || t.includes('metric') || t.includes('predict')) {
      return 'data_analytics';
    }
    if (t.includes('system') || t.includes('app') || t.includes('portal') || t.includes('web')) {
      return 'web_mobile';
    }
    return 'ai';
  }

  return bestDomainId;
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
    // 3b. RESEARCH TOPICAL TRENDS (Multi-line & Stacked Bar by Domain/Keywords)
    // ─────────────────────────────────────────────────────────────
    // Consolidate unique projects from workspaces, proposals, and research groups
    // AVOID DUPLICATIONS: A project linked across proposals, workspaces, and groups must only be counted ONCE.
    interface UnifiedProject {
      id: string;
      title: string;
      keywords: string[];
      category?: string;
      description?: string;
      dateStr: string;
      domainId: string;
    }

    const normalizeTitleKey = (t?: string | null): string => {
      if (!t) return '';
      return t.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    };

    const isPlaceholderTitle = (t?: string | null): boolean => {
      if (!t) return true;
      const lower = t.toLowerCase().trim();
      return (
        lower === '' ||
        lower === 'untitled' ||
        lower === 'untitled research' ||
        lower === 'draft' ||
        lower === 'test'
      );
    };

    const unifiedProjects: UnifiedProject[] = [];
    const idToProjectIndex = new Map<string, number>();
    const titleToProjectIndex = new Map<string, number>();

    const registerOrUpdateProject = (item: {
      id: string;
      groupId?: string;
      proposalId?: string;
      workspaceId?: string;
      title?: string;
      keywords?: string[];
      category?: string;
      description?: string;
      dateStr?: string;
    }) => {
      const rawTitle = (item.title || '').trim();
      if (isPlaceholderTitle(rawTitle)) return;

      const titleKey = normalizeTitleKey(rawTitle);
      const possibleIds = [item.id, item.groupId, item.proposalId, item.workspaceId].filter(
        (id): id is string => Boolean(id && id.trim())
      );

      // Check if project exists by any linked ID or normalized title
      let existingIndex: number | undefined;
      for (const id of possibleIds) {
        if (idToProjectIndex.has(id)) {
          existingIndex = idToProjectIndex.get(id);
          break;
        }
      }

      if (existingIndex === undefined && titleKey && titleToProjectIndex.has(titleKey)) {
        existingIndex = titleToProjectIndex.get(titleKey);
      }

      if (existingIndex !== undefined) {
        // Project already exists - enrich metadata without duplicating the count
        const existing = unifiedProjects[existingIndex];
        const mergedKw = Array.from(new Set([...(existing.keywords || []), ...(item.keywords || [])]));
        existing.keywords = mergedKw;
        if (!existing.description && item.description) existing.description = item.description;
        if (!existing.category && item.category) existing.category = item.category;

        // Re-classify if richer keywords/content available (respecting AI vs NLP rule)
        existing.domainId = classifyProjectTopic({
          title: existing.title,
          keywords: existing.keywords,
          category: existing.category,
          description: existing.description,
        });

        // Register all alternate IDs to this same project
        for (const id of possibleIds) {
          idToProjectIndex.set(id, existingIndex);
        }
        if (titleKey) {
          titleToProjectIndex.set(titleKey, existingIndex);
        }
        return;
      }

      // New unique project
      const domainId = classifyProjectTopic({
        title: rawTitle,
        keywords: item.keywords || [],
        category: item.category,
        description: item.description,
      });

      const newProj: UnifiedProject = {
        id: item.groupId || item.workspaceId || item.id,
        title: rawTitle,
        keywords: item.keywords || [],
        category: item.category,
        description: item.description,
        dateStr: item.dateStr || new Date().toISOString(),
        domainId,
      };

      const newIndex = unifiedProjects.length;
      unifiedProjects.push(newProj);

      for (const id of possibleIds) {
        idToProjectIndex.set(id, newIndex);
      }
      if (titleKey) {
        titleToProjectIndex.set(titleKey, newIndex);
      }
    };

    // 1. Process active workspaces first (they contain the most mature project state)
    filteredWorkspaces.forEach((w) => {
      registerOrUpdateProject({
        id: w.id,
        workspaceId: w.id,
        groupId: w.groupId,
        proposalId: w.proposalId,
        title: w.title,
        keywords: w.keywords || [],
        category: w.researchCategory || w.category,
        description: w.abstract,
        dateStr: w.createdAt || w.updatedAt,
      });
    });

    // 2. Process proposals (only register if not already part of an existing workspace/group project)
    filteredProposals.forEach((p) => {
      registerOrUpdateProject({
        id: p.id,
        proposalId: p.id,
        groupId: p.groupId,
        workspaceId: p.manuscriptWorkspaceId,
        title: p.title,
        keywords: p.researchCategory ? [p.researchCategory] : [],
        category: p.researchCategory || p.categoryId,
        description: p.description || p.rationale,
        dateStr: p.submittedAt || p.createdAt,
      });
    });

    // 3. Process groups with titles
    groups.forEach((g) => {
      if (g.title) {
        registerOrUpdateProject({
          id: g.id,
          groupId: g.id,
          title: g.title,
          dateStr: g.createdAt || g.updatedAt,
        });
      }
    });

    // Initialize month and semester maps with real data only (no dummy padding)
    const topicMonthlyMap = new Map<string, { period: string; sortKey: string; total: number; [topicId: string]: any }>();
    const topicSemesterMap = new Map<string, { period: string; sortKey: string; total: number; [topicId: string]: any }>();

    // Topic counts tally & title collection
    const topicVolumeTally: Record<string, number> = {};
    const topicTitlesMap: Record<string, string[]> = {};
    TOPIC_DOMAINS.forEach((d) => {
      topicVolumeTally[d.id] = 0;
      topicTitlesMap[d.id] = [];
    });

    unifiedProjects.forEach((proj) => {
      const d = new Date(proj.dateStr);
      if (isNaN(d.getTime())) return;

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const monthSortKey = `${year}-${month}`;
      const monthLabel = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

      // Semester
      const sem = getSemesterFromDate(proj.dateStr) || '1st';
      const ay = getAcademicYearFromDate(proj.dateStr) || `${year}-${year + 1}`;
      const semLabel = `${sem === '1st' ? '1st Sem' : sem === '2nd' ? '2nd Sem' : 'Midyear'} AY ${ay}`;
      const semSortKey = `${ay}-${sem === '1st' ? '1' : sem === '2nd' ? '2' : '3'}`;

      // Increment monthly bucket
      if (!topicMonthlyMap.has(monthSortKey)) {
        const initialPoint: any = { period: monthLabel, sortKey: monthSortKey, total: 0 };
        TOPIC_DOMAINS.forEach((td) => {
          initialPoint[td.id] = 0;
        });
        topicMonthlyMap.set(monthSortKey, initialPoint);
      }
      const mPoint = topicMonthlyMap.get(monthSortKey)!;
      mPoint[proj.domainId] = (mPoint[proj.domainId] || 0) + 1;
      mPoint.total += 1;

      // Increment semester bucket
      if (!topicSemesterMap.has(semSortKey)) {
        const initialSemPoint: any = { period: semLabel, sortKey: semSortKey, total: 0 };
        TOPIC_DOMAINS.forEach((td) => {
          initialSemPoint[td.id] = 0;
        });
        topicSemesterMap.set(semSortKey, initialSemPoint);
      }
      const sPoint = topicSemesterMap.get(semSortKey)!;
      sPoint[proj.domainId] = (sPoint[proj.domainId] || 0) + 1;
      sPoint.total += 1;

      // Global topic tally & title collection
      topicVolumeTally[proj.domainId] = (topicVolumeTally[proj.domainId] || 0) + 1;
      if (proj.title && !topicTitlesMap[proj.domainId].includes(proj.title)) {
        topicTitlesMap[proj.domainId].push(proj.title);
      }
    });

    const sortedMonthPoints = Array.from(topicMonthlyMap.values()).sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey)
    );

    const sortedSemesterPoints = Array.from(topicSemesterMap.values()).sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey)
    );

    // Calculate growth rates across the last two chronological periods
    const lastPoint = sortedMonthPoints[sortedMonthPoints.length - 1];
    const prevPoint = sortedMonthPoints.length >= 2 ? sortedMonthPoints[sortedMonthPoints.length - 2] : null;

    let bestGrowthTopic: { id: string; name: string; growth: number; volume: number } | undefined;
    let highestGrowthRate = -Infinity;

    const totalProjectsClassified = unifiedProjects.length;

    const topicsSummary: TopicSummaryItem[] = TOPIC_DOMAINS.map((td) => {
      const volume = topicVolumeTally[td.id] || 0;
      const latestCount = lastPoint ? Number(lastPoint[td.id] || 0) : 0;
      const prevCount = prevPoint ? Number(prevPoint[td.id] || 0) : 0;

      let growthRate = 0;
      if (prevCount > 0) {
        growthRate = Math.round(((latestCount - prevCount) / prevCount) * 100);
      } else if (latestCount > 0) {
        growthRate = 100;
      }

      if (growthRate > highestGrowthRate && (volume > 0 || latestCount > 0)) {
        highestGrowthRate = growthRate;
        bestGrowthTopic = {
          id: td.id,
          name: td.shortLabel,
          growth: growthRate,
          volume,
        };
      }

      return {
        id: td.id,
        name: td.name,
        shortLabel: td.shortLabel,
        color: td.color,
        count: volume,
        totalVolume: volume,
        growthRate,
        percentage: totalProjectsClassified > 0 ? Math.round((volume / totalProjectsClassified) * 100) : 0,
        projectTitles: topicTitlesMap[td.id] || [],
      };
    });

    // Existing topics (only topics that have at least 1 project in the dataset)
    const existingTopics = topicsSummary
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count);

    const topTopic = existingTopics[0] || undefined;

    // Fallback surging topic if none had growth > 0
    if (!bestGrowthTopic && topicsSummary.length > 0) {
      const topByVolume = [...topicsSummary].sort((a, b) => b.totalVolume - a.totalVolume)[0];
      if (topByVolume && topByVolume.totalVolume > 0) {
        bestGrowthTopic = {
          id: topByVolume.id,
          name: topByVolume.shortLabel,
          growth: topByVolume.growthRate || 0,
          volume: topByVolume.totalVolume,
        };
      }
    }

    const topicalTrends: ResearchTopicsTrendData = {
      monthly: sortedMonthPoints,
      bySemester: sortedSemesterPoints,
      topics: topicsSummary,
      existingTopics,
      topTopic,
      surgingTopic: bestGrowthTopic,
      totalClassified: totalProjectsClassified,
    };

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
      topicalTrends,
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
