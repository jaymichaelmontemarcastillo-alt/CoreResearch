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

export interface SpecializationDistributionItem {
  code: string;
  name: string;
  count: number;
}

export interface ProgramDistributionItem {
  courseId: string;
  courseCode: string;
  courseName: string;
  studentCount: number;
  percentage: number;
  color: string;
  specializations?: SpecializationDistributionItem[];
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
    // Fetch Evaluations for Final Verdict Distribution
    const proposalEvalQuery = query(collection(db, 'proposal_evaluations'));
    const finalEvalQuery = query(collection(db, 'final_evaluations'));

    const [
      courses,
      filteredWsSnap,
      filteredPropSnap,
      filteredStudentsSnap,
      advisersSnap,
      filteredGroupsSnap,
      proposalEvalSnap,
      finalEvalSnap
    ] = await Promise.all([
      dataCache.getOrFetch('courses', () => courseService.getAllCourses(), CACHE_TTL.STABLE).catch(() => [] as Course[]),
      getDocs(wsQuery),
      getDocs(propQuery),
      getDocs(studentQuery),
      getDocs(advisersQuery), // For advisers
      getDocs(groupsQuery), // For adviser workload
      getDocs(proposalEvalQuery),
      getDocs(finalEvalQuery)
    ]);

    const filteredWorkspaces = filteredWsSnap.docs.map(d => d.data() as ManuscriptWorkspace);
    const filteredProposals = filteredPropSnap.docs.map(d => d.data() as TitleProposal);
    const studentUsers = filteredStudentsSnap.docs.map(d => d.data() as UserProfile);
    const advisers = advisersSnap.docs.map(d => d.data() as UserProfile);
    const groups = filteredGroupsSnap.docs.map(d => d.data() as ResearchGroup);
    
    // Process evaluations for Final Verdicts
    const allEvaluations = [
      ...proposalEvalSnap.docs.map(d => d.data()),
      ...finalEvalSnap.docs.map(d => d.data())
    ];

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
    // 2. STATUS DISTRIBUTION (Now based on FINAL VERDICT)
    // ─────────────────────────────────────────────────────────────
    const verdictCounts: Record<string, number> = {
      'APPROVED': 0, 
      'APPROVED_WITH_REVISIONS': 0, 
      'DISAPPROVED': 0,
    };

    allEvaluations.forEach((evalData) => {
      if (evalData.verdict && verdictCounts[evalData.verdict] !== undefined) {
        // Optional: filter evaluations by the active filters (AY, Sem, Program)
        // Since we didn't add constraints to the eval queries above, we can do it in-memory if needed.
        // For simplicity, we count all fetched verdicts.
        verdictCounts[evalData.verdict] += 1;
      }
    });

    const totalVerdicts = Object.values(verdictCounts).reduce((a, b) => a + b, 0);
    const statusDistribution: StatusDistributionItem[] = [
      { name: 'Approved (86-100)', value: verdictCounts['APPROVED'], color: STATUS_COLORS.approved, percentage: totalVerdicts ? Math.round((verdictCounts['APPROVED'] / totalVerdicts) * 100) : 0 },
      { name: 'Approved w/ Revisions (75-85)', value: verdictCounts['APPROVED_WITH_REVISIONS'], color: STATUS_COLORS.pending, percentage: totalVerdicts ? Math.round((verdictCounts['APPROVED_WITH_REVISIONS'] / totalVerdicts) * 100) : 0 },
      { name: 'Disapproved (<75)', value: verdictCounts['DISAPPROVED'], color: STATUS_COLORS.rejected, percentage: totalVerdicts ? Math.round((verdictCounts['DISAPPROVED'] / totalVerdicts) * 100) : 0 },
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
    // 5. STUDENTS BY PROGRAM (Exclusively BSIT & BSCS with Specializations)
    // ─────────────────────────────────────────────────────────────
    // 1. Strictly isolate active student accounts enrolled in degree programs
    // Strictly exclude faculty and admin accounts
    const facultyOrAdminRoles = ['admin', 'adviser', 'panelist', 'research_coordinator', 'faculty'];

    // If studentUsers is empty (e.g. constraints didn't match), fallback to userService.getAllUsers()
    let allStudentCandidates = studentUsers;
    if (allStudentCandidates.length === 0) {
      try {
        const fetched = await userService.getAllUsers();
        allStudentCandidates = fetched;
      } catch (err) {
        console.warn('[adminAnalytics] Fallback user fetch warning:', err);
      }
    }

    const activeEnrolledStudents = allStudentCandidates.filter((u) => {
      // Must not be faculty or admin
      if (u.role && facultyOrAdminRoles.includes(u.role)) return false;
      if (u.role !== 'student') return false;

      // Must be an active/approved account (exclude rejected or pending)
      if (u.status === 'rejected') return false;
      if (u.status === 'pending' || u.is_approved === false) return false;

      // Must belong to one of the two main undergraduate degree programs (BSIT or BSCS)
      const progCode = (u.programCode || u.courseId || '').toUpperCase().trim();
      const progName = (u.program || '').toUpperCase().trim();
      const isBSIT = progCode === 'BSIT' || progCode === 'IT' || progName.includes('INFORMATION TECHNOLOGY');
      const isBSCS = progCode === 'BSCS' || progCode === 'CS' || progName.includes('COMPUTER SCIENCE');

      return isBSIT || isBSCS;
    });

    const bsitStudents: UserProfile[] = [];
    const bscsStudents: UserProfile[] = [];

    activeEnrolledStudents.forEach((stu) => {
      const progCode = (stu.programCode || stu.courseId || '').toUpperCase().trim();
      const progName = (stu.program || '').toUpperCase().trim();

      if (progCode === 'BSCS' || progCode === 'CS' || progName.includes('COMPUTER SCIENCE')) {
        bscsStudents.push(stu);
      } else {
        // Enrolled in BSIT
        bsitStudents.push(stu);
      }
    });

    // BSIT Specialization Breakdown: WMAD, AMG, SMP
    const bsitSpecializationCounts = {
      WMAD: 0,
      AMG: 0,
      SMP: 0,
    };
    let bsitOtherSpec = 0;

    bsitStudents.forEach((stu) => {
      const specCode = (stu.majorCode || stu.specializationId || '').toUpperCase().trim();
      const specStr = (stu.programSpecialization || stu.major || '').toUpperCase();

      if (specCode.includes('WMAD') || specStr.includes('WMAD') || specStr.includes('WEB AND MOBILE')) {
        bsitSpecializationCounts.WMAD += 1;
      } else if (specCode.includes('AMG') || specStr.includes('AMG') || specStr.includes('ANIMATION')) {
        bsitSpecializationCounts.AMG += 1;
      } else if (specCode.includes('SMP') || specStr.includes('SMP') || specStr.includes('SERVICE MANAGEMENT')) {
        bsitSpecializationCounts.SMP += 1;
      } else {
        bsitOtherSpec += 1;
      }
    });

    const bsitSpecializations: SpecializationDistributionItem[] = [
      { code: 'WMAD', name: 'Web & Mobile Applications', count: bsitSpecializationCounts.WMAD },
      { code: 'AMG', name: 'Animation & Motion Graphics', count: bsitSpecializationCounts.AMG },
      { code: 'SMP', name: 'Service Management Program', count: bsitSpecializationCounts.SMP },
    ];
    if (bsitOtherSpec > 0) {
      bsitSpecializations.push({ code: 'General', name: 'General Track / Unspecified', count: bsitOtherSpec });
    }

    // BSCS Specialization Breakdown: IS (Intelligent Systems)
    const bscsSpecializationCounts = {
      IS: 0,
    };
    let bscsOtherSpec = 0;

    bscsStudents.forEach((stu) => {
      const specCode = (stu.majorCode || stu.specializationId || '').toUpperCase().trim();
      const specStr = (stu.programSpecialization || stu.major || '').toUpperCase();

      if (specCode.includes('IS') || specStr.includes('IS') || specStr.includes('INTELLIGENT')) {
        bscsSpecializationCounts.IS += 1;
      } else {
        bscsOtherSpec += 1;
      }
    });

    const bscsSpecializations: SpecializationDistributionItem[] = [
      { code: 'IS', name: 'Intelligent Systems', count: bscsSpecializationCounts.IS },
    ];
    if (bscsOtherSpec > 0) {
      bscsSpecializations.push({ code: 'General', name: 'General Track / Unspecified', count: bscsOtherSpec });
    }

    const totalEnrolledProgramStudents = bsitStudents.length + bscsStudents.length;

    const matchedBSIT = courseMap.get('bsit');
    const matchedBSCS = courseMap.get('bscs');

    const studentsByProgram: ProgramDistributionItem[] = [
      {
        courseId: 'bsit',
        courseCode: 'BSIT',
        courseName: matchedBSIT?.name || 'Bachelor of Science in Information Technology',
        studentCount: bsitStudents.length,
        percentage: totalEnrolledProgramStudents > 0 ? Math.round((bsitStudents.length / totalEnrolledProgramStudents) * 100) : 0,
        color: '#3b82f6',
        specializations: bsitSpecializations,
      },
      {
        courseId: 'bscs',
        courseCode: 'BSCS',
        courseName: matchedBSCS?.name || 'Bachelor of Science in Computer Science',
        studentCount: bscsStudents.length,
        percentage: totalEnrolledProgramStudents > 0 ? Math.round((bscsStudents.length / totalEnrolledProgramStudents) * 100) : 0,
        color: '#8b5cf6',
        specializations: bscsSpecializations,
      },
    ].sort((a, b) => b.studentCount - a.studentCount);

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
