// src/services/masterCalendar.service.ts
import { scheduleService } from './schedule.service';
import researchWorkspaceService from './researchWorkspace.service';
import researchTaskService from './researchTask.service';
import researchFeedbackService from './researchFeedback.service';
import titleProposalService from './titleProposal.service';
import { groupService } from './group.service';

export type CalendarEventType =
  | 'DEFENSE'
  | 'CONSULTATION'
  | 'SUBMISSION'
  | 'REVISION'
  | 'TASK'
  | 'OTHER';

export interface CalendarEvent {
  id: string;
  sourceType: 'schedule' | 'revision' | 'task' | 'submission' | 'proposal' | 'workspace_section';
  sourceId: string;
  eventType: CalendarEventType;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // e.g. "8:00 AM" or "10:30 AM"
  endTime?: string;
  groupId?: string;
  groupName?: string;
  researchTitle?: string;
  chapter?: string;
  assignedBy?: string;
  assignedTo?: string;
  venue?: string;
  status: string; // original status, e.g. 'scheduled', 'open', 'revision_required', 'todo', etc.
  statusLabel: string; // user-friendly status, e.g. "For Revision", "Scheduled", "In Progress"
  isOverdue: boolean; // dynamically calculated
  link?: string;
  panelistRole?: string; // Evaluator role if viewed by panelist (e.g. "Subject Specialist", "Technical")
  rawRecord?: any;
}

export interface UserCalendarResult {
  events: CalendarEvent[];
  groupInfo?: any;
  adviseeGroups?: any[];
  emptyReason?: 'NO_GROUP' | 'NO_EVENTS' | null;
}

/**
 * Normalizes any timestamp or date representation into a YYYY-MM-DD string.
 */
export function normalizeDate(input: any): string | null {
  if (!input) return null;
  if (typeof input === 'string') {
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const d = new Date(input);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  if (typeof input === 'object') {
    if (input.seconds) {
      const d = new Date(input.seconds * 1000);
      return d.toISOString().split('T')[0];
    }
    if (input instanceof Date && !isNaN(input.getTime())) {
      return input.toISOString().split('T')[0];
    }
  }
  return null;
}

/**
 * Formats time string or Date into readable 12-hour format: "8:00 AM"
 */
export function formatTime12Hour(timeStr?: string): string {
  if (!timeStr) return '';
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10);
    if (!isNaN(h)) {
      const m = parts[1]?.slice(0, 2) || '00';
      const ampm = h >= 12 ? 'PM' : 'AM';
      const formattedHour = h % 12 || 12;
      return `${formattedHour}:${m} ${ampm}`;
    }
  }
  const d = new Date(timeStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return timeStr;
}

/**
 * Normalizes raw schedules, workspaces, tasks, feedback, and proposals
 * into clean, typed CalendarEvent view representations.
 */
function normalizeRawEvents(
  schedules: any[] = [],
  workspaces: any[] = [],
  tasks: any[] = [],
  feedback: any[] = [],
  proposals: any[] = [],
  groupMap: Map<string, any> = new Map(),
  panelistUid?: string
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Map workspace IDs for quick reference
  const workspaceMap = new Map<string, any>();
  workspaces.forEach((w: any) => {
    if (w?.id) workspaceMap.set(w.id, w);
  });

  // ==========================================
  // 1. DEFENSE & CONSULTATION SCHEDULES
  // ==========================================
  schedules.forEach((sch: any) => {
    const dateStr = normalizeDate(sch.date);
    if (!dateStr) return;

    const isDefense =
      sch.defenseType === 'proposal_defense' ||
      sch.defenseType === 'final_defense' ||
      (sch.projectTitle && sch.projectTitle.toLowerCase().includes('defense')) ||
      (sch.title && sch.title.toLowerCase().includes('defense'));

    const isConsultation =
      sch.defenseType === 'consultation' ||
      (sch.projectTitle && sch.projectTitle.toLowerCase().includes('consultation')) ||
      (sch.title && sch.title.toLowerCase().includes('consultation'));

    const eventType: CalendarEventType = isDefense
      ? 'DEFENSE'
      : isConsultation
      ? 'CONSULTATION'
      : 'DEFENSE';

    const typeTitle =
      sch.defenseType === 'proposal_defense'
        ? 'Proposal Defense'
        : sch.defenseType === 'final_defense'
        ? 'Final Defense'
        : isConsultation
        ? 'Adviser Consultation'
        : 'Research Defense';

    // Panelist-specific role detection if viewed by panelist
    let panelistRole: string | undefined;
    if (panelistUid) {
      const assignment = sch.panelists?.find(
        (p: any) => p.uid === panelistUid || p.id === panelistUid
      );
      if (assignment?.role) {
        panelistRole = assignment.role;
      }
    }

    const formattedTime = formatTime12Hour(sch.startTime || sch.time);
    const formattedEndTime = sch.endTime ? formatTime12Hour(sch.endTime) : undefined;
    const statusRaw = sch.status || 'scheduled';
    const isOverdue =
      dateStr < todayStr && !['completed', 'approved', 'cancelled'].includes(statusRaw.toLowerCase());

    events.push({
      id: `sch_${sch.id}`,
      sourceType: 'schedule',
      sourceId: sch.id,
      eventType,
      title: `${typeTitle} - ${sch.projectTitle || sch.title || 'Research Project'}`,
      description: sch.venue ? `Venue: ${sch.venue}` : undefined,
      date: dateStr,
      time: formattedTime,
      endTime: formattedEndTime,
      groupId: sch.groupId || sch.projectId,
      groupName: sch.groupName || (sch.groupId && groupMap.get(sch.groupId)?.name) || 'Research Team',
      researchTitle: sch.projectTitle || sch.title,
      assignedBy: sch.adviserName,
      assignedTo: sch.panelistNames?.join(', ') || (sch.panelists?.map((p: any) => p.name || p.fullName).join(', ')),
      venue: sch.venue || sch.location,
      status: statusRaw,
      statusLabel: statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1),
      isOverdue,
      panelistRole,
      link: sch.projectId ? `/schedules` : '/admin/scheduling',
      rawRecord: sch,
    });
  });

  // ==========================================
  // 2. RESEARCH TASKS & REVISION TASKS
  // ==========================================
  tasks.forEach((task: any) => {
    const dateStr = normalizeDate(task.dueDate);
    if (!dateStr) return;

    const ws = task.workspaceId ? workspaceMap.get(task.workspaceId) : null;
    const isRevision =
      task.status === 'revision_required' ||
      task.title?.toLowerCase().includes('revision') ||
      task.title?.toLowerCase().includes('revise') ||
      task.description?.toLowerCase().includes('revision');

    const eventType: CalendarEventType = isRevision ? 'REVISION' : 'TASK';
    const statusRaw = task.status || 'todo';
    const isOverdue =
      dateStr < todayStr && !['completed', 'resolved', 'approved'].includes(statusRaw.toLowerCase());

    const statusLabel =
      statusRaw === 'revision_required'
        ? 'For Revision'
        : statusRaw === 'in_progress'
        ? 'In Progress'
        : statusRaw === 'submitted'
        ? 'Submitted for Review'
        : statusRaw === 'completed'
        ? 'Completed'
        : 'To Do';

    events.push({
      id: `task_${task.id}`,
      sourceType: isRevision ? 'revision' : 'task',
      sourceId: task.id,
      eventType,
      title: task.title,
      description: task.description,
      date: dateStr,
      time: 'All Day',
      groupId: ws?.groupId,
      groupName: ws?.groupName || (ws?.groupId && groupMap.get(ws.groupId)?.name) || 'Research Team',
      researchTitle: ws?.title,
      chapter: task.sectionId
        ? task.sectionId.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
        : undefined,
      assignedBy: task.adviserName || ws?.adviserName,
      assignedTo: task.studentName,
      status: statusRaw,
      statusLabel,
      isOverdue,
      link: ws?.documentId
        ? `/documents/${ws.documentId}`
        : ws?.id
        ? `/faculty/workspace/${ws.id}`
        : '/research/workspace',
      rawRecord: task,
    });
  });

  // ==========================================
  // 3. RESEARCH FEEDBACK & REVISION DEADLINES
  // ==========================================
  feedback.forEach((fb: any) => {
    const dateStr = normalizeDate(fb.dueDate || fb.deadline || fb.updatedAt || fb.createdAt);
    if (!dateStr) return;

    const ws = fb.workspaceId ? workspaceMap.get(fb.workspaceId) : null;
    const statusRaw = fb.status || 'open';
    const isOverdue =
      dateStr < todayStr && !['resolved', 'completed', 'approved'].includes(statusRaw.toLowerCase());

    const statusLabel =
      statusRaw === 'open' || statusRaw === 'new'
        ? 'New Revision'
        : statusRaw === 'addressed'
        ? 'Submitted for Review'
        : statusRaw === 'resolved'
        ? 'Resolved'
        : 'For Revision';

    events.push({
      id: `fb_${fb.id}`,
      sourceType: 'revision',
      sourceId: fb.id,
      eventType: 'REVISION',
      title: `Revision: ${fb.comment ? fb.comment.slice(0, 60) + (fb.comment.length > 60 ? '...' : '') : 'Manuscript Revision'}`,
      description: fb.comment,
      date: dateStr,
      time: formatTime12Hour(fb.createdAt) || 'All Day',
      groupId: ws?.groupId,
      groupName: ws?.groupName || (ws?.groupId && groupMap.get(ws.groupId)?.name) || 'Research Team',
      researchTitle: ws?.title,
      chapter: fb.sectionId
        ? fb.sectionId.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
        : undefined,
      assignedBy: fb.authorName,
      assignedTo: fb.studentName,
      status: statusRaw,
      statusLabel,
      isOverdue,
      link: ws?.documentId
        ? `/documents/${ws.documentId}?tab=comments`
        : ws?.id
        ? `/faculty/workspace/${ws.id}`
        : '/research/workspace',
      rawRecord: fb,
    });
  });

  // ==========================================
  // 4. WORKSPACE SECTIONS / CHAPTER MILESTONES
  // ==========================================
  workspaces.forEach((ws: any) => {
    if (Array.isArray(ws.sections)) {
      ws.sections.forEach((sec: any) => {
        // Chapter submissions
        if (sec.submittedAt) {
          const dateStr = normalizeDate(sec.submittedAt);
          if (dateStr) {
            events.push({
              id: `sec_sub_${ws.id}_${sec.id}`,
              sourceType: 'workspace_section',
              sourceId: `${ws.id}_${sec.id}`,
              eventType: 'SUBMISSION',
              title: `Manuscript Submission - ${sec.name || sec.id}`,
              description: `Submitted for review under ${ws.title}`,
              date: dateStr,
              time: formatTime12Hour(sec.submittedAt) || 'All Day',
              groupId: ws.groupId,
              groupName: ws.groupName || (ws.groupId && groupMap.get(ws.groupId)?.name) || 'Research Team',
              researchTitle: ws.title,
              chapter: sec.name || sec.id,
              assignedBy: ws.adviserName,
              status: sec.status || 'submitted',
              statusLabel: 'Submitted for Review',
              isOverdue: false,
              link: ws.documentId ? `/documents/${ws.documentId}` : `/faculty/workspace/${ws.id}`,
              rawRecord: sec,
            });
          }
        }

        // Chapter revisions flagged
        if (sec.status === 'revision_required' && sec.updatedAt) {
          const dateStr = normalizeDate(sec.updatedAt);
          if (dateStr) {
            const isOverdue = dateStr < todayStr;
            events.push({
              id: `sec_rev_${ws.id}_${sec.id}`,
              sourceType: 'revision',
              sourceId: `${ws.id}_${sec.id}`,
              eventType: 'REVISION',
              title: `Revision Required - ${sec.name || sec.id}`,
              description: sec.feedbackComment || `Revisions flagged by ${ws.adviserName || 'Adviser'}.`,
              date: dateStr,
              time: formatTime12Hour(sec.updatedAt) || 'All Day',
              groupId: ws.groupId,
              groupName: ws.groupName || (ws.groupId && groupMap.get(ws.groupId)?.name) || 'Research Team',
              researchTitle: ws.title,
              chapter: sec.name || sec.id,
              assignedBy: ws.adviserName,
              status: 'revision_required',
              statusLabel: 'For Revision',
              isOverdue,
              link: ws.documentId ? `/documents/${ws.documentId}` : `/faculty/workspace/${ws.id}`,
              rawRecord: sec,
            });
          }
        }
      });
    }
  });

  // ==========================================
  // 5. TITLE PROPOSAL SUBMISSIONS & TARGET DATES
  // ==========================================
  proposals.forEach((prop: any) => {
    if (prop.submittedAt) {
      const dateStr = normalizeDate(prop.submittedAt);
      if (dateStr) {
        events.push({
          id: `prop_sub_${prop.id}`,
          sourceType: 'proposal',
          sourceId: prop.id,
          eventType: 'SUBMISSION',
          title: `Title Proposal Submission - ${prop.title}`,
          description: prop.description || prop.abstract,
          date: dateStr,
          time: formatTime12Hour(prop.submittedAt) || 'All Day',
          groupId: prop.groupId,
          groupName: prop.groupName || (prop.groupId && groupMap.get(prop.groupId)?.name) || 'Research Team',
          researchTitle: prop.title,
          status: prop.status || 'submitted',
          statusLabel: (prop.status || 'submitted').replace('_', ' ').toUpperCase(),
          isOverdue: false,
          link: `/proposals/${prop.id}`,
          rawRecord: prop,
        });
      }
    }

    if (prop.targetDefenseDate) {
      const dateStr = normalizeDate(prop.targetDefenseDate);
      if (dateStr) {
        const isOverdue = dateStr < todayStr && prop.status !== 'approved';
        events.push({
          id: `prop_def_${prop.id}`,
          sourceType: 'proposal',
          sourceId: prop.id,
          eventType: 'DEFENSE',
          title: `Target Defense Date - ${prop.title}`,
          description: `Target defense milestone submitted with proposal.`,
          date: dateStr,
          time: 'All Day',
          groupId: prop.groupId,
          groupName: prop.groupName || (prop.groupId && groupMap.get(prop.groupId)?.name) || 'Research Team',
          researchTitle: prop.title,
          status: prop.status || 'pending',
          statusLabel: isOverdue ? 'Overdue Target' : 'Target Schedule',
          isOverdue,
          link: `/proposals/${prop.id}`,
          rawRecord: prop,
        });
      }
    }
  });

  // Sort chronologically by date and time
  return events.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return (a.time || '').localeCompare(b.time || '');
  });
}

export const masterCalendarService = {
  /**
   * Fetches all institutional calendar events across CoreResearch (Admin/Coordinator view).
   */
  async getAllCalendarEvents(): Promise<CalendarEvent[]> {
    const [
      schedulesRes,
      workspacesRes,
      tasksRes,
      feedbackRes,
      proposalsRes,
      groupsRes,
    ] = await Promise.allSettled([
      scheduleService.getAllSchedules(),
      researchWorkspaceService.getAllWorkspaces(),
      researchTaskService.getAllTasks(),
      researchFeedbackService.getAllFeedback(),
      titleProposalService.getAllProposals(),
      groupService.getAllGroups(),
    ]);

    const schedules = schedulesRes.status === 'fulfilled' ? schedulesRes.value || [] : [];
    const workspaces = workspacesRes.status === 'fulfilled' ? workspacesRes.value || [] : [];
    const tasks = tasksRes.status === 'fulfilled' ? tasksRes.value || [] : [];
    const feedback = feedbackRes.status === 'fulfilled' ? feedbackRes.value || [] : [];
    const proposals = proposalsRes.status === 'fulfilled' ? proposalsRes.value || [] : [];
    const groups = groupsRes.status === 'fulfilled' ? groupsRes.value || [] : [];

    const groupMap = new Map<string, any>();
    groups.forEach((g: any) => {
      if (g.id) groupMap.set(g.id, g);
    });

    return normalizeRawEvents(schedules, workspaces, tasks, feedback, proposals, groupMap);
  },

  /**
   * Fetches calendar events strictly authorized for the current user's role:
   * - Admin / Research Coordinator: All university events
   * - Student: Only their assigned research group's events
   * - Adviser: Only their assigned advisee groups' events
   * - Panelist: Only defenses where assigned on the evaluation panel
   */
  async getEventsForUser(
    userProfile: any,
    currentUser: any,
    effectiveRole: string = 'student'
  ): Promise<UserCalendarResult> {
    const userId = userProfile?.uid || currentUser?.uid;

    // 1. ADMIN & RESEARCH COORDINATOR: Unrestricted institutional view
    if (effectiveRole === 'admin' || effectiveRole === 'research_coordinator') {
      const allEvents = await this.getAllCalendarEvents();
      return { events: allEvents };
    }

    // 2. STUDENT: Strictly restricted to their research group
    if (effectiveRole === 'student') {
      if (!userId) {
        return { events: [], groupInfo: null, emptyReason: 'NO_GROUP' };
      }

      const group = await groupService.getGroupByStudentId(userId);
      if (!group || !group.id) {
        return { events: [], groupInfo: null, emptyReason: 'NO_GROUP' };
      }

      const groupId = group.id;

      // Parallel fetch of group-specific records
      const [allSchedules, groupWorkspace, groupProposals] = await Promise.all([
        scheduleService.getAllSchedules(),
        researchWorkspaceService.getWorkspaceByStudentOrGroup(userId, groupId),
        titleProposalService.getProposalsByGroup(groupId),
      ]);

      const groupSchedules = allSchedules.filter(
        (s: any) => s.groupId === groupId || s.projectId === groupId
      );

      let groupTasks: any[] = [];
      let groupFeedback: any[] = [];

      if (groupWorkspace?.id) {
        const [tasks, feedback] = await Promise.all([
          researchTaskService.getTasksByWorkspace(groupWorkspace.id),
          researchFeedbackService.getFeedbackByWorkspace(groupWorkspace.id),
        ]);
        groupTasks = tasks || [];
        groupFeedback = feedback || [];
      }

      const gMap = new Map<string, any>();
      gMap.set(group.id, group);

      const events = normalizeRawEvents(
        groupSchedules,
        groupWorkspace ? [groupWorkspace] : [],
        groupTasks,
        groupFeedback,
        groupProposals || [],
        gMap
      );

      return {
        events,
        groupInfo: group,
        emptyReason: events.length === 0 ? 'NO_EVENTS' : null,
      };
    }

    // 3. ADVISER: Strictly restricted to their assigned advisee groups
    if (effectiveRole === 'adviser') {
      if (!userId) {
        return { events: [], adviseeGroups: [], emptyReason: 'NO_EVENTS' };
      }

      const [adviseeGroups, adviseeWorkspaces, allSchedules, adviserTasks, allFeedback, allProposals] =
        await Promise.all([
          groupService.getGroupsByAdviserId(userId),
          researchWorkspaceService.getWorkspacesByAdviser(userId),
          scheduleService.getAllSchedules(),
          researchTaskService.getTasksByAdviser(userId),
          researchFeedbackService.getAllFeedback(),
          titleProposalService.getAllProposals(),
        ]);

      const groupIds = new Set<string>();
      (adviseeGroups || []).forEach((g: any) => groupIds.add(g.id));
      (adviseeWorkspaces || []).forEach((w: any) => {
        if (w.groupId) groupIds.add(w.groupId);
      });

      const workspaceIds = new Set<string>(
        (adviseeWorkspaces || []).map((w: any) => w.id)
      );

      // Filter schedules to advisee groups or adviser direct matches
      const adviserSchedules = (allSchedules || []).filter(
        (s: any) =>
          s.adviserId === userId ||
          groupIds.has(s.groupId) ||
          groupIds.has(s.projectId)
      );

      // Filter feedback to advisee workspaces or authored by adviser
      const adviseeFeedback = (allFeedback || []).filter(
        (fb: any) => fb.authorId === userId || workspaceIds.has(fb.workspaceId)
      );

      // Filter proposals to advisee groups
      const adviseeProposals = (allProposals || []).filter((p: any) =>
        groupIds.has(p.groupId)
      );

      const gMap = new Map<string, any>();
      (adviseeGroups || []).forEach((g: any) => gMap.set(g.id, g));

      const events = normalizeRawEvents(
        adviserSchedules,
        adviseeWorkspaces || [],
        adviserTasks || [],
        adviseeFeedback,
        adviseeProposals,
        gMap
      );

      return {
        events,
        adviseeGroups,
        emptyReason: events.length === 0 ? 'NO_EVENTS' : null,
      };
    }

    // 4. PANELIST: Strictly defense schedules where assigned on the panel
    if (effectiveRole === 'panelist') {
      if (!userId) {
        return { events: [], emptyReason: 'NO_EVENTS' };
      }

      const allSchedules = await scheduleService.getAllSchedules();
      const panelSchedules = (allSchedules || []).filter((sch: any) => {
        const inIds =
          Array.isArray(sch.panelistIds) && sch.panelistIds.includes(userId);
        const inPanelists =
          Array.isArray(sch.panelists) &&
          sch.panelists.some((p: any) => p.uid === userId || p.id === userId);
        return inIds || inPanelists;
      });

      const events = normalizeRawEvents(
        panelSchedules,
        [],
        [],
        [],
        [],
        new Map(),
        userId
      );

      return {
        events,
        emptyReason: events.length === 0 ? 'NO_EVENTS' : null,
      };
    }

    // Default fallback
    const allEvents = await this.getAllCalendarEvents();
    return { events: allEvents };
  },
};

export default masterCalendarService;
