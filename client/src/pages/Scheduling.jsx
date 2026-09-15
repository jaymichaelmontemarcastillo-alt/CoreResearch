import React, { useState, useEffect } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { CourseFilterDropdown } from "../components/ui/CourseFilterDropdown";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import { HiCalendarDays, HiMagnifyingGlass, HiFunnel, HiPlus, HiPencilSquare, HiTrash } from "react-icons/hi2";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";
import { groupService } from "../services/group.service";
import { titleProposalService } from "../services/titleProposal.service";
import { scheduleService } from "../services/schedule.service";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
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
  const { userProfile } = useAuth();
  const { confirm } = useConfirm();

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

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [coursesData, groupsData, proposalsData, schedulesData] = await Promise.all([
        courseService.getAllCourses(),
        groupService.getAllGroups(),
        titleProposalService.getAllProposals(),
        scheduleService.getAllSchedules()
      ]);
      
      setCourses(coursesData);
      setGroups(groupsData);
      setProposals(proposalsData);
      setSchedules(schedulesData);
      
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

  const refreshData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [groupsData, proposalsData, schedulesData] = await Promise.all([
        groupService.getAllGroups(),
        titleProposalService.getAllProposals(),
        scheduleService.getAllSchedules()
      ]);
      setGroups(groupsData);
      setProposals(proposalsData);
      setSchedules(schedulesData);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      if (showLoading) setLoading(false);
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

    const isConfirmed = await confirm({
      title: "Clear Selected Schedules",
      message: `Are you sure you want to clear the scheduled time for ${schedulesToClear.length} group(s)?\n(This will keep the assigned panelists but remove the date and time)`,
      confirmText: "Clear Schedules",
      variant: "danger"
    });

    if (!isConfirmed) {
      return;
    }

    // Optimistically update
    const scheduleIdsToClear = schedulesToClear.map(s => s.id);
    setSchedules(prev => prev.map(s => scheduleIdsToClear.includes(s.id) ? { ...s, date: '', startTime: '', endTime: '' } : s));

    try {
      await Promise.all(scheduleIdsToClear.map(id => scheduleService.updateSchedule(id, { date: '', startTime: '', endTime: '' })));
      showToast(`Cleared times for ${scheduleIdsToClear.length} group(s).`, "success");
      refreshData(false);
    } catch (error) {
      console.error("Bulk clear error:", error);
      showToast("Failed to clear some times.", "error");
      refreshData(false); // revert on error
    }
  };

  const tableColumns = [
    { label: "Time", className: "w-[110px]" },
    { label: "Name of Students", className: "min-w-[150px]" },
    { label: "Title", className: "min-w-[200px]" },
    { label: "Adviser", className: "min-w-[150px]" },
    { label: "Subject Specialist", className: "min-w-[150px]" },
    { label: "Stat", className: "min-w-[120px]" },
    { label: "Technical", className: "min-w-[150px]" },
    { label: "Actions", className: "w-[80px] text-center" },
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
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">
              Search Groups
            </label>
            <Input
              placeholder="Search by name, student, or title..."
              icon={HiMagnifyingGlass}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="shadow-sm"
            />
          </div>

          <div className="hidden md:flex h-10 items-center px-1">
            <HiFunnel className="w-4 h-4 text-gray-300 dark:text-[#6b6f84]" />
          </div>

          <div className="w-full md:w-48">
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">
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
              <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">
                Specialization
              </label>
              <select
                className="w-full h-10 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-2xl text-[13px] font-medium text-gray-700 dark:text-[#f3f4f8] px-3 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all cursor-pointer"
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
              <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">
                Section
              </label>
              <select
                className="w-full h-10 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-2xl text-[13px] font-medium text-gray-700 dark:text-[#f3f4f8] px-3 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all cursor-pointer disabled:opacity-50"
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
          {/* The Clear All Times button logic needs a specific section scope to be safe, so we only show it if a specific section is selected. */}
          {selectedCourse && selectedSection && groups.filter(g => g.sectionId === selectedSection).some(g => {
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
            disabled={!selectedCourse || !selectedSection}
          >
            <HiPlus className="w-4 h-4 mr-2" />
            Create Schedule
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-sm">Loading data...</span>
        </div>
      ) : (
        <div className="mt-6 space-y-10">
          {courses
            .filter((c) => (selectedCourse ? c.id === selectedCourse : true))
            .map((course) => {
              const courseSections = allSectionsByCourse[course.id] || [];
              const displaySections = courseSections.filter((s) => {
                if (selectedSpecialization) return s.specializationId === selectedSpecialization;
                if (selectedSection) return s.id === selectedSection;
                return true;
              });

              if (displaySections.length === 0) return null;

              return (
                <div key={course.id} className="space-y-8">
                  {displaySections.map((section) => {
                    const sectionGroups = groups.filter((g) => g.sectionId === section.id);
                    const filteredSectionGroups = sectionGroups.filter((g) => {
                      const q = searchQuery.toLowerCase();
                      if (!q) return true;
                      const matchName = (g.name || "").toLowerCase().includes(q);
                      const matchMember = (g.members || []).some((m) =>
                        (m?.fullName || "").toLowerCase().includes(q)
                      );
                      const proposal = getProposalForGroup(g.id);
                      const matchTitle = (proposal?.title || "").toLowerCase().includes(q);
                      return matchName || matchMember || matchTitle;
                    });

                    return (
                      <div key={section.id} className="bg-white dark:bg-[#15161e] rounded-xl border border-gray-200 dark:border-[#222433] shadow-card overflow-hidden">
                        <div className="p-5 border-b border-gray-200 dark:border-[#222433] flex items-center justify-between gap-4">
                          <h2 className="text-xl font-medium text-gray-900 dark:text-white leading-tight">
                            {course.name}
                          </h2>
                          <h3 className="text-xs font-bold text-gray-500 dark:text-[#9396a8] uppercase tracking-widest text-right shrink-0">
                            Section <span className="text-gray-900 dark:text-white">{section.name}</span>
                          </h3>
                        </div>

                        <DataTable columns={tableColumns} className="!border-0 !shadow-none !rounded-none">
                          {filteredSectionGroups.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="py-16 text-center text-gray-400">
                                <span className="text-sm">No groups found for this section.</span>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredSectionGroups.map((group) => {
                              const proposal = getProposalForGroup(group.id);
                              const schedule = getScheduleForGroup(group.id);
                              const activePanelists = (schedule?.panelists?.length > 0) ? schedule.panelists : (group.panelists || []);
                              const activeAdviserName = schedule?.adviserName || group.adviserName;
                              
                              return (
                                <TableRow key={group.id}>
                                  {/* Time */}
                                  <TableCell>
                                    {schedule && (schedule.startTime || schedule.date) ? (
                                      <div className="flex flex-col space-y-0.5">
                                        <span className="font-bold text-[12px] text-gray-900 dark:text-white whitespace-nowrap">
                                          {formatTime12Hour(schedule.startTime)} {schedule.endTime ? `- ${formatTime12Hour(schedule.endTime)}` : ''}
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-medium">
                                          {schedule.date ? new Date(schedule.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                        </span>
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
                                  <TableCell className="align-middle">
                                    <div className="flex items-center justify-center gap-3 h-full">
                                      <button 
                                        className="text-primary hover:text-blue-600 transition-colors" 
                                        title="Edit Schedule" 
                                        onClick={() => {
                                          setEditingGroup(group);
                                          setEditingSchedule(schedule || null);
                                        }}
                                      >
                                        <HiPencilSquare className="w-4 h-4" />
                                      </button>
                                      
                                      {schedule && (schedule.startTime || schedule.date) && (
                                        <button
                                          onClick={async () => {
                                            const isConfirmed = await confirm({
                                              title: "Clear Schedule",
                                              message: "Are you sure you want to clear the scheduled time?",
                                              confirmText: "Clear Schedule",
                                              variant: "danger"
                                            });
                                            if (isConfirmed) {
                                              // Optimistically clear locally first
                                              setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, date: '', startTime: '', endTime: '' } : s));
                                              try {
                                                await scheduleService.updateSchedule(schedule.id, { date: '', startTime: '', endTime: '' });
                                                showToast("Time cleared.", "success");
                                                refreshData(false);
                                              } catch (e) {
                                                showToast("Failed to clear time.", "error");
                                                // Revert optimistic update by refetching
                                                refreshData(false);
                                              }
                                            }
                                          }}
                                          className="text-red-500 hover:text-red-600 transition-colors"
                                          title="Clear Time"
                                        >
                                          <HiTrash className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </DataTable>
                      </div>
                    );
                  })}
                </div>
              );
            })}
        </div>
      )}

      {isScheduleModalOpen && (
        <GenerateScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          groups={groups
            .filter((g) => g.sectionId === selectedSection)
            .map(g => {
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
            refreshData(); // Refresh
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
            refreshData(false);
          }}
        />
      )}
    </div>
  );
};

export default Scheduling;
