import React, { useState, useEffect } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { CourseFilterDropdown } from "../components/ui/CourseFilterDropdown";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import {
  HiCalendarDays,
  HiMagnifyingGlass,
  HiFunnel,
  HiPlus,
  HiTrash,
  HiArrowPath,
  HiSparkles,
} from "react-icons/hi2";
import { CalendarPlus } from "lucide-react";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";
import { groupService } from "../services/group.service";
import { titleProposalService } from "../services/titleProposal.service";
import { scheduleService } from "../services/schedule.service";
import { gradingService } from "../services/grading.service";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import { GenerateScheduleModal } from "../components/scheduling/GenerateScheduleModal";
import { ScheduleDefenseModal } from "../components/scheduling/ScheduleDefenseModal";

const formatTime12Hour = (time) => {
  if (!time) return '';
  let cleanTime = time;
  if (cleanTime.includes('T')) {
    cleanTime = cleanTime.split('T')[1].split('.')[0];
  }
  const parts = cleanTime.split(':');
  if (parts.length < 2) return cleanTime;
  const h = parseInt(parts[0], 10);
  if (isNaN(h)) return cleanTime;
  const m = (parts[1] || '00').slice(0, 2);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedHour = h % 12 || 12;
  return `${formattedHour}:${m} ${ampm}`;
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? dateStr : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
  const [isScheduleDefenseModalOpen, setIsScheduleDefenseModalOpen] = useState(false);
  const [selectedGroupForScheduling, setSelectedGroupForScheduling] = useState(null);
  const [selectedScheduleForEditing, setSelectedScheduleForEditing] = useState(null);
  const [isRedefenseMode, setIsRedefenseMode] = useState(false);
  const [evaluations, setEvaluations] = useState({ proposalEvaluations: [], finalEvaluations: [] });

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
      const [coursesData, groupsData, proposalsData, schedulesData, evalsData] = await Promise.all([
        courseService.getAllCourses(),
        groupService.getAllGroups(),
        titleProposalService.getAllProposals(),
        scheduleService.getAllSchedules(),
        gradingService.getAllEvaluations().catch(() => ({ proposalEvaluations: [], finalEvaluations: [] })),
      ]);
      
      setCourses(coursesData);
      setGroups(groupsData);
      setProposals(proposalsData);
      setSchedules(schedulesData);
      setEvaluations(evalsData || { proposalEvaluations: [], finalEvaluations: [] });
      
      const sectionMap = {};
      await Promise.all(
        coursesData.map(async (course) => {
          try {
            const secs = await sectionService.getSectionsByCourseId(course.id);
            sectionMap[course.id] = secs;
            if (course.id) {
              sectionMap[course.id.toLowerCase()] = secs;
              sectionMap[course.id.toUpperCase()] = secs;
            }
          } catch (e) {
            sectionMap[course.id] = [];
          }
        })
      );
      setAllSectionsByCourse(sectionMap);
      // Default to "All Programs" (selectedCourse = "", selectedSpecialization = "", selectedSection = "")
      // This displays all courses, sections, and groups on initial mount without manual filtering.
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
      const [groupsData, proposalsData, schedulesData, evalsData] = await Promise.all([
        groupService.getAllGroups(),
        titleProposalService.getAllProposals(),
        scheduleService.getAllSchedules(),
        gradingService.getAllEvaluations().catch(() => ({ proposalEvaluations: [], finalEvaluations: [] })),
      ]);
      setGroups(groupsData);
      setProposals(proposalsData);
      setSchedules(schedulesData);
      setEvaluations(evalsData || { proposalEvaluations: [], finalEvaluations: [] });
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
      if (courseId) {
        setAllSectionsByCourse((prev) => ({
          ...prev,
          [courseId]: sectionsData,
          [courseId.toLowerCase()]: sectionsData,
          [courseId.toUpperCase()]: sectionsData,
        }));
      }
    } catch (error) {
      console.error("Failed to load sections:", error);
    }
  };

  const courseObj = courses.find(
    (c) =>
      c.id?.toLowerCase() === selectedCourse?.toLowerCase() ||
      c.code?.toLowerCase() === selectedCourse?.toLowerCase()
  );
  const specializations = courseObj?.specializations || [];
  const hasSpecializations = specializations.length > 0;

  const relevantSections = sections.filter((s) => {
    if (hasSpecializations && selectedSpecialization) {
      return (
        s.specializationId?.toLowerCase() === selectedSpecialization.toLowerCase() ||
        (!s.specializationId && s.courseId?.toLowerCase() === selectedCourse?.toLowerCase())
      );
    }
    return true;
  });

  const specHasSections = hasSpecializations && relevantSections.length > 0;

  const showSectionFilter =
    (!hasSpecializations && selectedCourse) || 
    (hasSpecializations && (selectedSpecialization ? specHasSections : sections.length > 0));

  const showToast = (msg, variant = "success") => {
    setToastMessage(msg);
    setToastVariant(variant);
  };

  const handleCourseSelect = async (courseId, specId, sectionId) => {
    setSelectedCourse(courseId || "");
    setSelectedSpecialization(specId || "");
    setSelectedSection(sectionId || "");
    if (courseId) {
      let found =
        allSectionsByCourse[courseId] ||
        allSectionsByCourse[courseId?.toLowerCase()] ||
        allSectionsByCourse[courseId?.toUpperCase()];

      if (!found || found.length === 0) {
        try {
          found = await sectionService.getSectionsByCourseId(courseId);
          setAllSectionsByCourse((prev) => ({
            ...prev,
            [courseId]: found,
            [courseId.toLowerCase()]: found,
            [courseId.toUpperCase()]: found,
          }));
        } catch (e) {
          found = [];
        }
      }
      setSections(found || []);
    } else {
      setSections([]);
    }
  };

  const getProposalForGroup = (groupId) => proposals.find(p => p.groupId === groupId);

  const getAllSchedulesForGroup = (groupId) => {
    return schedules.filter(
      (s) => s.projectId === groupId || s.groupId === groupId
    );
  };

  const getScheduleForGroup = (groupId) => {
    const groupSchedules = getAllSchedulesForGroup(groupId);
    if (groupSchedules.length === 0) return null;

    // Prefer schedule that is currently active or scheduled with a valid time
    const activeScheduled = groupSchedules.find(
      (s) => (s.status === 'scheduled' || s.status === 'for_redefense') && s.startTime && s.startTime.trim() !== ''
    );
    if (activeScheduled) return activeScheduled;

    // Next prefer any scheduled entry
    const anyScheduled = groupSchedules.find((s) => s.status === 'scheduled');
    if (anyScheduled) return anyScheduled;

    // Fallback to the latest chronological schedule
    return groupSchedules[groupSchedules.length - 1];
  };

  const getGroupDefenseState = (groupId) => {
    const groupSchedules = getAllSchedulesForGroup(groupId);
    const activeSchedule = getScheduleForGroup(groupId);

    const propEvals = (evaluations.proposalEvaluations || []).filter(
      (e) => e.groupId === groupId || e.workspaceId === groupId || e.projectId === groupId
    );
    const finalEvals = (evaluations.finalEvaluations || []).filter(
      (e) => e.groupId === groupId || e.workspaceId === groupId || e.projectId === groupId
    );

    const latestFinal = finalEvals[0];
    const latestProp = propEvals[0];

    const hasRedefenseFinal = finalEvals.some(
      (e) => e.verdict === 'REDEFENSE' || e.verdict === 'DISAPPROVED'
    );
    const hasRedefenseProp = propEvals.some(
      (e) => e.verdict === 'REDEFENSE' || e.verdict === 'DISAPPROVED'
    );

    const hasScheduleRedefense =
      activeSchedule?.status === 'for_redefense' ||
      activeSchedule?.resultStatus === 're_defense' ||
      activeSchedule?.isRedefense ||
      activeSchedule?.defenseStage?.toLowerCase().includes('re-defense') ||
      groupSchedules.some((s) => s.status === 'for_redefense' || s.resultStatus === 're_defense');

    const isRedefense = hasRedefenseFinal || hasRedefenseProp || hasScheduleRedefense;

    const isFinalPassed =
      latestFinal &&
      (latestFinal.verdict === 'PASSED' ||
        latestFinal.verdict === 'PASSED_WITH_MINOR_REVISIONS' ||
        latestFinal.verdict === 'PASSED_WITH_MAJOR_REVISIONS');

    const isPropPassed =
      latestProp &&
      (latestProp.verdict === 'APPROVED' || latestProp.verdict === 'APPROVED_WITH_REVISIONS');

    const isSchedulePassed =
      activeSchedule?.status === 'completed' &&
      (activeSchedule?.resultStatus === 'passed' || activeSchedule?.resultStatus === 'approved');

    const isDefended =
      (isFinalPassed || (isPropPassed && !isRedefense) || isSchedulePassed) && !isRedefense;

    let stageLabel = 'Proposal Defense';
    if (activeSchedule?.defenseStage) {
      stageLabel = activeSchedule.defenseStage;
    } else if (activeSchedule?.defenseType === 'final_defense' || latestFinal) {
      stageLabel = isRedefense ? 'Final Re-defense' : 'Final Defense';
    } else if (isRedefense) {
      stageLabel = 'Proposal Re-defense';
    }

    const needsRedefenseScheduling =
      isRedefense &&
      (!activeSchedule ||
        activeSchedule.status === 'for_redefense' ||
        !activeSchedule.startTime ||
        !activeSchedule.date);

    return {
      isRedefense,
      isDefended,
      isFinalPassed,
      isPropPassed,
      stageLabel,
      needsRedefenseScheduling,
      activeSchedule,
    };
  };

  const handleClearAllTimes = async () => {
    if (!selectedSection) {
       showToast("Please select a specific section to clear times.", "info");
       return;
    }
    const curSecObj = relevantSections.find(sec => sec.id === selectedSection);
    const cleanCurSec = (curSecObj?.name || '').replace(/^section\s+/i, '').trim().toLowerCase();
    const sectionGroups = groups.filter((g) => {
      if (g.sectionId === selectedSection) return true;
      const cleanGSec = (g.sectionName || '').replace(/^section\s+/i, '').trim().toLowerCase();
      if (cleanGSec && cleanCurSec && cleanGSec === cleanCurSec) return true;
      return false;
    });
    const currentViewGroups = sectionGroups.filter((g) => {
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

    // Find all schedules currently shown that have a time set
    const schedulesToClear = currentViewGroups.map(g => getScheduleForGroup(g.id))
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
    { label: "Time", className: "w-[120px]" },
    { label: "Name of Students", className: "min-w-[150px]" },
    { label: "Title & Defense Stage", className: "min-w-[230px]" },
    { label: "Adviser", className: "min-w-[140px]" },
    { label: "Subject Specialist", className: "min-w-[140px]" },
    { label: "Stat", className: "min-w-[110px]" },
    { label: "Technical", className: "min-w-[140px]" },
    { label: "Actions", className: "w-[140px] text-center" },
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

      {/* System Recommendation for Research Coordinator & Admin on Re-defense Groups */}
      {(() => {
        const groupsNeedingRedefense = groups.filter((g) => getGroupDefenseState(g.id).needsRedefenseScheduling);
        if (groupsNeedingRedefense.length === 0) return null;
        return (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                <HiSparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Recommendation: Set Presentation Schedule for Re-defense Groups
                </h4>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                  {groupsNeedingRedefense.length} research group{groupsNeedingRedefense.length !== 1 ? 's have' : ' has'} received a Re-defense rubric verdict. Please schedule their defense presentations using the action buttons below.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 bg-white dark:bg-[#111218] border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 font-bold"
              onClick={() => {
                setSelectedGroupForScheduling(groupsNeedingRedefense[0]);
                setIsRedefenseMode(true);
                setIsScheduleDefenseModalOpen(true);
              }}
            >
              <CalendarPlus className="w-4 h-4 mr-1.5 text-amber-600" />
              Schedule Re-defense
            </Button>
          </div>
        );
      })()}

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
                {relevantSections.map((s) => {
                  const cleanName = s.name.replace(/^section\s+/i, '');
                  return (
                    <option key={s.id} value={s.id}>
                      Section {cleanName}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        <div className="w-full md:w-auto shrink-0 mt-4 md:mt-0 flex flex-wrap items-center gap-2">
          {/* The Clear All Times button logic needs a specific section scope to be safe */}
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

          {/* Create Defense presentation manually for a group */}
          <Button
            variant="outline"
            size="md"
            className="w-full md:w-auto h-10 shadow-sm border-gray-200 dark:border-[#2b2d3b] hover:bg-gray-50 dark:hover:bg-[#1a1b26]"
            onClick={() => {
              setSelectedGroupForScheduling(null);
              setSelectedScheduleForEditing(null);
              setIsRedefenseMode(false);
              setIsScheduleDefenseModalOpen(true);
            }}
            title="Create or customize a defense schedule for a group"
          >
            <CalendarPlus className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
            Schedule Defense
          </Button>

          {/* Create Schedule automatically creates schedule for the whole section */}
          <Button
            variant="primary"
            size="md"
            className="w-full md:w-auto h-10 shadow-sm"
            onClick={() => {
              if (!selectedCourse || !selectedSection) {
                showToast("Please select a Program and Section first to create section schedules.", "error");
                return;
              }
              setIsScheduleModalOpen(true);
            }}
            disabled={!selectedCourse || !selectedSection}
            title={!selectedSection ? "Select a program and section to create schedules" : "Automatically create schedule for this section"}
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
            .filter((c) =>
              selectedCourse
                ? c.id?.toLowerCase() === selectedCourse.toLowerCase() ||
                  c.code?.toLowerCase() === selectedCourse.toLowerCase()
                : true
            )
            .map((course) => {
              const courseSections =
                allSectionsByCourse[course.id] ||
                allSectionsByCourse[course.id?.toLowerCase()] ||
                [];
              const displaySections = courseSections.filter((s) => {
                if (selectedSpecialization) {
                  const matchSpec =
                    s.specializationId?.toLowerCase() === selectedSpecialization.toLowerCase() ||
                    (!s.specializationId && s.courseId?.toLowerCase() === course.id?.toLowerCase());
                  if (!matchSpec) return false;
                }
                if (selectedSection && s.id !== selectedSection) return false;
                return true;
              });

              if (displaySections.length === 0) return null;

              return (
                <div key={course.id} className="space-y-8">
                  {displaySections.map((section) => {
                    const sectionGroups = groups.filter((g) => {
                      if (g.sectionId === section.id) return true;
                      if (g.specializationId && section.specializationId && g.specializationId.toLowerCase() !== section.specializationId.toLowerCase()) {
                        return false;
                      }
                      const sameCourse = g.courseId?.toLowerCase() === course.id?.toLowerCase() || g.courseId?.toLowerCase() === section.courseId?.toLowerCase();
                      const cleanGSec = (g.sectionName || g.section || '').replace(/^section\s+/i, '').trim().toLowerCase();
                      const cleanSec = (section.name || '').replace(/^section\s+/i, '').trim().toLowerCase();
                      if (sameCourse && cleanGSec && cleanSec && (cleanGSec === cleanSec || cleanGSec.replace(/^3/i, '') === cleanSec.replace(/^3/i, ''))) return true;
                      if (g.sectionId === `${section.courseId}-sec-${cleanSec}`) return true;
                      return false;
                    });

                    const filteredSectionGroups = sectionGroups.filter((g) => {
                      const q = searchQuery.toLowerCase();
                      if (!q) return true;
                      const matchName = (g.name || "").toLowerCase().includes(q);
                      const matchMember = (g.members || []).some((m) =>
                        (m?.fullName || "").toLowerCase().includes(q)
                      );
                      const proposal = getProposalForGroup(g.id);
                      const groupTitle = proposal?.title || g.title || "";
                      const matchTitle = groupTitle.toLowerCase().includes(q);
                      return matchName || matchMember || matchTitle;
                    });

                    const specialization = course.specializations?.find(
                      (s) =>
                        s.id?.toLowerCase() === section.specializationId?.toLowerCase() ||
                        s.code?.toLowerCase() === section.specializationId?.toLowerCase()
                    );
                    const specName = specialization?.name || section.specializationName || '';
                    const specCode = specialization?.code || '';
                    const cleanSecName = (section.name || '').replace(/^section\s+/i, '');

                    return (
                      <div key={section.id} className="bg-white dark:bg-[#15161e] rounded-xl border border-gray-200 dark:border-[#222433] shadow-card overflow-hidden">
                        <div className="p-5 border-b border-gray-200 dark:border-[#222433] flex flex-wrap items-center justify-between gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h2 className="text-xl font-medium text-gray-900 dark:text-white leading-tight">
                              {course.name}
                              {specName && (
                                <span className="text-gray-500 dark:text-gray-400 font-normal">
                                  {" — "}{specName}
                                </span>
                              )}
                            </h2>
                            {(specCode || specName) && (
                              <Badge variant="purple" className="shrink-0 w-fit">
                                {specCode || specName}
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-xs font-bold text-gray-500 dark:text-[#9396a8] uppercase tracking-widest text-right shrink-0">
                            Section <span className="text-gray-900 dark:text-white">{cleanSecName}</span>
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
                            
                            [...filteredSectionGroups].sort((a, b) => {
                              const schedA = getScheduleForGroup(a.id);
                              const schedB = getScheduleForGroup(b.id);
                              
                              const dateA = schedA?.date || '9999-12-31';
                              const dateB = schedB?.date || '9999-12-31';
                              
                              if (dateA !== dateB) {
                                return new Date(dateA) - new Date(dateB);
                              }
                              
                              let timeA = schedA?.startTime || '23:59';
                              let timeB = schedB?.startTime || '23:59';

                              // Ensure times are properly padded for string comparison (e.g., '8:00' -> '08:00')
                              if (timeA.length === 4) timeA = '0' + timeA;
                              if (timeB.length === 4) timeB = '0' + timeB;
                              
                              return timeA.localeCompare(timeB);
                            }).map((group) => {
                              const proposal = getProposalForGroup(group.id);
                              const schedule = getScheduleForGroup(group.id);
                              const groupAllSchedules = getAllSchedulesForGroup(group.id);
                              const activePanelists = (schedule?.panelists?.length > 0) ? schedule.panelists : (group.panelists || []);
                              const activeAdviserName = schedule?.adviserName || group.adviserName;
                              const { isRedefense, isDefended, stageLabel, needsRedefenseScheduling } = getGroupDefenseState(group.id);
                              
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
                                          {formatDateDisplay(schedule.date)}
                                        </span>
                                        {schedule.venue && (
                                          <span className="text-[10px] text-gray-400 truncate max-w-[110px]" title={schedule.venue}>
                                            {schedule.venue}
                                          </span>
                                        )}
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

                                  {/* Title & Defense Stage */}
                                  <TableCell>
                                    <div className="flex flex-col gap-1.5">
                                      {proposal?.title || group.title ? (
                                        <div className="font-semibold text-gray-900 dark:text-white line-clamp-2" title={proposal?.title || group.title}>
                                          {proposal?.title || group.title}
                                        </div>
                                      ) : (
                                        <span className="text-sm text-gray-400 italic">No approved title yet</span>
                                      )}

                                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                        {isDefended ? (
                                          <Badge
                                            variant="green"
                                            className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                                          >
                                            Thesis/Capstone defended
                                          </Badge>
                                        ) : isRedefense ? (
                                          <Badge variant="amber" className="text-[10px] font-bold">
                                            {stageLabel.includes('Re-defense') ? stageLabel : 'For Re-defense'}
                                          </Badge>
                                        ) : schedule && (schedule.defenseType === 'final_defense' || schedule.defenseStage?.toLowerCase().includes('final')) ? (
                                          <Badge variant="purple" className="text-[10px] font-medium">
                                            Final Defense
                                          </Badge>
                                        ) : schedule && (schedule.startTime || schedule.date || schedule.defenseType === 'proposal_defense') ? (
                                          <Badge variant="blue" className="text-[10px] font-medium">
                                            Proposal Defense
                                          </Badge>
                                        ) : (
                                          <Badge variant="gray" className="text-[10px]">
                                            Unscheduled
                                          </Badge>
                                        )}
                                      </div>

                                      {/* Recommendation for Admin/Coordinator if group is in re-defense */}
                                      {isRedefense && (
                                        <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-md text-[11px] font-medium text-amber-800 dark:text-amber-300 w-fit">
                                          <HiSparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                          <span>
                                            {needsRedefenseScheduling
                                              ? "Recommendation: Set re-defense schedule"
                                              : "Re-defense presentation scheduled"}
                                          </span>
                                        </div>
                                      )}
                                    </div>
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
                                    <div className="flex items-center justify-center gap-1.5 h-full">
                                      {/* Quick Action: Schedule Defense / Re-defense presentation */}
                                      {isRedefense ? (
                                        <button 
                                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-sm transition"
                                          title="Set Re-defense presentation schedule"
                                          onClick={() => {
                                            setSelectedGroupForScheduling(group);
                                            setSelectedScheduleForEditing(schedule);
                                            setIsRedefenseMode(true);
                                            setIsScheduleDefenseModalOpen(true);
                                          }}
                                        >
                                          <CalendarPlus className="w-3.5 h-3.5" />
                                          <span>Schedule Re-defense</span>
                                        </button>
                                      ) : (
                                        <button 
                                          className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40 transition-colors"
                                          title={
                                            schedule && (schedule.startTime || schedule.date)
                                              ? 'Update / Reschedule Presentation'
                                              : 'Schedule Defense Presentation'
                                          } 
                                          onClick={() => {
                                            setSelectedGroupForScheduling(group);
                                            setSelectedScheduleForEditing(schedule);
                                            setIsRedefenseMode(false);
                                            setIsScheduleDefenseModalOpen(true);
                                          }}
                                        >
                                          <CalendarPlus className="w-4 h-4" />
                                        </button>
                                      )}

                                      {/* Clear Time button */}
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
                                              setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, date: '', startTime: '', endTime: '' } : s));
                                              try {
                                                await scheduleService.updateSchedule(schedule.id, { date: '', startTime: '', endTime: '' });
                                                showToast("Time cleared.", "success");
                                                refreshData(false);
                                              } catch (e) {
                                                showToast("Failed to clear time.", "error");
                                                refreshData(false);
                                              }
                                            }
                                          }}
                                          className="p-1.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
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

      {/* 1. Schedule Defense / Re-defense Modal (Group Selector & Auto-populate) */}
      {isScheduleDefenseModalOpen && (
        <ScheduleDefenseModal
          isOpen={isScheduleDefenseModalOpen}
          onClose={() => {
            setIsScheduleDefenseModalOpen(false);
            setSelectedGroupForScheduling(null);
            setSelectedScheduleForEditing(null);
            setIsRedefenseMode(false);
          }}
          groups={
            selectedSection
              ? groups.filter((g) => g.sectionId === selectedSection)
              : groups
          }
          proposals={proposals}
          schedules={schedules}
          preselectedGroup={selectedGroupForScheduling}
          scheduleToEdit={selectedScheduleForEditing}
          isRedefenseMode={isRedefenseMode}
          onScheduleSaved={(savedSchedule) => {
            setIsScheduleDefenseModalOpen(false);
            setSelectedGroupForScheduling(null);
            setSelectedScheduleForEditing(null);
            setIsRedefenseMode(false);
            showToast(
              isRedefenseMode
                ? "Re-defense schedule confirmed successfully!"
                : (savedSchedule?.id && schedules.some(s => s.id === savedSchedule.id)
                  ? "Defense schedule updated successfully!"
                  : "Defense schedule created successfully!")
            );
            if (savedSchedule?.id) {
              setSchedules((prev) => {
                const idx = prev.findIndex((s) => s.id === savedSchedule.id);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = { ...updated[idx], ...savedSchedule };
                  return updated;
                }
                return [...prev, savedSchedule];
              });
            }
            refreshData(false);
          }}
        />
      )}



      {/* 3. Batch Auto-Generate Modal */}
      {isScheduleModalOpen && (
        <GenerateScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          groups={groups
            .filter((g) => {
              if (g.sectionId === selectedSection) return true;
              const curSecObj = relevantSections.find(sec => sec.id === selectedSection);
              const cleanCurSec = (curSecObj?.name || '').replace(/^section\s+/i, '').trim().toLowerCase();
              const cleanGSec = (g.sectionName || '').replace(/^section\s+/i, '').trim().toLowerCase();
              if (cleanGSec && cleanCurSec && cleanGSec === cleanCurSec) return true;
              return false;
            })
            .map((g) => {
              const schedule = getScheduleForGroup(g.id);
              const panelists =
                schedule?.panelists?.length > 0
                  ? schedule.panelists
                  : g.panelists || [];
              return {
                ...g,
                title:
                  getProposalForGroup(g.id)?.title || 'No approved title yet',
                adviserId: schedule?.adviserId || g.adviserId,
                adviserName: schedule?.adviserName || g.adviserName,
                panelists: panelists,
                panelistIds: panelists
                  .map((p) => p.id || p.uid)
                  .filter(Boolean),
              };
            })}
          onSchedulesCreated={() => {
            setIsScheduleModalOpen(false);
            showToast("Schedules created successfully!");
            refreshData();
          }}
        />
      )}
    </div>
  );
};

export default Scheduling;
