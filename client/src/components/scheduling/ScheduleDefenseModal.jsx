import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import {
  HiCalendarDays,
  HiMapPin,
  HiUserGroup,
  HiDocumentText,
  HiArrowPath,
  HiCheckCircle,
  HiExclamationCircle,
  HiChevronDown,
  HiMagnifyingGlass,
  HiXMark,
} from 'react-icons/hi2';
import { CalendarPlus } from 'lucide-react';
import { scheduleService } from '../../services/schedule.service';
import { userService } from '../../services/user.service';
import { groupService } from '../../services/group.service';

export const ScheduleDefenseModal = ({
  isOpen,
  onClose,
  groups = [],
  proposals = [],
  schedules = [],
  preselectedGroup = null,
  isRedefenseMode = false,
  onScheduleSaved,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);

  // Form Fields
  const [defenseStage, setDefenseStage] = useState('proposal_defense'); // 'proposal_defense' or 'final_defense'
  const [isRedefense, setIsRedefense] = useState(isRedefenseMode);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [venue, setVenue] = useState('Conference Room A');
  const [notes, setNotes] = useState('');

  // Personnel assignments
  const [adviserId, setAdviserId] = useState('');
  const [adviserName, setAdviserName] = useState('');
  const [subjectSpecialistId, setSubjectSpecialistId] = useState('');
  const [subjectSpecialistName, setSubjectSpecialistName] = useState('');
  const [statId, setStatId] = useState('');
  const [statName, setStatName] = useState('');
  const [techId, setTechId] = useState('');
  const [techName, setTechName] = useState('');

  // Available Users
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch users for adviser/panelist selections
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const [panelists, advisers, faculty, coordinators, admins] = await Promise.all([
          userService.getUsersByRole('panelist').catch(() => []),
          userService.getUsersByRole('adviser').catch(() => []),
          userService.getUsersByRole('faculty').catch(() => []),
          userService.getUsersByRole('research_coordinator').catch(() => []),
          userService.getUsersByRole('admin').catch(() => []),
        ]);
        const combined = [...panelists, ...advisers, ...faculty, ...coordinators, ...admins];
        const unique = Array.from(new Map(combined.map((u) => [u.uid, u])).values());
        setAvailableUsers(unique);
      } catch (err) {
        console.error('Failed to fetch faculty for scheduling:', err);
      }
    };
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Selected group object
  const currentGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  // Approved proposal for selected group
  const currentProposal = useMemo(() => {
    if (!selectedGroupId) return null;
    return proposals.find((p) => p.groupId === selectedGroupId) || null;
  }, [proposals, selectedGroupId]);

  // Previous schedules for the selected group
  const groupSchedulesHistory = useMemo(() => {
    if (!selectedGroupId) return [];
    return schedules
      .filter((s) => s.projectId === selectedGroupId || s.groupId === selectedGroupId)
      .sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0));
  }, [schedules, selectedGroupId]);

  // Synchronize on modal open or preselected group change
  useEffect(() => {
    if (isOpen) {
      setError(null);
      const targetGroup = preselectedGroup || (groups.length > 0 ? groups[0] : null);
      if (targetGroup) {
        setSelectedGroupId(targetGroup.id);
        populateFromGroup(targetGroup.id, isRedefenseMode);
      } else {
        setSelectedGroupId('');
      }
    }
  }, [isOpen, preselectedGroup, isRedefenseMode]);

  // Auto-populate form when a group is selected
  const populateFromGroup = (groupId, forceRedefense = false) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    // Past attempts for this group
    const pastSchedules = schedules.filter(
      (s) => s.projectId === groupId || s.groupId === groupId
    );

    // Auto-detect proposal vs final defense from latest schedule
    const latestSchedule = pastSchedules[pastSchedules.length - 1];
    const prevType = latestSchedule?.defenseType === 'final_defense' ? 'final_defense' : 'proposal_defense';
    setDefenseStage(prevType);
    setIsRedefense(forceRedefense || isRedefenseMode || latestSchedule?.status === 'for_redefense' || false);

    // Auto-populate Adviser
    const advId = group.adviserId || '';
    const advName = group.adviserName || '';
    setAdviserId(advId);
    setAdviserName(advName);

    // Auto-populate Panelists from existing schedule or group
    const sourcePanelists =
      latestSchedule?.panelists?.length > 0
        ? latestSchedule.panelists
        : group.panelists || [];

    const subj = sourcePanelists.find((p) =>
      (p.role || '').toLowerCase().includes('subject')
    );
    const stat = sourcePanelists.find((p) =>
      (p.role || '').toLowerCase().includes('stat')
    );
    const tech = sourcePanelists.find((p) =>
      (p.role || '').toLowerCase().includes('tech')
    );

    setSubjectSpecialistId(subj?.id || subj?.uid || '');
    setSubjectSpecialistName(subj?.name || subj?.fullName || '');
    setStatId(stat?.id || stat?.uid || '');
    setStatName(stat?.name || stat?.fullName || '');
    setTechId(tech?.id || tech?.uid || '');
    setTechName(tech?.name || tech?.fullName || '');

    // Venue & Date default
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
    setStartTime('09:00');
    setEndTime('10:00');
    setVenue(latestSchedule?.venue || latestSchedule?.location || 'Conference Room A');
    setNotes('');
  };

  const handleGroupSelect = (groupId) => {
    setSelectedGroupId(groupId);
    setGroupDropdownOpen(false);
    setGroupSearchQuery('');
    populateFromGroup(groupId, isRedefenseMode);
  };

  const handleDurationPreset = (minutes) => {
    if (!startTime) return;
    const [h, m] = startTime.split(':').map(Number);
    const startMins = h * 60 + m;
    const endMins = startMins + minutes;
    const endH = Math.floor(endMins / 60) % 24;
    const endM = endMins % 60;
    setEndTime(
      `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentGroup) {
      setError('Please select a student research group.');
      return;
    }
    if (!date) {
      setError('Please select a defense date.');
      return;
    }
    if (!startTime || !endTime) {
      setError('Please select a valid start and end time.');
      return;
    }
    if (!venue.trim()) {
      setError('Please provide a venue or meeting link.');
      return;
    }

    // Validate Adviser is not assigned as panelist
    const panelistIdList = [subjectSpecialistId, statId, techId].filter(Boolean);
    if (adviserId && panelistIdList.includes(adviserId)) {
      setError(
        'Invalid Panelist Assignment: The assigned adviser cannot serve as a panelist for the same group.'
      );
      return;
    }

    // Validate duplicate panelists
    const uniquePanelists = new Set(panelistIdList);
    if (uniquePanelists.size < panelistIdList.length) {
      setError(
        'Invalid Panelist Assignment: A faculty member cannot be assigned to multiple panelist roles for the same group.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const panelistObjects = [];
      if (subjectSpecialistId) {
        panelistObjects.push({
          id: subjectSpecialistId,
          name: subjectSpecialistName,
          role: 'Subject Specialist',
        });
      }
      if (statId) {
        panelistObjects.push({
          id: statId,
          name: statName,
          role: 'Statistician',
        });
      }
      if (techId) {
        panelistObjects.push({
          id: techId,
          name: techName,
          role: 'Technical',
        });
      }

      const stageLabel = isRedefense
        ? (defenseStage === 'final_defense' ? 'Final Re-defense' : 'Proposal Re-defense')
        : (defenseStage === 'final_defense' ? 'Final Defense' : 'Proposal Defense');

      const payload = {
        projectId: currentGroup.id,
        projectTitle:
          currentProposal?.title ||
          currentGroup.title ||
          currentGroup.name ||
          'Untitled Research',
        defenseType: defenseStage,
        date,
        startTime,
        endTime,
        venue: venue.trim(),
        adviserId,
        adviserName,
        panelistIds: panelistIdList,
        panelists: panelistObjects,
        status: 'scheduled',
        defenseStage: stageLabel,
        notes: notes.trim(),
      };

      // 1. Create the new chronological schedule entry
      await scheduleService.createSchedule(payload);

      // 2. Mark previous schedules for this group as completed or archived if they were still scheduled
      if (groupSchedulesHistory.length > 0) {
        await Promise.all(
          groupSchedulesHistory.map((s) => {
            if (s.status === 'scheduled') {
              return scheduleService
                .updateSchedule(s.id, {
                  status: isRedefenseMode ? 'for_redefense' : 'completed',
                })
                .catch(() => null);
            }
            return Promise.resolve();
          })
        );
      }

      // 3. Update group records with assigned adviser and panelists
      await groupService
        .updateGroup(currentGroup.id, {
          adviserId,
          adviserName,
          panelists: panelistObjects,
        })
        .catch(() => null);

      onScheduleSaved(payload);
      onClose();
    } catch (err) {
      console.error('[ScheduleDefenseModal] save error:', err);
      setError(err.message || 'Failed to create schedule.');
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = useMemo(() => {
    const q = groupSearchQuery.toLowerCase().trim();
    if (!q) return groups;
    return groups.filter((g) => {
      const p = proposals.find((prop) => prop.groupId === g.id);
      const matchName = (g.name || '').toLowerCase().includes(q);
      const matchTitle = (p?.title || '').toLowerCase().includes(q);
      const matchMembers = (g.members || []).some((m) =>
        (m.fullName || '').toLowerCase().includes(q)
      );
      return matchName || matchTitle || matchMembers;
    });
  }, [groups, proposals, groupSearchQuery]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isRedefenseMode ? 'Schedule Re-defense Presentation' : 'Schedule Defense Presentation'}
      icon={isRedefenseMode ? CalendarPlus : HiCalendarDays}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSave} className="space-y-6 font-inter text-gray-800 dark:text-gray-200">
        {error && (
          <div className="p-3.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-200 dark:border-red-900/40 flex items-center gap-2">
            <HiExclamationCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Group Selection Header */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-500 dark:text-[#9396a8] uppercase tracking-wider">
            1. Select Student Group
          </label>

          {preselectedGroup ? (
            <div className="p-3.5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/40 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {currentGroup?.name?.slice(0, 2).toUpperCase() || 'GP'}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm">
                    {currentGroup?.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                    {currentProposal?.title || 'No approved title'}
                  </div>
                </div>
              </div>
              <Badge variant="blue" className="shrink-0">
                Pre-selected Group
              </Badge>
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
                className="w-full h-11 px-3.5 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl flex items-center justify-between text-left text-sm shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {currentGroup ? (
                  <div className="truncate">
                    <span className="font-semibold text-gray-900 dark:text-white mr-2">
                      {currentGroup.name}:
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 text-xs">
                      {currentProposal?.title || 'Approved Research Title'}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400">Choose a research group...</span>
                )}
                <HiChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
              </button>

              {groupDropdownOpen && (
                <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#222433] rounded-2xl shadow-2xl overflow-hidden max-h-72 flex flex-col">
                  <div className="p-2 border-b border-gray-100 dark:border-[#222433]">
                    <div className="relative">
                      <HiMagnifyingGlass className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search groups, students, or titles..."
                        value={groupSearchQuery}
                        onChange={(e) => setGroupSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-lg outline-none focus:border-blue-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="overflow-y-auto divide-y divide-gray-100 dark:divide-[#222433]">
                    {filteredGroups.length === 0 ? (
                      <div className="p-4 text-xs text-center text-gray-400">
                        No groups found matching your search.
                      </div>
                    ) : (
                      filteredGroups.map((g) => {
                        const p = proposals.find((prop) => prop.groupId === g.id);
                        const isSelected = g.id === selectedGroupId;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => handleGroupSelect(g.id)}
                            className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-[#1c1d28] transition-colors flex items-start justify-between gap-2 ${
                              isSelected ? 'bg-blue-50/40 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-xs text-gray-900 dark:text-white">
                                {g.name}
                              </div>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                {p?.title || 'No title yet'}
                              </div>
                              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                {(g.members || []).map((m) => m.fullName).join(', ')}
                              </div>
                            </div>
                            {isSelected && (
                              <Badge variant="blue" className="text-[10px] shrink-0">
                                Active
                              </Badge>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Group Details & Defense Attempt / History Card */}
        {currentGroup && (
          <div className="p-4 bg-gray-50/70 dark:bg-[#111218] border border-gray-200 dark:border-[#222433] rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 dark:text-[#9396a8] uppercase tracking-wider">
                  Defense Stage
                </span>
                <Badge
                  variant={isRedefense ? 'amber' : (defenseStage === 'final_defense' ? 'purple' : 'blue')}
                  className="font-bold text-xs"
                >
                  {isRedefense
                    ? (defenseStage === 'final_defense' ? 'Final Re-defense' : 'Proposal Re-defense')
                    : (defenseStage === 'final_defense' ? 'Final Defense' : 'Proposal Defense')}
                </Badge>
              </div>

              {/* Stage Selector: Proposal Defense vs Final Defense & Re-defense toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white dark:bg-[#181a24] p-1 rounded-lg border border-gray-200 dark:border-[#222433]">
                  <button
                    type="button"
                    onClick={() => setDefenseStage('proposal_defense')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                      defenseStage === 'proposal_defense'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Proposal Defense
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefenseStage('final_defense')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                      defenseStage === 'final_defense'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Final Defense
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRedefense(prev => !prev)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition border ${
                    isRedefense
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-white dark:bg-[#181a24] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#222433] hover:text-gray-900'
                  }`}
                  title="Toggle Re-defense"
                >
                  {isRedefense ? 'Re-defense (Active)' : 'Mark as Re-defense'}
                </button>
              </div>
            </div>

            {/* Title & Proponents Display */}
            <div className="pt-2 border-t border-gray-200/60 dark:border-[#222433] space-y-1.5">
              <div className="text-xs">
                <span className="font-semibold text-gray-500 dark:text-gray-400">Title: </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {currentProposal?.title || currentGroup.title || 'No Approved Proposal Title Found'}
                </span>
              </div>
              <div className="text-xs">
                <span className="font-semibold text-gray-500 dark:text-gray-400">Students: </span>
                <span className="text-gray-700 dark:text-gray-300">
                  {(currentGroup.members || []).map((m) => m.fullName).join(', ') || 'No members'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Date, Time & Venue */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-500 dark:text-[#9396a8] uppercase tracking-wider">
            2. Schedule Time & Venue
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                Defense Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full h-10 px-3 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full h-10 px-3 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                End Time *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full h-10 px-3 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Quick presets for duration */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 font-medium">Quick duration:</span>
            {[45, 60, 90].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleDurationPreset(mins)}
                className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#1a1b26] dark:hover:bg-[#222433] rounded text-[11px] font-medium text-gray-700 dark:text-gray-300 transition"
              >
                +{mins} mins
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              Venue / Room / Link *
            </label>
            <Input
              icon={HiMapPin}
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g., Conference Room A, CS Lab 1, or Google Meet URL"
              required
            />
          </div>
        </div>

        {/* 3. Panelists & Adviser Assignment */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-500 dark:text-[#9396a8] uppercase tracking-wider">
            3. Panelists & Adviser (Auto-populated)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Adviser */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                Research Adviser
              </label>
              <select
                value={adviserId}
                onChange={(e) => {
                  const uid = e.target.value;
                  setAdviserId(uid);
                  const found = availableUsers.find((u) => u.uid === uid);
                  setAdviserName(found?.fullName || '');
                }}
                className="w-full h-10 px-3 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Select Adviser...</option>
                {availableUsers.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.fullName} ({u.email || u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Specialist */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                Subject Specialist
              </label>
              <select
                value={subjectSpecialistId}
                onChange={(e) => {
                  const uid = e.target.value;
                  setSubjectSpecialistId(uid);
                  const found = availableUsers.find((u) => u.uid === uid);
                  setSubjectSpecialistName(found?.fullName || '');
                }}
                className="w-full h-10 px-3 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Select Subject Specialist...</option>
                {availableUsers
                  .filter((u) => u.uid !== adviserId)
                  .map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.fullName}
                    </option>
                  ))}
              </select>
            </div>

            {/* Statistician */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                Statistician
              </label>
              <select
                value={statId}
                onChange={(e) => {
                  const uid = e.target.value;
                  setStatId(uid);
                  const found = availableUsers.find((u) => u.uid === uid);
                  setStatName(found?.fullName || '');
                }}
                className="w-full h-10 px-3 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Select Statistician...</option>
                {availableUsers
                  .filter((u) => u.uid !== adviserId && u.uid !== subjectSpecialistId)
                  .map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.fullName}
                    </option>
                  ))}
              </select>
            </div>

            {/* Technical Specialist */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                Technical Specialist
              </label>
              <select
                value={techId}
                onChange={(e) => {
                  const uid = e.target.value;
                  setTechId(uid);
                  const found = availableUsers.find((u) => u.uid === uid);
                  setTechName(found?.fullName || '');
                }}
                className="w-full h-10 px-3 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Select Technical Specialist...</option>
                {availableUsers
                  .filter(
                    (u) =>
                      u.uid !== adviserId &&
                      u.uid !== subjectSpecialistId &&
                      u.uid !== statId
                  )
                  .map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.fullName}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* 4. Notes & Follow-up Instructions */}
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-[#9396a8] uppercase tracking-wider mb-1.5">
            4. Re-defense Notes / Specific Directives (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g., Focus on Chapter 3 methodology revisions, revised data gathering protocol as mandated in Attempt #1."
            className="w-full p-3 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-[#222433]">
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading || !currentGroup}
            className={defenseStage === 'redefense' ? 'bg-amber-600 hover:bg-amber-700' : ''}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Scheduling...
              </span>
            ) : defenseStage === 'redefense' ? (
              <span className="flex items-center gap-1.5">
                <HiArrowPath className="w-4 h-4" />
                Confirm Re-defense Schedule
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <HiCalendarDays className="w-4 h-4" />
                Confirm Schedule
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ScheduleDefenseModal;
