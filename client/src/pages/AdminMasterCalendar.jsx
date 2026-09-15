// src/pages/AdminMasterCalendar.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
  HiCalendarDays,
  HiChevronLeft,
  HiChevronRight,
  HiMagnifyingGlass,
  HiFunnel,
  HiArrowTopRightOnSquare,
  HiClock,
  HiMapPin,
  HiUsers,
  HiAcademicCap,
  HiDocumentText,
  HiChatBubbleBottomCenterText,
  HiExclamationTriangle,
  HiCheckCircle,
  HiArrowPath,
  HiClipboardDocumentCheck,
  HiBookOpen,
} from "react-icons/hi2";
import { masterCalendarService } from "../services/masterCalendar.service";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MasterCalendar = () => {
  const navigate = useNavigate();
  const { userProfile, currentUser, role, currentFacultyMode } = useAuth();
  const effectiveRole = role === "faculty" ? currentFacultyMode : role;

  // Calendar Date State (defaults to current month and day)
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(
    today.toISOString().split("T")[0]
  );

  // Data State
  const [events, setEvents] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [emptyReason, setEmptyReason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter State
  const [selectedType, setSelectedType] = useState("ALL"); // 'ALL' | 'DEFENSE' | 'REVISION' | 'SUBMISSION' | 'CONSULTATION' | 'TASK'
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  // Dynamic Header Text based on Active User Role
  const pageTitle = useMemo(() => {
    if (effectiveRole === "admin" || effectiveRole === "research_coordinator") {
      return "Master Calendar";
    }
    if (effectiveRole === "student") {
      return groupInfo?.name ? `${groupInfo.name} Research Calendar` : "My Research Calendar";
    }
    if (effectiveRole === "adviser") {
      return "Advisee Research Calendar";
    }
    if (effectiveRole === "panelist") {
      return "Panel Defense Calendar";
    }
    return "Research Calendar";
  }, [effectiveRole, groupInfo]);

  const pageSubtitle = useMemo(() => {
    if (effectiveRole === "admin" || effectiveRole === "research_coordinator") {
      return "Centralized institutional view of all defense dates, revision deadlines, manuscript submissions, and task due dates.";
    }
    if (effectiveRole === "student") {
      return "Track your research group's defense milestones, adviser consultations, manuscript deadlines, and revision due dates.";
    }
    if (effectiveRole === "adviser") {
      return "Schedule of defenses, consultations, and revision deadlines across your assigned advisee research groups.";
    }
    if (effectiveRole === "panelist") {
      return "Scheduled research defenses where you are serving on the evaluation panel.";
    }
    return "Institutional research schedule and milestone tracking.";
  }, [effectiveRole]);

  // Fetch Role-Authorized Calendar Data
  const loadEvents = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await masterCalendarService.getEventsForUser(
        userProfile,
        currentUser,
        effectiveRole
      );
      setEvents(result.events || []);
      setGroupInfo(result.groupInfo || null);
      setEmptyReason(result.emptyReason || null);
    } catch (err) {
      console.error("[MasterCalendar] Failed to load calendar events:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [userProfile?.uid, currentUser?.uid, effectiveRole]);

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(now.toISOString().split("T")[0]);
  };

  // Filter events based on active filters
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Type Filter
      if (selectedType !== "ALL" && ev.eventType !== selectedType) {
        return false;
      }
      // Overdue filter
      if (onlyOverdue && !ev.isOverdue) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (ev.title || "").toLowerCase().includes(q);
        const matchGroup = (ev.groupName || "").toLowerCase().includes(q);
        const matchResearch = (ev.researchTitle || "").toLowerCase().includes(q);
        const matchAdviser = (ev.assignedBy || "").toLowerCase().includes(q);
        const matchStudent = (ev.assignedTo || "").toLowerCase().includes(q);
        const matchVenue = (ev.venue || "").toLowerCase().includes(q);
        const matchChapter = (ev.chapter || "").toLowerCase().includes(q);
        if (
          !matchTitle &&
          !matchGroup &&
          !matchResearch &&
          !matchAdviser &&
          !matchStudent &&
          !matchVenue &&
          !matchChapter
        ) {
          return false;
        }
      }
      return true;
    });
  }, [events, selectedType, onlyOverdue, searchQuery]);

  // Events indexed by date "YYYY-MM-DD"
  const eventsByDate = useMemo(() => {
    const map = new Map();
    filteredEvents.forEach((ev) => {
      if (!map.has(ev.date)) {
        map.set(ev.date, []);
      }
      map.get(ev.date).push(ev);
    });
    return map;
  }, [filteredEvents]);

  // Calendar Grid Days Calculation
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInCurrentMonth = new Date(
      currentYear,
      currentMonth + 1,
      0
    ).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Previous Month Padding Days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      days.push({
        dayNumber: dayNum,
        dateString: dateStr,
        isCurrentMonth: false,
        isPrevMonth: true,
      });
    }

    // Current Month Days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        dateString: dateStr,
        isCurrentMonth: true,
      });
    }

    // Next Month Padding Days to complete standard 35 or 42 grid
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let n = 1; n <= remaining; n++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
      days.push({
        dayNumber: n,
        dateString: dateStr,
        isCurrentMonth: false,
        isNextMonth: true,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Events on currently selected date
  const selectedDateEvents = useMemo(() => {
    return eventsByDate.get(selectedDate) || [];
  }, [eventsByDate, selectedDate]);

  // Current Month Summary Metrics
  const monthMetrics = useMemo(() => {
    const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
    const monthEvs = events.filter((e) => e.date.startsWith(currentMonthPrefix));

    const total = monthEvs.length;
    const defenses = monthEvs.filter((e) => e.eventType === "DEFENSE").length;
    const revisions = monthEvs.filter((e) => e.eventType === "REVISION").length;
    const submissions = monthEvs.filter((e) => e.eventType === "SUBMISSION").length;
    const overdue = monthEvs.filter((e) => e.isOverdue).length;

    return { total, defenses, revisions, submissions, overdue };
  }, [events, currentYear, currentMonth]);

  // Badge Color & Icon Helper by Event Type
  const getEventTypeMeta = (type) => {
    switch (type) {
      case "DEFENSE":
        return {
          label: "Defense",
          badgeVariant: "purple",
          dotColor: "bg-purple-500",
          pillBg: "bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40",
          icon: <HiAcademicCap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
        };
      case "REVISION":
        return {
          label: "Revision Deadline",
          badgeVariant: "amber",
          dotColor: "bg-amber-500",
          pillBg: "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40",
          icon: <HiChatBubbleBottomCenterText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
        };
      case "SUBMISSION":
        return {
          label: "Submission",
          badgeVariant: "blue",
          dotColor: "bg-blue-500",
          pillBg: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40",
          icon: <HiDocumentText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
        };
      case "CONSULTATION":
        return {
          label: "Consultation",
          badgeVariant: "emerald",
          dotColor: "bg-emerald-500",
          pillBg: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
          icon: <HiUsers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
        };
      case "TASK":
        return {
          label: "Task Due",
          badgeVariant: "indigo",
          dotColor: "bg-indigo-500",
          pillBg: "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40",
          icon: <HiClipboardDocumentCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />,
        };
      default:
        return {
          label: "Event",
          badgeVariant: "gray",
          dotColor: "bg-gray-500",
          pillBg: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
          icon: <HiCalendarDays className="w-3.5 h-3.5 text-gray-500" />,
        };
    }
  };

  // Format Header for Selected Date Panel: e.g. "Friday, September 18, 2026"
  const formattedSelectedDateText = useMemo(() => {
    if (!selectedDate) return "";
    const parts = selectedDate.split("-");
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    return selectedDate;
  }, [selectedDate]);

  const isTodayString = today.toISOString().split("T")[0];

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* ========================================================= */}
      {/* 1. PAGE HEADER                                           */}
      {/* ========================================================= */}
      <div className="px-6 py-4 sm:px-8 sm:py-5 rounded-2xl bg-white dark:bg-[#15161e] border border-gray-200/90 dark:border-[#222433] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        {/* Left Side: Context Badges */}
        <div className="flex items-center gap-2">
          {effectiveRole === "student" && groupInfo && (
            <Badge variant="blue" size="sm">
              {groupInfo.name}
            </Badge>
          )}
          {effectiveRole === "panelist" && (
            <Badge variant="purple" size="sm">
              Panelist View
            </Badge>
          )}
        </div>

        {/* Right Side: Actions based on role */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">


          {effectiveRole === "admin" && (
            <Link to="/admin/scheduling">
              <Button variant="secondary" size="sm" className="text-xs font-semibold">
                Defense Scheduling →
              </Button>
            </Link>
          )}

          {effectiveRole === "student" && (
            <Link to="/research/workspace">
              <Button variant="primary" size="sm" className="text-xs font-semibold">
                <HiBookOpen className="w-3.5 h-3.5 mr-1.5 inline" /> Research Workspace
              </Button>
            </Link>
          )}

          {effectiveRole === "adviser" && (
            <Link to="/advisees">
              <Button variant="secondary" size="sm" className="text-xs font-semibold">
                My Advisees →
              </Button>
            </Link>
          )}

          {effectiveRole === "panelist" && (
            <Link to="/panelist/defendees">
              <Button variant="secondary" size="sm" className="text-xs font-semibold">
                Panel Defendees →
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1.1 STUDENT NO-GROUP NOTICE (IF APPLICABLE)              */}
      {/* ========================================================= */}
      {effectiveRole === "student" && emptyReason === "NO_GROUP" && (
        <Card className="p-8 sm:p-10 border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <HiUsers className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            You are not currently assigned to a research group
          </h3>
          <p className="text-sm text-gray-600 dark:text-[#9396a8] max-w-md leading-relaxed">
            Once you join or create a research group, your group's defense dates, adviser consultations, manuscript submissions, and revision deadlines will automatically populate on this calendar.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Link to="/my-group">
              <Button variant="primary" size="sm">
                Go to My Group
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* ========================================================= */}
      {/* 2. SUMMARY METRIC CARDS                                  */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card className="p-4 sm:p-5 border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-[#9396a8]">
              Events in {MONTH_NAMES[currentMonth]}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <HiCalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">
            {monthMetrics.total}
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">
            {effectiveRole === "student"
              ? "For your research group"
              : effectiveRole === "adviser"
              ? "For your advisee groups"
              : effectiveRole === "panelist"
              ? "For assigned panels"
              : "Across all research teams"}
          </span>
        </Card>

        <Card className="p-4 sm:p-5 border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-[#9396a8]">
              Defenses Scheduled
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <HiAcademicCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-purple-600 dark:text-purple-400">
            {monthMetrics.defenses}
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">
            Proposal &amp; Final Defenses
          </span>
        </Card>

        <Card className="p-4 sm:p-5 border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-[#9396a8]">
              Revision Deadlines
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <HiChatBubbleBottomCenterText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {monthMetrics.revisions}
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">
            In-document ONLYOFFICE feedback
          </span>
        </Card>

        <Card
          onClick={() => setOnlyOverdue((v) => !v)}
          className={`p-4 sm:p-5 border cursor-pointer transition shadow-sm ${
            onlyOverdue
              ? "border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 ring-2 ring-rose-500/20"
              : "border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-[#9396a8]">
              Overdue Deadlines
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <HiExclamationTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              {monthMetrics.overdue}
            </span>
            {monthMetrics.overdue > 0 && (
              <Badge variant="rose" size="sm" className="font-bold">
                Action Required
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">
            {onlyOverdue ? "Showing only overdue (click to reset)" : "Click to filter overdue items"}
          </span>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* 3. CALENDAR CONTROLS & FILTER BAR                        */}
      {/* ========================================================= */}
      <Card className="p-4 sm:p-5 border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Month Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl border border-gray-200 dark:border-[#262838] hover:bg-gray-100 dark:hover:bg-[#1c1d28] text-gray-700 dark:text-gray-200 transition"
              title="Previous Month"
            >
              <HiChevronLeft className="w-4 h-4" />
            </button>

            <div className="min-w-[180px] text-center">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-gray-200 dark:border-[#262838] hover:bg-gray-100 dark:hover:bg-[#1c1d28] text-gray-700 dark:text-gray-200 transition"
              title="Next Month"
            >
              <HiChevronRight className="w-4 h-4" />
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToday}
              className="text-xs font-semibold ml-2"
            >
              Today
            </Button>
          </div>

          {/* Search Box */}
          <div className="w-full lg:w-72">
            <Input
              placeholder="Search group, title, adviser..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={HiMagnifyingGlass}
              size="sm"
            />
          </div>
        </div>

        {/* Filter Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-100 dark:border-[#222433]">
          <span className="text-xs font-semibold text-gray-400 dark:text-[#6b6f84] mr-1 flex items-center gap-1">
            <HiFunnel className="w-3 h-3" /> Event Type:
          </span>

          {[
            { key: "ALL", label: "All Events" },
            { key: "DEFENSE", label: "Defenses" },
            { key: "REVISION", label: "Revisions" },
            { key: "SUBMISSION", label: "Submissions" },
            { key: "CONSULTATION", label: "Consultations" },
            { key: "TASK", label: "Task Deadlines" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedType(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedType === tab.key
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-[#1c1d28] text-gray-600 dark:text-[#9396a8] hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}

          {onlyOverdue && (
            <Badge
              variant="rose"
              size="sm"
              className="ml-auto cursor-pointer"
              onClick={() => setOnlyOverdue(false)}
            >
              Overdue Filter Active ✕
            </Badge>
          )}
        </div>
      </Card>

      {/* ========================================================= */}
      {/* 4. MAIN LAYOUT: CALENDAR GRID + SELECTED DATE PANEL       */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT / CENTER: FULL MONTHLY CALENDAR GRID (xl:col-span-8) */}
        <div className="xl:col-span-8">
          <Card className="p-4 sm:p-6 border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-sm overflow-hidden">
            {/* Days of the Week Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {DAY_NAMES.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-bold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider py-1.5"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid Cells */}
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-2 text-gray-400">
                <div className="w-7 h-7 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-xs">Loading authorized calendar events...</span>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1 sm:gap-2 auto-rows-fr">
                {calendarGrid.map((cell) => {
                  const dayEvents = eventsByDate.get(cell.dateString) || [];
                  const isSelected = selectedDate === cell.dateString;
                  const isToday = cell.dateString === isTodayString;
                  const hasOverdue = dayEvents.some((e) => e.isOverdue);

                  return (
                    <div
                      key={cell.dateString}
                      onClick={() => setSelectedDate(cell.dateString)}
                      className={`min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 rounded-xl border flex flex-col transition cursor-pointer relative ${
                        isSelected
                          ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs z-10"
                          : cell.isCurrentMonth
                          ? "border-gray-100 dark:border-[#222433] bg-gray-50/30 dark:bg-[#181923] hover:border-blue-200 dark:hover:border-blue-900/40"
                          : "border-transparent bg-transparent text-gray-300 dark:text-gray-700 hover:bg-gray-50 dark:hover:bg-[#161720]"
                      }`}
                    >
                      {/* Day Number Header */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday
                              ? "bg-blue-600 text-white shadow-2xs"
                              : isSelected
                              ? "text-blue-600 dark:text-blue-400 font-extrabold"
                              : cell.isCurrentMonth
                              ? "text-gray-700 dark:text-gray-300"
                              : "text-gray-400 dark:text-[#525568]"
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {/* Overdue Warning Flag */}
                        {hasOverdue && cell.isCurrentMonth && (
                          <span
                            className="w-2 h-2 rounded-full bg-rose-500 shrink-0"
                            title="Contains overdue deadlines"
                          />
                        )}
                      </div>

                      {/* Event Chips List (up to 3, then +N more) */}
                      <div className="space-y-1 flex-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((ev) => {
                          const meta = getEventTypeMeta(ev.eventType);

                          return (
                            <div
                              key={ev.id}
                              className={`px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium truncate flex items-center gap-1 border ${meta.pillBg}`}
                              title={`${ev.time ? ev.time + " - " : ""}${ev.title}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dotColor}`} />
                              <span className="truncate">{ev.title}</span>
                            </div>
                          );
                        })}

                        {dayEvents.length > 3 && (
                          <div className="text-[10px] font-bold text-gray-500 dark:text-[#9396a8] pl-1 pt-0.5">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT: SELECTED DATE EVENTS PANEL (xl:col-span-4) */}
        <div className="xl:col-span-4">
          <Card className="p-5 sm:p-6 border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-sm flex flex-col h-full space-y-4">
            {/* Panel Header */}
            <div className="border-b border-gray-100 dark:border-[#222433] pb-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#6b6f84]">
                  Selected Date Events
                </span>
                <Badge variant={selectedDateEvents.length > 0 ? "blue" : "gray"} size="sm">
                  {selectedDateEvents.length} {selectedDateEvents.length === 1 ? "Event" : "Events"}
                </Badge>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-1">
                {formattedSelectedDateText}
              </h3>
            </div>

            {/* Event List Container */}
            <div className="flex-1 min-h-0 space-y-3.5 overflow-y-auto pr-1">
              {selectedDateEvents.length === 0 ? (
                /* Empty State for Date */
                <div className="py-16 px-4 text-center flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#1c1d28] text-gray-400 dark:text-gray-500 flex items-center justify-center mb-1">
                    <HiCalendarDays className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    No research events scheduled
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-[#9396a8] max-w-xs leading-relaxed">
                    There are no defenses, consultations, submissions, or task deadlines recorded for this date.
                  </p>
                </div>
              ) : (
                /* List of Events for the Selected Date */
                selectedDateEvents.map((ev) => {
                  const meta = getEventTypeMeta(ev.eventType);

                  return (
                    <div
                      key={ev.id}
                      className="p-4 rounded-xl border border-gray-100 dark:border-[#222433] bg-gray-50/50 dark:bg-[#1c1d28] space-y-2.5 hover:border-blue-200 dark:hover:border-blue-900/40 transition group"
                    >
                      {/* Event Header: Time & Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">
                            {ev.time || "All Day"} {ev.endTime ? `- ${ev.endTime}` : ""}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={meta.badgeVariant} size="sm">
                            {meta.label}
                          </Badge>

                          {ev.isOverdue ? (
                            <Badge variant="rose" size="sm" className="font-extrabold animate-pulse">
                              OVERDUE
                            </Badge>
                          ) : (
                            <Badge variant="gray" size="sm">
                              {ev.statusLabel}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Event Title & Group Info */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                          {ev.title}
                        </h4>
                        {ev.groupName && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-[#9396a8] mt-1 font-medium">
                            <HiUsers className="w-3.5 h-3.5 text-gray-400" />
                            <span>{ev.groupName}</span>
                          </div>
                        )}
                      </div>

                      {/* Panelist Role Highlight (if applicable) */}
                      {ev.panelistRole && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-200/60 dark:border-purple-800/40 w-max">
                          <HiAcademicCap className="w-4 h-4" />
                          <span>Your Role: {ev.panelistRole}</span>
                        </div>
                      )}

                      {/* Details Breakdown */}
                      <div className="pt-2 border-t border-gray-200/50 dark:border-[#262838] text-xs space-y-1 text-gray-600 dark:text-[#9396a8]">
                        {ev.researchTitle && (
                          <p>
                            <span className="font-medium text-gray-400">Research Title:</span>{" "}
                            <span className="text-gray-800 dark:text-gray-200 font-semibold">{ev.researchTitle}</span>
                          </p>
                        )}

                        {ev.chapter && (
                          <p>
                            <span className="font-medium text-gray-400">Chapter / Section:</span>{" "}
                            <span className="text-gray-800 dark:text-gray-200 font-medium">{ev.chapter}</span>
                          </p>
                        )}

                        {ev.description && (
                          <p className="line-clamp-2">
                            <span className="font-medium text-gray-400">Details:</span>{" "}
                            <span>{ev.description}</span>
                          </p>
                        )}

                        {ev.assignedBy && (
                          <p>
                            <span className="font-medium text-gray-400">Assigned By:</span>{" "}
                            <span className="text-gray-800 dark:text-gray-200 font-medium">{ev.assignedBy}</span>
                          </p>
                        )}

                        {ev.venue && (
                          <p className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                            <HiMapPin className="w-3.5 h-3.5" />
                            <span>{ev.venue}</span>
                          </p>
                        )}
                      </div>

                      {/* Navigation Link to Existing Module */}
                      {ev.link && (
                        <div className="pt-2 flex justify-end">
                          <Link
                            to={ev.link}
                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                          >
                            Open Record in Module <HiArrowTopRightOnSquare className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Summary */}
            <div className="mt-auto pt-3 border-t border-gray-100 dark:border-[#222433] flex items-center justify-between text-[11px] text-gray-400 shrink-0">
              <span>View-only institutional schedule</span>
              {effectiveRole === "admin" && (
                <Link to="/admin/scheduling" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  Manage Schedules →
                </Link>
              )}
              {effectiveRole === "student" && (
                <Link to="/research/workspace" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  Research Workspace →
                </Link>
              )}
              {effectiveRole === "adviser" && (
                <Link to="/advisees" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  My Advisees →
                </Link>
              )}
              {effectiveRole === "panelist" && (
                <Link to="/panelist/defendees" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  Panel Defendees →
                </Link>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const AdminMasterCalendar = MasterCalendar;
export default MasterCalendar;
