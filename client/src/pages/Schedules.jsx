// src/pages/Schedules.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import { 
  HiCalendarDays, 
  HiMagnifyingGlass,
  HiClock,
  HiMapPin,
  HiChevronRight,
  HiAcademicCap,
  HiDocumentText,
  HiFunnel,
  HiXMark
} from "react-icons/hi2";
import { scheduleService } from "../services/schedule.service";
import { gradingService } from "../services/grading.service";

const formatTime12Hour = (time) => {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const h = parseInt(parts[0], 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedHour = h % 12 || 12;
  return `${formattedHour}:${parts[1]} ${ampm}`;
};

export const Schedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [evaluations, setEvaluations] = useState({ proposalEvaluations: [], finalEvaluations: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [defenseFilter, setDefenseFilter] = useState("all"); // 'all' | 'proposal' | 'final'
  const [programFilter, setProgramFilter] = useState("all"); // 'all' | 'BSIT' | 'BSCS'
  const [specializationFilter, setSpecializationFilter] = useState("all"); // 'all' | 'IS' | 'WMAD' | 'AMG' | 'SMP'
  const [toast, setToast] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const [data, evalsData] = await Promise.all([
        scheduleService.getAllSchedules(),
        gradingService.getAllEvaluations().catch(() => ({ proposalEvaluations: [], finalEvaluations: [] })),
      ]);
      setSchedules(data);
      setEvaluations(evalsData || { proposalEvaluations: [], finalEvaluations: [] });
    } catch (err) {
      console.error("[Schedules] fetch error:", err);
      setToast("Failed to load schedules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // When program changes, reset specialization if it doesn't belong to the new program
  const handleProgramChange = (e) => {
    const newProg = e.target.value;
    setProgramFilter(newProg);
    if (newProg === "BSCS" && specializationFilter !== "all" && specializationFilter !== "IS") {
      setSpecializationFilter("all");
    } else if (newProg === "BSIT" && specializationFilter === "IS") {
      setSpecializationFilter("all");
    }
  };

  // Helper to determine defense category ('proposal' vs 'final')
  const getDefenseCategory = (sch) => {
    if (sch.defenseType === 'final_defense' || sch.type === 'final_defense') {
      return 'final';
    }
    const stage = (sch.defenseStage || '').toLowerCase();
    if (stage.includes('final')) return 'final';
    return 'proposal';
  };

  // Helper to determine program ('BSCS' vs 'BSIT')
  const getScheduleProgram = (sch) => {
    const raw = (sch.program || sch.courseId || '').toUpperCase();
    if (raw.includes('CS') || raw.includes('COMPUTER')) return 'BSCS';
    if (raw.includes('IT') || raw.includes('INFORMATION')) return 'BSIT';
    return 'BSIT';
  };

  // Helper to determine specialization code ('IS', 'WMAD', 'AMG', 'SMP')
  const getScheduleSpecialization = (sch) => {
    const raw = (sch.specialization || '').toUpperCase();
    if (raw.includes('IS') || raw.includes('INTELLIGENT')) return 'IS';
    if (raw.includes('WMAD') || raw.includes('WEB') || raw.includes('MOBILE')) return 'WMAD';
    if (raw.includes('AMG') || raw.includes('ANIMATION')) return 'AMG';
    if (raw.includes('SMP') || raw.includes('SERVICE')) return 'SMP';
    return getScheduleProgram(sch) === 'BSCS' ? 'IS' : 'WMAD';
  };

  const getSpecializationFullName = (prog, spec) => {
    if (prog === 'BSCS') {
      if (spec === 'IS') return 'Intelligent Systems (IS)';
      return spec;
    }
    if (prog === 'BSIT') {
      if (spec === 'WMAD') return 'Web and Mobile App Development (WMAD)';
      if (spec === 'AMG') return 'Animation and Motion Graphics (AMG)';
      if (spec === 'SMP') return 'Service Management Program (SMP)';
      return spec;
    }
    return spec;
  };

  // Helper to resolve student & panelist details for a schedule
  const getScheduleDetails = (sch) => {
    let studentNames = [];
    if (sch.studentNames && Array.isArray(sch.studentNames) && sch.studentNames.length > 0) {
      studentNames = sch.studentNames;
    } else if (sch.members && Array.isArray(sch.members) && sch.members.length > 0) {
      studentNames = sch.members.map(m => m.fullName || m.name || "").filter(Boolean);
    } else if (sch.studentName && sch.studentName !== "Student Researcher") {
      studentNames = [sch.studentName];
    }

    const panelists = Array.isArray(sch.panelists) ? sch.panelists : [];
    const subjectSpecialist = 
      panelists.find(p => (p.role || '').toLowerCase().includes('subject'))?.name || 
      panelists.find(p => (p.role || '').toLowerCase().includes('subject'))?.fullName ||
      (panelists.length > 0 && !panelists.some(p => (p.role || '').toLowerCase().includes('subject')) ? (panelists[0]?.name || panelists[0]?.fullName) : null) ||
      (Array.isArray(sch.panelistNames) && sch.panelistNames[0] ? sch.panelistNames[0] : null);

    const statistician = 
      panelists.find(p => (p.role || '').toLowerCase().includes('stat'))?.name || 
      panelists.find(p => (p.role || '').toLowerCase().includes('stat'))?.fullName ||
      (panelists.length > 1 && !panelists.some(p => (p.role || '').toLowerCase().includes('stat')) ? (panelists[1]?.name || panelists[1]?.fullName) : null) ||
      (Array.isArray(sch.panelistNames) && sch.panelistNames[1] ? sch.panelistNames[1] : null);

    const technical = 
      panelists.find(p => (p.role || '').toLowerCase().includes('tech'))?.name || 
      panelists.find(p => (p.role || '').toLowerCase().includes('tech'))?.fullName ||
      (panelists.length > 2 && !panelists.some(p => (p.role || '').toLowerCase().includes('tech')) ? (panelists[2]?.name || panelists[2]?.fullName) : null) ||
      (Array.isArray(sch.panelistNames) && sch.panelistNames[2] ? sch.panelistNames[2] : null);

    return { studentNames, subjectSpecialist, statistician, technical };
  };

  const getScheduleVerdictState = (sch) => {
    const groupId = sch.projectId || sch.groupId;
    const propEvals = (evaluations.proposalEvaluations || []).filter(
      (e) => (groupId && (e.groupId === groupId || e.workspaceId === groupId || e.projectId === groupId)) || (sch.id && e.defenseId === sch.id)
    );
    const finalEvals = (evaluations.finalEvaluations || []).filter(
      (e) => (groupId && (e.groupId === groupId || e.workspaceId === groupId || e.projectId === groupId)) || (sch.id && e.defenseId === sch.id)
    );

    const hasRedefense =
      sch.status === 'for_redefense' ||
      sch.resultStatus === 're_defense' ||
      sch.isRedefense ||
      sch.defenseStage?.toLowerCase().includes('re-defense') ||
      propEvals.some((e) => e.verdict === 'REDEFENSE' || e.verdict === 'DISAPPROVED') ||
      finalEvals.some((e) => e.verdict === 'REDEFENSE' || e.verdict === 'DISAPPROVED');

    const isPassed =
      !hasRedefense &&
      (sch.resultStatus === 'passed' ||
        sch.resultStatus === 'approved' ||
        (sch.status === 'completed' && sch.resultStatus !== 're_defense') ||
        propEvals.some((e) => e.verdict === 'APPROVED' || e.verdict === 'APPROVED_WITH_REVISIONS') ||
        finalEvals.some(
          (e) =>
            e.verdict === 'PASSED' ||
            e.verdict === 'PASSED_WITH_MINOR_REVISIONS' ||
            e.verdict === 'PASSED_WITH_MAJOR_REVISIONS'
        ));

    return { hasRedefense, isPassed };
  };

  // Filter schedules based on Search, Defense Category, Program, and Specialization
  const filteredSchedules = useMemo(() => {
    return schedules.filter((sch) => {
      // 1. Defense Type Filter
      const cat = getDefenseCategory(sch);
      if (defenseFilter !== "all" && cat !== defenseFilter) return false;

      // 2. Program Filter
      const prog = getScheduleProgram(sch);
      if (programFilter !== "all" && prog !== programFilter) return false;

      // 3. Specialization Filter
      const spec = getScheduleSpecialization(sch);
      if (specializationFilter !== "all" && spec !== specializationFilter) return false;

      // 4. Search Query Filter
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const title = (sch.projectTitle || sch.title || "").toLowerCase();
      if (title.includes(q)) return true;

      const venue = (sch.venue || sch.location || "").toLowerCase();
      if (venue.includes(q)) return true;

      const { studentNames, subjectSpecialist, statistician, technical } = getScheduleDetails(sch);
      if (studentNames.some(name => name.toLowerCase().includes(q))) return true;
      if (sch.studentName && sch.studentName.toLowerCase().includes(q)) return true;

      if (subjectSpecialist && subjectSpecialist.toLowerCase().includes(q)) return true;
      if (statistician && statistician.toLowerCase().includes(q)) return true;
      if (technical && technical.toLowerCase().includes(q)) return true;

      return false;
    });
  }, [schedules, searchQuery, defenseFilter, programFilter, specializationFilter]);

  // Group schedules into Proposal Defense and Final Defense, then by Program & Specialization
  const groupedSections = useMemo(() => {
    const sections = [];

    // Stages to consider based on filter
    const stages = [];
    if (defenseFilter === "all" || defenseFilter === "proposal") {
      stages.push({
        id: "proposal",
        title: "Proposal Defense Schedules",
        badgeVariant: "blue",
        badgeLabel: "Proposal Defense",
        icon: HiDocumentText
      });
    }
    if (defenseFilter === "all" || defenseFilter === "final") {
      stages.push({
        id: "final",
        title: "Final Defense Schedules",
        badgeVariant: "emerald",
        badgeLabel: "Final Defense",
        icon: HiAcademicCap
      });
    }

    stages.forEach((stage) => {
      const stageSchedules = filteredSchedules.filter(
        (sch) => getDefenseCategory(sch) === stage.id
      );

      // Group stage schedules by Program and Specialization
      const tableMap = new Map();

      stageSchedules.forEach((sch) => {
        const prog = getScheduleProgram(sch);
        const spec = getScheduleSpecialization(sch);
        const key = `${prog}-${spec}`;

        if (!tableMap.has(key)) {
          tableMap.set(key, {
            key,
            program: prog,
            specialization: spec,
            specializationFullName: getSpecializationFullName(prog, spec),
            schedules: []
          });
        }
        tableMap.get(key).schedules.push(sch);
      });

      // Sort tables consistently (BSCS first, then BSIT WMAD, AMG, SMP)
      const tables = Array.from(tableMap.values()).sort((a, b) => {
        if (a.program !== b.program) return a.program.localeCompare(b.program);
        return a.specialization.localeCompare(b.specialization);
      });

      sections.push({
        ...stage,
        totalCount: stageSchedules.length,
        tables
      });
    });

    return sections;
  }, [filteredSchedules, defenseFilter]);

  const hasActiveFilters = defenseFilter !== "all" || programFilter !== "all" || specializationFilter !== "all" || searchQuery !== "";

  const resetFilters = () => {
    setSearchQuery("");
    setDefenseFilter("all");
    setProgramFilter("all");
    setSpecializationFilter("all");
  };

  const tableColumns = [
    { label: "Time/Venue", className: "min-w-[170px]" },
    { label: "Name of Students", className: "min-w-[170px]" },
    { label: "Title", className: "min-w-[220px]" },
    { label: "Subject Specialist", className: "min-w-[150px]" },
    { label: "Statistician", className: "min-w-[140px]" },
    { label: "Technical", className: "min-w-[140px]" },
  ];

  return (
    <div className="space-y-6 font-inter pb-10">
      <PageHeader
        icon={HiCalendarDays}
        title="Oral Defense Schedules"
        description="Public schedule for proposal defenses, final oral presentations, panel venues, and committee assignments."
      />

      {toast && (
        <Toast message={toast} variant="error" onClose={() => setToast("")} />
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-[#15161e] p-4 rounded-2xl border border-gray-200 dark:border-[#222433] shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <HiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, student, venue, or panel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-gray-50 dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-[13px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
            />
          </div>

          {/* Defense Type Selection Dropdown */}
          <div className="w-full sm:w-56 shrink-0">
            <Select
              id="filter-defense-type"
              value={defenseFilter}
              onChange={(e) => setDefenseFilter(e.target.value)}
              className="!h-10 !py-2 !text-[13px] !rounded-xl"
            >
              <option value="all">All Defense Schedules</option>
              <option value="proposal">Proposal Defense Schedule</option>
              <option value="final">Final Defense Schedule</option>
            </Select>
          </div>

          {/* Program Selection Dropdown */}
          <div className="w-full sm:w-52 shrink-0">
            <Select
              id="filter-program"
              value={programFilter}
              onChange={handleProgramChange}
              className="!h-10 !py-2 !text-[13px] !rounded-xl"
            >
              <option value="all">All Programs</option>
              <option value="BSCS">BSCS (Computer Science)</option>
              <option value="BSIT">BSIT (Information Technology)</option>
            </Select>
          </div>

          {/* Specialization Selection Dropdown */}
          <div className="w-full sm:w-56 shrink-0">
            <Select
              id="filter-specialization"
              value={specializationFilter}
              onChange={(e) => setSpecializationFilter(e.target.value)}
              className="!h-10 !py-2 !text-[13px] !rounded-xl"
            >
              <option value="all">All Specializations</option>
              {programFilter !== "BSIT" && (
                <option value="IS">IS — Intelligent Systems</option>
              )}
              {programFilter !== "BSCS" && (
                <>
                  <option value="WMAD">WMAD — Web & Mobile App</option>
                  <option value="AMG">AMG — Animation & Motion</option>
                  <option value="SMP">SMP — Service Management</option>
                </>
              )}
            </Select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 h-10 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 bg-gray-100 dark:bg-[#1f202e] hover:bg-red-50 dark:hover:bg-red-950/20 transition-all shrink-0"
              title="Reset all filters"
            >
              <HiXMark className="w-4 h-4" />
              <span>Reset</span>
            </button>
          )}

          {/* Schedule Counter Badge */}
          <div className="shrink-0 flex items-center justify-end">
            <Badge variant="blue" className="text-xs px-3.5 py-1.5 font-semibold">
              {filteredSchedules.length} Schedule{filteredSchedules.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 dark:border-[#222433] text-xs">
          <span className="text-gray-400 font-medium mr-1 flex items-center gap-1">
            <HiFunnel className="w-3.5 h-3.5" /> Stage:
          </span>
          <button
            onClick={() => setDefenseFilter("all")}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              defenseFilter === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 dark:bg-[#1a1b26] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#252636]"
            }`}
          >
            All Defenses
          </button>
          <button
            onClick={() => setDefenseFilter("proposal")}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              defenseFilter === "proposal"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 dark:bg-[#1a1b26] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#252636]"
            }`}
          >
            Proposal Defense
          </button>
          <button
            onClick={() => setDefenseFilter("final")}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              defenseFilter === "final"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-gray-100 dark:bg-[#1a1b26] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#252636]"
            }`}
          >
            Final Defense
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-20 text-center bg-white dark:bg-[#15161e] rounded-2xl border border-gray-200 dark:border-[#222433] shadow-sm">
          <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading defense schedules...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredSchedules.length === 0 && (
        <div className="py-20 text-center bg-white dark:bg-[#15161e] rounded-2xl border border-gray-200 dark:border-[#222433] shadow-sm">
          <HiCalendarDays className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">No Defense Schedules Found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
            {hasActiveFilters
              ? "No schedules match your selected defense type, program, or search filters."
              : "No defense presentations are currently scheduled."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Grouped Defense Sections & Tables */}
      {!loading && filteredSchedules.length > 0 && groupedSections.map((section) => {
        if (section.tables.length === 0) return null;
        const SectionIcon = section.icon;

        return (
          <div key={section.id} className="space-y-4">
            {/* Stage Section Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-[#222433]">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${section.id === 'proposal' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'}`}>
                  <SectionIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {section.title}
                    <Badge variant={section.badgeVariant} className="text-[11px] px-2 py-0.5">
                      {section.totalCount} Group{section.totalCount !== 1 ? 's' : ''}
                    </Badge>
                  </h2>
                </div>
              </div>
            </div>

            {/* Program & Specialization Tables */}
            <div className="space-y-6">
              {section.tables.map((tableGroup) => (
                <div 
                  key={tableGroup.key}
                  className="bg-white dark:bg-[#15161e] rounded-2xl border border-gray-200 dark:border-[#222433] shadow-sm overflow-hidden"
                >
                  {/* Table Header: Program and Specialization */}
                  <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50/80 dark:bg-[#191a26]/80 border-b border-gray-200 dark:border-[#222433]">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-[13px] text-gray-900 dark:text-white">
                        {tableGroup.program} — {tableGroup.specializationFullName}
                      </span>
                      <Badge variant="gray" className="text-[11px] px-2 py-0.5">
                        {tableGroup.schedules.length}
                      </Badge>
                    </div>
                    <Badge 
                      variant={section.id === 'proposal' ? 'blue' : 'emerald'} 
                      className="text-[10px] uppercase font-bold tracking-wider"
                    >
                      {section.badgeLabel}
                    </Badge>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <DataTable columns={tableColumns} className="!border-0 !shadow-none !rounded-none">
                      {tableGroup.schedules.map((sch) => {
                        const { studentNames, subjectSpecialist, statistician, technical } = getScheduleDetails(sch);

                        return (
                          <TableRow key={sch.id || sch._id}>
                            <TableCell>
                              <div className="flex flex-col space-y-1.5">
                                {sch.date || sch.startTime ? (
                                  <>
                                    <div className="flex items-center gap-1.5">
                                      <HiClock className="w-4 h-4 text-blue-500 shrink-0" />
                                      <span className="font-bold text-[12px] text-gray-900 dark:text-white whitespace-nowrap">
                                        {sch.date ? new Date(sch.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                        {sch.startTime ? ` · ${formatTime12Hour(sch.startTime)}` : ''}
                                        {sch.endTime ? ` – ${formatTime12Hour(sch.endTime)}` : ''}
                                      </span>
                                    </div>
                                    {sch.venue && (
                                      <div className="flex items-center gap-1.5">
                                        <HiMapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">{sch.venue}</span>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400 italic text-xs">Not scheduled</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {studentNames.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {studentNames.map((name, idx) => (
                                    <div key={idx} className="font-medium text-xs text-gray-700 dark:text-gray-300">
                                      {name}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-xs">{sch.studentName || 'Not assigned'}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1.5">
                                <div className="font-semibold text-xs text-gray-900 dark:text-gray-100 line-clamp-3">
                                  {sch.projectTitle || sch.title || 'Untitled'}
                                </div>
                                {(() => {
                                  const { isPassed, hasRedefense } = getScheduleVerdictState(sch);
                                  if (isPassed) {
                                    return (
                                      <Badge variant="green" className="w-fit text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                        Thesis/Capstone defended
                                      </Badge>
                                    );
                                  }
                                  if (hasRedefense) {
                                    return (
                                      <Badge variant="amber" className="w-fit text-[10px] font-bold">
                                        For Re-defense
                                      </Badge>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-xs text-gray-700 dark:text-gray-300">
                                {subjectSpecialist || <span className="text-gray-400 italic text-xs">Not Assigned</span>}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-xs text-gray-700 dark:text-gray-300">
                                {statistician || <span className="text-gray-400 italic text-xs">Not Assigned</span>}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-xs text-gray-700 dark:text-gray-300">
                                {technical || <span className="text-gray-400 italic text-xs">Not Assigned</span>}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </DataTable>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden divide-y divide-gray-100 dark:divide-[#222433]">
                    {tableGroup.schedules.map((sch) => {
                      const { studentNames } = getScheduleDetails(sch);
                      const titleText = sch.projectTitle || sch.title || 'Untitled';
                      const { isPassed, hasRedefense } = getScheduleVerdictState(sch);

                      return (
                        <button
                          key={sch.id || sch._id}
                          onClick={() => setSelectedSchedule(sch)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-[#1c1d28]/60 transition-colors active:bg-gray-100 dark:active:bg-[#1c1d28]"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <HiClock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="text-xs font-bold text-gray-900 dark:text-white">
                                {sch.startTime ? formatTime12Hour(sch.startTime) : ''}
                                {sch.endTime ? ` – ${formatTime12Hour(sch.endTime)}` : ''}
                              </span>
                              {sch.venue && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600">·</span>
                                  <span className="text-[11px] text-gray-500">{sch.venue}</span>
                                </>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 mb-0.5">
                              {titleText}
                            </p>
                            {isPassed && (
                              <Badge variant="green" className="w-fit mb-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                Thesis/Capstone defended
                              </Badge>
                            )}
                            {hasRedefense && (
                              <Badge variant="amber" className="w-fit mb-1 text-[10px] font-bold">
                                For Re-defense
                              </Badge>
                            )}
                            {studentNames.length > 0 && (
                              <p className="text-xs text-gray-400 truncate">
                                {studentNames.join(', ')}
                              </p>
                            )}
                            {sch.date && (
                              <p className="text-[10px] text-gray-400 mt-1">
                                {new Date(sch.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                          <HiChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Mobile Schedule Detail Modal */}
      {selectedSchedule && (() => {
        const sch = selectedSchedule;
        const { studentNames, subjectSpecialist, statistician, technical } = getScheduleDetails(sch);
        const prog = getScheduleProgram(sch);
        const spec = getScheduleSpecialization(sch);
        const cat = getDefenseCategory(sch);

        return (
          <Modal
            isOpen={!!selectedSchedule}
            onClose={() => setSelectedSchedule(null)}
            title="Defense Presentation Details"
            icon={HiCalendarDays}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={cat === 'proposal' ? 'blue' : 'emerald'} className="text-xs">
                  {cat === 'proposal' ? 'Proposal Defense' : 'Final Defense'}
                </Badge>
                <Badge variant="gray" className="text-xs">
                  {prog} · {spec}
                </Badge>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Date & Time</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                  {sch.date ? new Date(sch.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Not set'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {sch.startTime ? formatTime12Hour(sch.startTime) : ''}{sch.endTime ? ` – ${formatTime12Hour(sch.endTime)}` : ''}
                </p>
              </div>

              {sch.venue && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Venue</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{sch.venue}</p>
                </div>
              )}

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Research Title</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{sch.projectTitle || sch.title || 'Untitled'}</p>
              </div>

              {studentNames.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Students</span>
                  <div className="mt-1 space-y-1">
                    {studentNames.map((name, idx) => (
                      <p key={idx} className="text-sm text-gray-700 dark:text-gray-300 font-medium">{name}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 dark:border-[#222433] pt-4">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Panel Members</span>
                <div className="mt-2 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Subject Specialist</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{subjectSpecialist || 'Not Assigned'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Statistician</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{statistician || 'Not Assigned'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Technical</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{technical || 'Not Assigned'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

export default Schedules;