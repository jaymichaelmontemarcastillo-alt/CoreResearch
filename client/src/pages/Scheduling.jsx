import React, { useState, useEffect } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { CourseFilterDropdown } from "../components/ui/CourseFilterDropdown";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import { HiCalendarDays, HiMagnifyingGlass, HiFunnel, HiPlus, HiPencil, HiTrash } from "react-icons/hi2";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";
import { groupService } from "../services/group.service";
import { titleProposalService } from "../services/titleProposal.service";
import { scheduleService } from "../services/schedule.service";
import { GenerateScheduleModal } from "../components/scheduling/GenerateScheduleModal";
import EditScheduleModal from "../components/scheduling/EditScheduleModal";

const formatTime12Hour = (time) => {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const h = parseInt(parts[0], 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedHour = h % 12 || 12;
  return `${formattedHour}:${parts[1]} ${ampm}`;
};

export const Scheduling = () => {
  // --- Data State ---
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [allSectionsByCourse, setAllSectionsByCourse] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [groups, setGroups] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [schedules, setSchedules] = useState([]);
  
  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  
  // --- UI/Action State ---
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchSectionsForCourse(selectedCourse);
    } else {
      setSections([]);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedCourse && selectedSection) {
      fetchGroupsAndSchedules();
    } else {
      setGroups([]);
      setProposals([]);
      setSchedules([]);
    }
  }, [selectedSection, selectedCourse]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const coursesData = await courseService.getAllCourses();
      setCourses(coursesData);
      const sectionMap = {};
      await Promise.all(
        coursesData.map(async (course) => {
          try {
            const secs = await sectionService.getSectionsByCourseId(course.id);
            sectionMap[course.id] = secs;
          } catch (e) {
            sectionMap[course.id] = [];
          }
        })
      );
      setAllSectionsByCourse(sectionMap);
    } catch (error) {
      console.error("Failed to load initial data:", error);
      showToast("Failed to load initial data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSectionsForCourse = async (courseId) => {
    try {
      const sectionsData = await sectionService.getSectionsByCourseId(courseId);
      setSections(sectionsData);
    } catch (error) {
      console.error("Failed to load sections:", error);
    }
  };

  const fetchGroupsAndSchedules = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const sectionGroups = await groupService.getGroupsBySection(selectedSection);
      
      const groupIds = sectionGroups.map(g => g.id);
      let sectionProposals = [];
      if (groupIds.length > 0) {
        sectionProposals = await titleProposalService.getProposalsByGroupIds(groupIds);
      }
      
      // Fetch schedules
      const allSchedules = await scheduleService.getAllSchedules();
      
      setGroups(sectionGroups);
      setProposals(sectionProposals);
      setSchedules(allSchedules);
    } catch (error) {
      console.error("Failed to load data", error);
      showToast("Failed to load data.", "error");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const courseObj = courses.find((c) => c.id === selectedCourse);
  const specializations = courseObj?.specializations || [];
  const hasSpecializations = specializations.length > 0;

  const relevantSections = sections.filter((s) => {
    if (hasSpecializations && selectedSpecialization) {
      return s.specializationId === selectedSpecialization;
    }
    return true;
  });

  const specHasSections = hasSpecializations && relevantSections.length > 0;

  const showSectionFilter =
    (!hasSpecializations && selectedCourse) || 
    (hasSpecializations && selectedSpecialization && specHasSections);

  const filteredGroups = groups.filter((g) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    
    const matchName = (g.name || "").toLowerCase().includes(q);
    const matchMember = (g.members || []).some(m => (m?.fullName || "").toLowerCase().includes(q));
    const proposal = proposals.find(p => p.groupId === g.id);
    const matchTitle = (proposal?.title || "").toLowerCase().includes(q);
    
    return matchName || matchMember || matchTitle;
  });

  const showToast = (msg, variant = "success") => {
    setToastMessage(msg);
    setToastVariant(variant);
  };

  const handleCourseSelect = (courseId, specId, sectionId) => {
    setSelectedCourse(courseId || "");
    setSelectedSpecialization(specId || "");
    setSelectedSection(sectionId || "");
    if (courseId) {
      setSections(allSectionsByCourse[courseId] || []);
    } else {
      setSections([]);
    }
  };

  const getProposalForGroup = (groupId) => proposals.find(p => p.groupId === groupId);
  const getScheduleForGroup = (groupId) => {
    const groupSchedules = schedules.filter(s => s.projectId === groupId);
    if (groupSchedules.length === 0) return null;
    
    // If a group has multiple schedules (e.g. proposal and final defense),
    // prefer the one that actually has a time set to avoid showing 'Not set'
    // when a valid schedule exists.
    const validSchedule = groupSchedules.find(s => s.startTime && s.startTime.trim() !== '');
    return validSchedule || groupSchedules[groupSchedules.length - 1]; // fallback to the most recent one
  };

  const handleClearAllTimes = async () => {
    // Find all schedules currently shown that have a time set
    const schedulesToClear = filteredGroups.map(g => getScheduleForGroup(g.id))
      .filter(s => s && (s.startTime || s.date));

    if (schedulesToClear.length === 0) {
      showToast("No schedules to clear in the current view.", "info");
      return;
    }

    if (!window.confirm(`Are you sure you want to clear the scheduled time for ${schedulesToClear.length} group(s)?\n(This will keep the assigned panelists but remove the date and time)`)) {
      return;
    }

    // Optimistically update
    const scheduleIdsToClear = schedulesToClear.map(s => s.id);
    setSchedules(prev => prev.map(s => scheduleIdsToClear.includes(s.id) ? { ...s, date: '', startTime: '', endTime: '' } : s));

    try {
      await Promise.all(scheduleIdsToClear.map(id => scheduleService.updateSchedule(id, { date: '', startTime: '', endTime: '' })));
      showToast(`Cleared times for ${scheduleIdsToClear.length} group(s).`, "success");
      fetchGroupsAndSchedules(false);
    } catch (error) {
      console.error("Bulk clear error:", error);
      showToast("Failed to clear some times.", "error");
      fetchGroupsAndSchedules(false); // revert on error
    }
  };

  const tableColumns = [
    { label: "Time", className: "min-w-[120px]" },
    { label: "Name of Students", className: "min-w-[150px]" },
    { label: "Title", className: "min-w-[200px]" },
    { label: "Adviser", className: "min-w-[150px]" },
    { label: "Subject Specialist", className: "min-w-[150px]" },
    { label: "Stat", className: "min-w-[120px]" },
    { label: "Technical", className: "min-w-[150px]" },
    { label: "Actions", className: "min-w-[100px] text-center" },
  ];

  return (
    <div className="space-y-6 font-inter">
      <PageHeader
        icon={HiCalendarDays}
        title="Research Scheduling"
        description="Automated schedule generator for title defense presentations."
      />

      {toastMessage && (
        <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage("")} />
      )}

      <div className="flex flex-col md:flex-row items-end justify-between gap-4 pb-2">
        <div className="flex flex-col md:flex-row items-end gap-3 flex-1 w-full">
          <div className="w-full md:max-w-xs">
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
              Search Groups
            </label>
            <Input
              placeholder="Search by name, student, or title..."
              icon={HiMagnifyingGlass}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-slate-900 shadow-sm"
            />
          </div>

          <div className="hidden md:flex h-10 items-center px-1">
            <HiFunnel className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </div>

          <div className="w-full md:w-48">
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
              Program
            </label>
            <CourseFilterDropdown
              courses={courses}
              sectionsByCourse={allSectionsByCourse}
              selectedCourse={selectedCourse}
              selectedSpecialization={selectedSpecialization}
              selectedSection={selectedSection}
              onSelect={handleCourseSelect}
              placeholder="All Programs"
            />
          </div>

          {hasSpecializations && (
            <div className="w-full md:w-56 animate-in fade-in slide-in-from-left-2 duration-200">
              <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Specialization
              </label>
              <select
                className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-[13px] font-medium text-gray-600 dark:text-gray-300 px-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                value={selectedSpecialization}
                onChange={(e) => {
                  setSelectedSpecialization(e.target.value);
                  setSelectedSection("");
                }}
              >
                <option value="">Select Specialization...</option>
                {specializations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code || s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showSectionFilter && (
            <div className="w-full md:w-40 animate-in fade-in slide-in-from-left-2 duration-200">
              <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Section
              </label>
              <select
                className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-[13px] font-medium text-gray-600 dark:text-gray-300 px-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow disabled:opacity-50"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                <option value="">Select Section...</option>
                {relevantSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="w-full md:w-auto shrink-0 mt-4 md:mt-0 flex gap-2">
          {filteredGroups.some(g => {
            const s = getScheduleForGroup(g.id);
            return s && (s.startTime || s.date);
          }) && (
            <Button
              variant="outline"
              size="md"
              className="w-full md:w-auto h-10 shadow-sm text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 dark:border-red-900/30 dark:hover:bg-red-900/20 dark:text-red-400"
              onClick={handleClearAllTimes}
            >
              <HiTrash className="w-4 h-4 mr-2" />
              Clear All Times
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            className="w-full md:w-auto h-10 shadow-sm"
            onClick={() => setIsScheduleModalOpen(true)}
            disabled={!selectedCourse || !selectedSection || filteredGroups.length === 0}
          >
            <HiPlus className="w-4 h-4 mr-2" />
            Create Schedule
          </Button>
        </div>
      </div>

      {selectedCourse && selectedSection && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white leading-tight">
                {courseObj?.name || "PROGRAM NOT SELECTED"}
              </h2>
              {specializations.find(s => s.id === selectedSpecialization)?.name && (
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                  Specialized in <span className="text-gray-700 dark:text-gray-300">{specializations.find(s => s.id === selectedSpecialization)?.name}</span>
                </p>
              )}
            </div>
            <div className="text-left md:text-right">
              <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Section {sections.find(s => s.id === selectedSection)?.name || ""}
              </h3>
            </div>
          </div>
          
          <DataTable columns={tableColumns} className="shadow-sm">
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="text-sm">Loading groups...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center text-gray-400">
                  <span className="text-sm">No groups found for this section.</span>
                </TableCell>
              </TableRow>
            ) : (
              filteredGroups.map((group) => {
                const proposal = getProposalForGroup(group.id);
                const schedule = getScheduleForGroup(group.id);
                const activePanelists = (schedule?.panelists?.length > 0) ? schedule.panelists : (group.panelists || []);
                const activeAdviserName = schedule?.adviserName || group.adviserName;
                
                return (
                  <TableRow key={group.id}>
                    {/* Time */}
                    <TableCell>
                      {schedule && (schedule.startTime || schedule.date) ? (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col space-y-0.5">
                            <span className="font-bold text-sm text-gray-900 dark:text-white whitespace-nowrap">
                              {formatTime12Hour(schedule.startTime)} {schedule.endTime ? `- ${formatTime12Hour(schedule.endTime)}` : ''}
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">
                              {schedule.date ? new Date(schedule.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                            </span>
                          </div>
                          <button
                            onClick={async () => {
                              if (window.confirm("Are you sure you want to clear the scheduled time?")) {
                                // Optimistically clear locally first
                                setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, date: '', startTime: '', endTime: '' } : s));
                                try {
                                  await scheduleService.updateSchedule(schedule.id, { date: '', startTime: '', endTime: '' });
                                  showToast("Time cleared.", "success");
                                  fetchGroupsAndSchedules(false);
                                } catch (e) {
                                  showToast("Failed to clear time.", "error");
                                  // Revert optimistic update by refetching
                                  fetchGroupsAndSchedules(false);
                                }
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors tooltip-trigger"
                            title="Clear Time"
                          >
                            <HiTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-sm">Not set</span>
                      )}
                    </TableCell>

                    {/* Students */}
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        {(group.members || []).map(member => (
                          <div key={member.uid || member.id} className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                              {member.fullName || "Student"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TableCell>

                    {/* Title */}
                    <TableCell>
                      {proposal ? (
                        <div className="font-semibold text-gray-900 dark:text-white line-clamp-3">
                          {proposal.title}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No approved title yet</span>
                      )}
                    </TableCell>

                    {/* Adviser */}
                    <TableCell>
                      <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        {activeAdviserName || <span className="text-gray-400 italic">Not Assigned</span>}
                      </span>
                    </TableCell>

                    {/* Subject Specialist */}
                    <TableCell>
                      <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        {activePanelists.find(p => (p.role || '').toLowerCase().includes('subject'))?.name || 
                         activePanelists.find(p => (p.role || '').toLowerCase().includes('subject'))?.fullName || 
                         <span className="text-gray-400 italic">Not Assigned</span>}
                      </span>
                    </TableCell>

                    {/* Stat */}
                    <TableCell>
                      <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        {activePanelists.find(p => (p.role || '').toLowerCase().includes('stat'))?.name || 
                         activePanelists.find(p => (p.role || '').toLowerCase().includes('stat'))?.fullName || 
                         <span className="text-gray-400 italic">Not Assigned</span>}
                      </span>
                    </TableCell>

                    {/* Technical */}
                    <TableCell>
                      <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        {activePanelists.find(p => (p.role || '').toLowerCase().includes('tech'))?.name || 
                         activePanelists.find(p => (p.role || '').toLowerCase().includes('tech'))?.fullName || 
                         <span className="text-gray-400 italic">Not Assigned</span>}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-3"
                          onClick={() => {
                            setEditingGroup(group);
                            setEditingSchedule(schedule || null);
                          }}
                        >
                          <HiPencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </DataTable>
        </div>
      )}

      {isScheduleModalOpen && (
        <GenerateScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          groups={filteredGroups.map(g => {
            const schedule = getScheduleForGroup(g.id);
            const panelists = (schedule?.panelists?.length > 0) ? schedule.panelists : (g.panelists || []);
            return {
              ...g,
              title: getProposalForGroup(g.id)?.title || 'No approved title yet',
              adviserId: schedule?.adviserId || g.adviserId,
              adviserName: schedule?.adviserName || g.adviserName,
              panelists: panelists,
              panelistIds: panelists.map(p => p.id || p.uid).filter(Boolean)
            };
          })}
          onSchedulesCreated={() => {
            setIsScheduleModalOpen(false);
            showToast("Schedules created successfully!");
            fetchGroupsAndSchedules(); // Refresh
          }}
        />
      )}

      {editingGroup && (
        <EditScheduleModal
          isOpen={!!editingGroup}
          onClose={() => {
            setEditingGroup(null);
            setEditingSchedule(null);
          }}
          schedule={editingSchedule}
          group={{
            ...editingGroup,
            title: getProposalForGroup(editingGroup.id)?.title || 'No approved title yet'
          }}
          onSaved={() => {
            setEditingGroup(null);
            setEditingSchedule(null);
            showToast("Schedule updated successfully!");
            fetchGroupsAndSchedules(false);
          }}
        />
      )}
    </div>
  );
};

export default Scheduling;
