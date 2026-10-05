// src/pages/AdviserAdvisees.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import {
  HiUsers,
  HiCheckCircle,
  HiMagnifyingGlass,
  HiArrowRight,
  HiFolder,
  HiClock,
  HiArrowTrendingUp,
  HiCalendar,
  HiArchiveBox,
  HiArchiveBoxArrowDown,
  HiArrowPath,
  HiExclamationCircle,
  HiShieldCheck,
  HiChatBubbleBottomCenterText,
} from 'react-icons/hi2';
import { facultyService } from '../services/faculty.service';
import { courseService } from '../services/course.service';
import { sectionService } from '../services/section.service';
import { scheduleService } from '../services/schedule.service';
import { researchWorkspaceService } from '../services/researchWorkspace.service';
import { groupService } from '../services/group.service';

const ARCHIVE_REASONS = [
  { id: 'defense_passed', label: 'Final Defense Passed & Manuscript Approved' },
  { id: 'manuscript_completed', label: 'Camera-Ready Copy Submitted & Signed Off' },
  { id: 'term_concluded', label: 'Academic Term / Cohort Concluded' },
  { id: 'other', label: 'Other Completion Reason (Enter below)' },
];

export const AdviserAdvisees = () => {
  const { currentUser, userProfile, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [groups, setGroups] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', variant: 'error' });
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleMap, setScheduleMap] = useState({});

  // Active / Archived Tab Filter
  const initialTab = searchParams.get('tab') === 'archived' ? 'archived' : 'active';
  const [tabFilter, setTabFilter] = useState(initialTab); // 'active' | 'archived' | 'all'

  // Archive Modal State
  const [archiveModalGroup, setArchiveModalGroup] = useState(null);
  const [selectedReasonId, setSelectedReasonId] = useState('defense_passed');
  const [customReasonNote, setCustomReasonNote] = useState('');
  const [submittingArchive, setSubmittingArchive] = useState(false);

  // Restore Modal State
  const [restoreModalGroup, setRestoreModalGroup] = useState(null);
  const [submittingRestore, setSubmittingRestore] = useState(false);

  const fetchAdviseeData = async () => {
    setLoading(true);
    try {
      const [fetchedGroups, allCourses, allSections, allSchedules, allWorkspaces] = await Promise.all([
        facultyService.getAdviserGroups(currentUser.uid),
        courseService.getAllCourses(),
        sectionService.getAllSections(),
        scheduleService.getAllSchedules().catch(() => []),
        researchWorkspaceService.getWorkspacesByAdviser(currentUser.uid).catch(() => []),
      ]);

      const wsMap = {};
      (allWorkspaces || []).forEach((w) => {
        if (w.groupId) wsMap[w.groupId] = w;
        if (w.id) wsMap[w.id] = w;
      });

      // Also ensure any group missing in allWorkspaces gets checked
      await Promise.all(
        (fetchedGroups || []).map(async (grp) => {
          if (!wsMap[grp.id]) {
            try {
              let ws = await researchWorkspaceService.getWorkspaceByStudentOrGroup('', grp.id);
              if (!ws && Array.isArray(grp.members) && grp.members.length > 0) {
                for (const m of grp.members) {
                  if (m.uid) {
                    ws = await researchWorkspaceService.getWorkspaceByStudentOrGroup(m.uid);
                    if (ws) break;
                  }
                }
              }
              if (ws) wsMap[grp.id] = ws;
            } catch (err) {}
          }
        })
      );

      const progress = await facultyService.getGroupsProgressSummary(fetchedGroups);
      setProgressMap(progress);

      // Build schedule map
      const schMap = {};
      allSchedules.forEach((sch) => {
        if (sch.status !== 'cancelled') {
          const gId = sch.projectId || sch.groupId;
          if (gId) schMap[gId] = sch;
        }
      });
      setScheduleMap(schMap);

      const enriched = fetchedGroups.map((group) => {
        const course = allCourses.find((c) => c.id === group.courseId);
        const section = allSections.find((s) => s.id === group.sectionId);
        const ws = wsMap[group.id];
        const resolvedTitle = group.title || ws?.title || '';

        // Auto-sync missing title back to group document in Firestore
        if (group.id && ws?.title && (!group.title || group.title !== ws.title)) {
          groupService.updateGroup(group.id, { title: ws.title }).catch((err) => {
            console.warn('[AdviserAdvisees] auto-sync title failed:', err);
          });
        }

        return {
          ...group,
          title: resolvedTitle,
          programCode: course?.code || course?.name || 'BSIT',
          sectionName: section?.name || group.sectionName || 'A',
          majorDisplay: group.specialization || group.majorCode || course?.specializations?.[0]?.code || '',
          schedule: schMap[group.id] || null,
          isArchived: Boolean(group.isArchived || group.status === 'archived'),
          archivedAt: group.archivedAt || ws?.archivedAt,
          archivedByName: group.archivedByName || ws?.archivedByName,
          archiveReason: group.archiveReason || ws?.archiveReason,
        };
      });

      setGroups(enriched);
    } catch (err) {
      console.error('[AdviserAdvisees] fetch error:', err);
      setToast({ message: 'Failed to load advisee groups.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchAdviseeData();
    }
  }, [currentUser?.uid]);

  // Tab counts
  const activeCount = useMemo(() => groups.filter((g) => !g.isArchived).length, [groups]);
  const archivedCount = useMemo(() => groups.filter((g) => g.isArchived).length, [groups]);
  const totalCount = groups.length;

  // Filtered Advisees
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      // 1. Tab check
      if (tabFilter === 'active' && g.isArchived) return false;
      if (tabFilter === 'archived' && !g.isArchived) return false;

      // 2. Search check
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;

      const nameMatch = (g.name || '').toLowerCase().includes(query);
      const titleMatch = (g.title || '').toLowerCase().includes(query);
      const programMatch = (g.programCode || '').toLowerCase().includes(query);
      const reasonMatch = (g.archiveReason || '').toLowerCase().includes(query);
      const memberMatch = (g.members || []).some((m) =>
        (m.fullName || m.name || '').toLowerCase().includes(query)
      );

      return nameMatch || titleMatch || programMatch || reasonMatch || memberMatch;
    });
  }, [groups, tabFilter, searchQuery]);

  // Handle Tab Switch
  const handleTabChange = (newTab) => {
    setTabFilter(newTab);
    setSearchParams(newTab === 'active' ? {} : { tab: newTab });
  };

  // Open Archive Modal
  const handleOpenArchiveModal = (group) => {
    // Permission check
    const isAssigned = group.adviserId === currentUser.uid;
    const isPrivileged = role === 'admin' || role === 'research_coordinator';
    if (!isAssigned && !isPrivileged) {
      setToast({
        message: 'Permission Denied: Only the assigned research adviser can archive this advisee group.',
        variant: 'error',
      });
      return;
    }

    setArchiveModalGroup(group);
    setSelectedReasonId('defense_passed');
    setCustomReasonNote('');
  };

  // Execute Archive
  const handleConfirmArchive = async () => {
    if (!archiveModalGroup) return;

    setSubmittingArchive(true);
    try {
      const selectedItem = ARCHIVE_REASONS.find((r) => r.id === selectedReasonId);
      const finalReason =
        selectedReasonId === 'other'
          ? customReasonNote.trim() || 'Research requirements completed.'
          : selectedItem?.label || 'Research completed.';

      await groupService.archiveAdviseeGroup(
        archiveModalGroup.id,
        currentUser.uid,
        currentUser.displayName || userProfile?.fullName || 'Faculty Adviser',
        finalReason,
        role
      );

      setToast({
        message: `Advisee group "${archiveModalGroup.name}" has been successfully archived.`,
        variant: 'success',
      });
      setArchiveModalGroup(null);
      await fetchAdviseeData();
    } catch (err) {
      console.error('[AdviserAdvisees] archive error:', err);
      setToast({ message: err.message || 'Failed to archive advisee group.', variant: 'error' });
    } finally {
      setSubmittingArchive(false);
    }
  };

  // Open Restore Modal
  const handleOpenRestoreModal = (group) => {
    const isAssigned = group.adviserId === currentUser.uid;
    const isPrivileged = role === 'admin' || role === 'research_coordinator';
    if (!isAssigned && !isPrivileged) {
      setToast({
        message: 'Permission Denied: Only the assigned research adviser can restore this advisee group.',
        variant: 'error',
      });
      return;
    }
    setRestoreModalGroup(group);
  };

  // Execute Restore
  const handleConfirmRestore = async () => {
    if (!restoreModalGroup) return;

    setSubmittingRestore(true);
    try {
      await groupService.unarchiveAdviseeGroup(
        restoreModalGroup.id,
        currentUser.uid,
        currentUser.displayName || userProfile?.fullName || 'Faculty Adviser',
        role
      );

      setToast({
        message: `Advisee group "${restoreModalGroup.name}" has been restored to active advisees.`,
        variant: 'success',
      });
      setRestoreModalGroup(null);
      await fetchAdviseeData();
    } catch (err) {
      console.error('[AdviserAdvisees] restore error:', err);
      setToast({ message: err.message || 'Failed to restore advisee group.', variant: 'error' });
    } finally {
      setSubmittingRestore(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast.message && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast({ message: '', variant: 'error' })}
        />
      )}

      <PageHeader
        icon={HiUsers}
        title="My Advisees"
        description="Monitor research progress, review milestone drafts, and archive completed advisee research groups."
      />

      <Card className="p-6">
        {/* Top Header & Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <HiFolder className="w-5 h-5 text-blue-600" />
              Advisee Research Groups
            </h3>

            {/* Pill Tabs for Active vs Archived */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => handleTabChange('active')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  tabFilter === 'active'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span>Active Advisees</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                  {activeCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('archived')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  tabFilter === 'archived'
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span>Archived</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold">
                  {archivedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('all')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  tabFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                All ({totalCount})
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative max-w-xs w-full">
            <HiMagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, title, or program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-sm">Loading advisee research groups...</span>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            {groups.length === 0 ? (
              <div className="space-y-2">
                <HiUsers className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                <h4 className="text-base font-bold text-gray-800 dark:text-gray-200">
                  No Assigned Advisees
                </h4>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">
                  You currently have no assigned research groups. When student groups select you or are assigned, they will appear here.
                </p>
              </div>
            ) : tabFilter === 'archived' ? (
              <div className="space-y-2">
                <HiArchiveBox className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                <h4 className="text-base font-bold text-gray-800 dark:text-gray-200">
                  No Archived Advisees
                </h4>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">
                  When your advisee groups pass their final defense or complete their manuscripts, you can archive them here.
                </p>
              </div>
            ) : (
              'No advisee groups match your search criteria.'
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="pb-3 px-4 font-semibold">Group & Title</th>
                  <th className="pb-3 px-4 font-semibold">Student Members</th>
                  <th className="pb-3 px-4 font-semibold">Program / Section</th>
                  <th className="pb-3 px-4 font-semibold">Manuscript Status</th>
                  <th className="pb-3 px-4 font-semibold">Defense Schedule</th>
                  <th className="pb-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
                {filteredGroups.map((group) => {
                  const progress = progressMap[group.id] || 0;
                  const membersList = group.members || [];
                  const sch = group.schedule;
                  const isAssigned = group.adviserId === currentUser.uid;
                  const canManageArchive = isAssigned || role === 'admin' || role === 'research_coordinator';

                  return (
                    <tr
                      key={group.id}
                      className={`hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        group.isArchived ? 'bg-gray-50/40 dark:bg-slate-900/20 opacity-90' : ''
                      }`}
                    >
                      {/* Group & Title */}
                      <td className="py-4 px-4 min-w-[220px]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 dark:text-white">
                            {group.name}
                          </span>
                          {group.isArchived && (
                            <Badge variant="purple" size="sm" className="font-semibold text-[10px]">
                              Archived
                            </Badge>
                          )}
                        </div>
                        <div
                          className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-xs"
                          title={group.title || 'No Research Title Set'}
                        >
                          {group.title || 'No Research Title Set'}
                        </div>
                        {group.isArchived && group.archiveReason && (
                          <div
                            className="mt-1 text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded border border-purple-200/50 dark:border-purple-800/30 inline-block max-w-xs truncate"
                            title={group.archiveReason}
                          >
                            Reason: {group.archiveReason}
                          </div>
                        )}
                      </td>

                      {/* Student Members */}
                      <td className="py-4 px-4 min-w-[180px]">
                        {membersList.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">No members assigned</span>
                        ) : (
                          <div className="space-y-1">
                            {membersList.slice(0, 3).map((m, idx) => (
                              <div key={m.uid || idx} className="text-xs text-gray-700 dark:text-gray-300">
                                <span className="font-medium">{m.fullName || m.name}</span>
                                {(m.studentNumber || m.studentIdOrEmployeeId) && (
                                  <span className="text-gray-400 font-mono ml-1.5 text-[11px]">
                                    ({m.studentNumber || m.studentIdOrEmployeeId})
                                  </span>
                                )}
                              </div>
                            ))}
                            {membersList.length > 3 && (
                              <span className="text-[10px] text-gray-400 font-semibold block">
                                +{membersList.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Program, Major & Section */}
                      <td className="py-4 px-4 text-xs text-gray-700 dark:text-gray-300 min-w-[140px]">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {group.programCode}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {group.majorDisplay ? `${group.majorDisplay} • ` : ''}Section {group.sectionName}
                        </div>
                      </td>

                      {/* Manuscript Status */}
                      <td className="py-4 px-4 min-w-[140px]">
                        {group.isArchived ? (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                              <HiCheckCircle className="w-3.5 h-3.5" />
                              Completed
                            </span>
                            <span className="text-[11px] text-gray-400 block">
                              {group.archivedAt ? new Date(group.archivedAt).toLocaleDateString() : 'Archived'}
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                {progress}%
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-400 capitalize block mt-1">
                              {group.status || 'in_progress'}
                            </span>
                          </>
                        )}
                      </td>

                      {/* Defense Schedule */}
                      <td className="py-4 px-4 min-w-[170px]">
                        {sch ? (
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                              <HiCalendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              {sch.date}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <HiClock className="w-3 h-3 text-gray-400 shrink-0" />
                              {sch.startTime} – {sch.endTime}
                            </div>
                            <div className="text-[11px] text-gray-400 truncate max-w-[150px]">
                              {sch.venue || sch.location || 'Room TBA'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not Scheduled</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate(`/faculty/workspace/${group.id}`)}
                            title="Open collaborative workspace and drafts"
                          >
                            Workspace <HiArrowRight className="w-3 h-3 ml-1" />
                          </Button>

                          {/* Adviser Archiving Permission Action */}
                          {canManageArchive && (
                            <>
                              {!group.isArchived ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenArchiveModal(group)}
                                  className="px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs font-medium transition flex items-center gap-1 shadow-2xs"
                                  title="Archive this advisee group upon completion"
                                >
                                  <HiArchiveBox className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                  <span>Archive</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRestoreModal(group)}
                                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 text-xs font-medium transition flex items-center gap-1 shadow-2xs"
                                  title="Restore advisee group back to active list"
                                >
                                  <HiArrowPath className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                                  <span>Restore</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ==================================================== */}
      {/* ARCHIVE CONFIRMATION MODAL                           */}
      {/* ==================================================== */}
      <Modal
        isOpen={Boolean(archiveModalGroup)}
        onClose={() => setArchiveModalGroup(null)}
        title="Archive Advisee Group"
        icon={HiArchiveBox}
        maxWidth="max-w-lg"
      >
        {archiveModalGroup && (
          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Adviser Sign-off
                </span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {archiveModalGroup.programCode} Section {archiveModalGroup.sectionName}
                </span>
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                {archiveModalGroup.name}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 italic">
                "{archiveModalGroup.title || 'Untitled Research'}"
              </p>
            </div>

            {/* Students List */}
            {archiveModalGroup.members?.length > 0 && (
              <div className="bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl border border-gray-100 dark:border-slate-700/60">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                  Advisee Members ({archiveModalGroup.members.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {archiveModalGroup.members.map((m) => (
                    <span
                      key={m.uid}
                      className="px-2 py-0.5 rounded-md text-xs bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-600 font-medium"
                    >
                      {m.fullName || m.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Archive Notice */}
            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 leading-relaxed flex items-start gap-2.5">
              <HiShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Confirm Research Completion</p>
                <p className="text-blue-800 dark:text-blue-300 mt-0.5">
                  As the assigned research adviser, archiving this advisee group marks their research as concluded. All manuscripts, tasks, and advisory feedback will be safely preserved in your archives.
                </p>
              </div>
            </div>

            {/* Reason Selection */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                Completion Reason / Milestone:
              </label>
              <div className="space-y-2">
                {ARCHIVE_REASONS.map((reason) => (
                  <label
                    key={reason.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition text-xs ${
                      selectedReasonId === reason.id
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-gray-900 dark:text-white font-medium'
                        : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="archiveReason"
                      value={reason.id}
                      checked={selectedReasonId === reason.id}
                      onChange={() => setSelectedReasonId(reason.id)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>{reason.label}</span>
                  </label>
                ))}
              </div>

              {selectedReasonId === 'other' && (
                <div className="pt-1">
                  <textarea
                    rows={2}
                    placeholder="Enter custom completion note or instructions..."
                    value={customReasonNote}
                    onChange={(e) => setCustomReasonNote(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setArchiveModalGroup(null)}
                disabled={submittingArchive}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmArchive}
                disabled={submittingArchive}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
              >
                {submittingArchive ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                    <span>Archiving...</span>
                  </>
                ) : (
                  <>
                    <HiArchiveBox className="w-4 h-4" />
                    <span>Archive Advisee Group</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================================================== */}
      {/* RESTORE CONFIRMATION MODAL                           */}
      {/* ==================================================== */}
      <Modal
        isOpen={Boolean(restoreModalGroup)}
        onClose={() => setRestoreModalGroup(null)}
        title="Restore Advisee Group"
        icon={HiArrowPath}
        maxWidth="max-w-md"
      >
        {restoreModalGroup && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Are you sure you want to restore <strong>{restoreModalGroup.name}</strong> back to your active advisees?
            </p>
            <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-xs text-gray-500 dark:text-gray-400">
              This will reactivate their workspace, allow further task and revision updates, and remove them from the archived list.
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRestoreModalGroup(null)}
                disabled={submittingRestore}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmRestore}
                disabled={submittingRestore}
                className="font-semibold flex items-center gap-1.5"
              >
                {submittingRestore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                    <span>Restoring...</span>
                  </>
                ) : (
                  <>
                    <HiArrowPath className="w-4 h-4" />
                    <span>Restore Advisee</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdviserAdvisees;
