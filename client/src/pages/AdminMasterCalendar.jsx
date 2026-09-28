// src/pages/AdminMasterCalendar.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
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
  HiPlus,
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

  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(
    today.toISOString().split("T")[0]
  );
  const [viewMode, setViewMode] = useState("month"); // 'month' | 'week'

  // Data State
  const [events, setEvents] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [emptyReason, setEmptyReason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Custom Events State (Phase 6 - Persist via localStorage)
  const [customEvents, setCustomEvents] = useState(() => {
    const saved = localStorage.getItem("customStudentEvents");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("customStudentEvents", JSON.stringify(customEvents));
  }, [customEvents]);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [conflictWarning, setConflictWarning] = useState("");
  const [eventFormData, setEventFormData] = useState({
    title: "",
    eventType: "OTHER",
    date: "",
    startTime: "09:00 AM",
    endTime: "10:30 AM",
    description: "",
  });

  // Phase 9: Conflict Detection
  useEffect(() => {
    if (eventFormData.date && eventFormData.startTime) {
      const dayEvents = [...events, ...customEvents].filter(e => e.date === eventFormData.date && e.id !== editingEventId);
      const hasOverlap = dayEvents.some(e => (e.time === eventFormData.startTime || e.startTime === eventFormData.startTime));
      if (hasOverlap) {
        setConflictWarning("Warning: There is already an event scheduled at this exact time.");
      } else {
        setConflictWarning("");
      }
    } else {
      setConflictWarning("");
    }
  }, [eventFormData.date, eventFormData.startTime, events, customEvents, editingEventId]);

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
    const combined = [...events, ...customEvents];
    return combined.filter((ev) => {
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
  }, [events, customEvents, selectedType, onlyOverdue, searchQuery]);

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

  // Generate days for the selected week (Sunday to Saturday)
  const weekDays = useMemo(() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    const diff = d.getDate() - day;
    const startOfWeek = new Date(d);
    startOfWeek.setDate(diff);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(startOfWeek);
      nextDate.setDate(startOfWeek.getDate() + i);
      week.push({
        dateString: nextDate.toISOString().split("T")[0],
        dayNumber: nextDate.getDate(),
        dayName: DAY_NAMES[i],
        isToday: nextDate.toISOString().split("T")[0] === today.toISOString().split("T")[0]
      });
    }
    return week;
  }, [selectedDate, today]);

  // Time rows for Week View (7 AM to 12 AM)
  const TIME_HOURS = Array.from({ length: 18 }, (_, i) => i + 7);

  const formatHour = (h) => {
    const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour} ${ampm}`;
  };

  // Helper to parse time and position events in Week View
  const getEventStyle = (ev) => {
    // Basic parser. Assumes ev.time is like "09:00" or "09:00 AM" or ev.startTime exists.
    let h = 9; 
    let m = 0;
    
    // If there's an actual time string
    let timeStr = ev.startTime || ev.time;
    if (timeStr && typeof timeStr === 'string') {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/);
      if (match) {
        let hr = parseInt(match[1]);
        m = parseInt(match[2]);
        const modifier = match[3]?.toUpperCase();
        if (modifier === 'PM' && hr < 12) hr += 12;
        if (modifier === 'AM' && hr === 12) hr = 0;
        h = hr;
      }
    } else {
      return { display: 'none' }; // If all-day or no time, we can hide or place in all-day section.
    }

    // Default duration 1.5 hours if end time not provided
    let durationHours = 1.5; 
    if (ev.endTime && typeof ev.endTime === 'string') {
      const matchE = ev.endTime.match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/);
      if (matchE) {
        let eHr = parseInt(matchE[1]);
        let eMin = parseInt(matchE[2]);
        const eMod = matchE[3]?.toUpperCase();
        if (eMod === 'PM' && eHr < 12) eHr += 12;
        if (eMod === 'AM' && eHr === 12) eHr = 0;
        durationHours = (eHr + eMin / 60) - (h + m / 60);
        if (durationHours <= 0) durationHours = 1.5;
      }
    }

    // Week view starts at 7 AM (index 0)
    const topPx = (h - 7) * 60 + (m); // 60px per hour
    const heightPx = Math.max(30, durationHours * 60);

    if (h < 7 || h > 24) {
      // Outside viewable time block, clamp it or hide it
      return { top: 0, height: '30px', display: 'none' };
    }

    return {
      top: `${topPx}px`,
      height: `${heightPx}px`,
      minHeight: '30px'
    };
  };

  // Current Month Summary Metrics
  const monthMetrics = useMemo(() => {
    const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
    const allCombined = [...events, ...customEvents];
    const monthEvs = allCombined.filter((e) => e.date.startsWith(currentMonthPrefix));

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
      case "MEETING":
        return {
          label: "Meeting",
          badgeVariant: "cyan",
          dotColor: "bg-cyan-500",
          pillBg: "bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/40",
          icon: <HiUsers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />,
        };
      case "OTHER":
        return {
          label: "Activity",
          badgeVariant: "fuchsia",
          dotColor: "bg-fuchsia-500",
          pillBg: "bg-fuchsia-100 dark:bg-fuchsia-950/50 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800/40",
          icon: <HiCalendarDays className="w-3.5 h-3.5 text-fuchsia-600 dark:text-fuchsia-400" />,
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
      {/* 1.1 STUDENT NO-GROUP NOTICE (IF APPLICABLE)              */}
      {/* ========================================================= */}
      {effectiveRole === "student" && emptyReason === "NO_GROUP" && (
        <Card className="!rounded-[15px] p-8 sm:p-10 border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 text-center flex flex-col items-center justify-center space-y-3">
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
        <Card className="!rounded-[15px] p-4 sm:p-5 border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-sm">
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

        <Card className="!rounded-[15px] p-4 sm:p-5 border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-sm">
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

        <Card className="!rounded-[15px] p-4 sm:p-5 border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-sm">
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
          className={`!rounded-[15px] p-4 sm:p-5 border cursor-pointer transition shadow-sm ${
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
      <Card className="!rounded-[15px] overflow-hidden p-4 sm:p-5 border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Month Switcher / View Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={viewMode === 'month' ? handlePrevMonth : () => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 7);
                  setSelectedDate(d.toISOString().split("T")[0]);
                  setCurrentMonth(d.getMonth());
                  setCurrentYear(d.getFullYear());
                }}
                className="p-2 rounded-xl border border-gray-200 dark:border-[#262838] hover:bg-gray-100 dark:hover:bg-[#1c1d28] text-gray-700 dark:text-gray-200 transition"
                title="Previous"
              >
                <HiChevronLeft className="w-4 h-4" />
              </button>

              <div className="min-w-[180px] text-center">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {viewMode === "month" 
                    ? `${MONTH_NAMES[currentMonth]} ${currentYear}`
                    : `Week of ${new Date(weekDays[0].dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                  }
                </h2>
              </div>

              <button
                type="button"
                onClick={viewMode === 'month' ? handleNextMonth : () => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 7);
                  setSelectedDate(d.toISOString().split("T")[0]);
                  setCurrentMonth(d.getMonth());
                  setCurrentYear(d.getFullYear());
                }}
                className="p-2 rounded-xl border border-gray-200 dark:border-[#262838] hover:bg-gray-100 dark:hover:bg-[#1c1d28] text-gray-700 dark:text-gray-200 transition"
                title="Next"
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

            <div className="flex bg-gray-100 dark:bg-[#1c1d28] p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                  viewMode === "month"
                    ? "bg-white dark:bg-[#262838] shadow-sm text-gray-900 dark:text-white"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                  viewMode === "week"
                    ? "bg-white dark:bg-[#262838] shadow-sm text-gray-900 dark:text-white"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Week
              </button>
            </div>
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
        <div className="flex items-center gap-1.5 flex-wrap pt-4 mt-2 border-t border-gray-100 dark:border-[#222433] -mx-4 sm:-mx-5 px-4 sm:px-5">
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
            { key: "MEETING", label: "Meetings" },
            { key: "OTHER", label: "Other" },
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
          <Card className="!rounded-[15px] p-4 sm:p-6 border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-sm">
            {viewMode === "month" ? (
              <>
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
                      className={`group aspect-square p-1.5 sm:p-2 rounded-[15px] border flex flex-col transition cursor-pointer relative overflow-hidden ${
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

                      {/* Phase 3: Hover Preview */}
                      {dayEvents.length > 0 && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-[105%] mb-2 hidden group-hover:block w-48 p-3 bg-white dark:bg-[#1a1d29] shadow-xl rounded-xl border border-gray-200 dark:border-[#222433] z-50 pointer-events-none">
                          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            {new Date(cell.dateString).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                          </div>
                          <div className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                            {dayEvents.length} {dayEvents.length === 1 ? 'Event' : 'Events'}
                          </div>
                          <ul className="space-y-1.5">
                            {dayEvents.slice(0, 5).map(ev => {
                              const meta = getEventTypeMeta(ev.eventType);
                              return (
                                <li key={ev.id} className="flex items-start gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                                  <span className={`w-1.5 h-1.5 mt-1 rounded-full shrink-0 ${meta.dotColor}`}></span>
                                  <span className="truncate flex-1 font-medium">{ev.title}</span>
                                </li>
                              );
                            })}
                            {dayEvents.length > 5 && (
                              <li className="text-[10px] text-gray-400 font-bold pl-3">
                                +{dayEvents.length - 5} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
              </>
            ) : (
              /* ======================================= */
              /* WEEK VIEW LAYOUT                        */
              /* ======================================= */
              <div className="flex flex-col h-[650px] overflow-hidden overflow-x-auto">
                <div className="min-w-[700px] flex flex-col h-full">
                {/* Week Header */}
                <div className="flex border-b border-gray-200 dark:border-[#222433]">
                  <div className="w-16 shrink-0 border-r border-gray-200 dark:border-[#222433]"></div>
                  <div className="flex-1 grid grid-cols-7">
                    {weekDays.map((wd) => {
                      const isSelected = selectedDate === wd.dateString;
                      return (
                        <div
                          key={wd.dateString}
                          onClick={() => setSelectedDate(wd.dateString)}
                          className={`text-center py-3 cursor-pointer transition border-b-2 ${
                            isSelected ? "border-blue-500 bg-blue-50/10 dark:bg-blue-900/10" : "border-transparent hover:bg-gray-50 dark:hover:bg-[#1c1d28]"
                          }`}
                        >
                          <div className={`text-[10px] font-bold uppercase tracking-widest ${wd.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {wd.dayName}
                          </div>
                          <div className={`text-lg font-extrabold mt-0.5 ${wd.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                            {wd.dayNumber}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Time Grid Scrollable */}
                <div className="flex-1 overflow-y-auto relative bg-gray-50/30 dark:bg-[#15161e]">
                  <div className="flex min-h-max relative">
                    {/* Time Axis */}
                    <div className="w-16 shrink-0 bg-white dark:bg-[#15161e] border-r border-gray-200 dark:border-[#222433] z-10 sticky left-0">
                      {TIME_HOURS.map((h, i) => (
                        <div key={h} className="h-[60px] border-b border-gray-100 dark:border-[#222433]/50 flex items-center justify-center">
                          <span className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-[#6b6f84]">
                            {formatHour(h)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Columns */}
                    <div className="flex-1 grid grid-cols-7 relative">
                      {/* Background lines */}
                      <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                        {weekDays.map((_, i) => (
                          <div key={i} className="border-r border-gray-100 dark:border-[#222433] h-full" />
                        ))}
                      </div>
                      
                      {TIME_HOURS.map((h, i) => (
                        <div key={h} className="absolute w-full h-[60px] border-b border-gray-100 dark:border-[#222433]/50 pointer-events-none" style={{ top: `${i * 60}px` }} />
                      ))}

                      {/* Event Placement */}
                      {weekDays.map((wd) => {
                        const dayEvents = eventsByDate.get(wd.dateString) || [];
                        return (
                          <div key={wd.dateString} className="relative col-span-1 border-r border-gray-100 dark:border-[#222433]">
                            {dayEvents.map(ev => {
                              const meta = getEventTypeMeta(ev.eventType);
                              const style = getEventStyle(ev);
                              if (style.display === 'none') return null;

                              return (
                                <div
                                  key={ev.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEventDetails(ev);
                                  }}
                                  className={`absolute inset-x-1 rounded-md p-1.5 overflow-hidden border shadow-sm flex flex-col group cursor-pointer transition hover:z-20 hover:scale-[1.02] ${meta.pillBg}`}
                                  style={style}
                                  title={`${ev.title}\n${ev.time || ''}`}
                                >
                                  <div className="text-[10px] font-bold truncate mb-0.5">{ev.title}</div>
                                  <div className="text-[9px] font-medium opacity-80">{ev.time || ev.startTime}</div>
                                </div>
                              );
                            })}

                            {/* Phase 6: Empty Slot click listener */}
                            {effectiveRole === "student" && (
                              <div className="absolute inset-0 z-0" onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const y = e.clientY - rect.top;
                                const h = Math.floor(y / 60) + 7;
                                setEventFormData({
                                  ...eventFormData,
                                  date: wd.dateString,
                                  startTime: `${h % 12 || 12}:00 ${h >= 12 && h < 24 ? 'PM' : 'AM'}`,
                                  endTime: `${(h + 1) % 12 || 12}:00 ${h + 1 >= 12 && h + 1 < 24 ? 'PM' : 'AM'}`
                                });
                                setIsEventModalOpen(true);
                              }}></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT: SELECTED DATE EVENTS PANEL (xl:col-span-4) */}
        <div className="xl:col-span-4">
          <Card className="!rounded-[15px] p-5 sm:p-6 border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-sm flex flex-col h-full space-y-4">
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

              <div className="flex items-center justify-between mt-1">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {formattedSelectedDateText}
                </h3>
                {effectiveRole === "student" && (
                  <Button
                    size="sm"
                    variant="primary"
                    className="text-xs py-1 px-2 shrink-0 h-auto"
                    onClick={() => {
                      setEventFormData({
                        ...eventFormData,
                        date: selectedDate,
                        startTime: "09:00 AM",
                        endTime: "10:00 AM"
                      });
                      setIsEventModalOpen(true);
                    }}
                  >
                    <HiPlus className="w-3.5 h-3.5 mr-1" /> Add Event
                  </Button>
                )}
              </div>
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
                      onClick={() => setSelectedEventDetails(ev)}
                      className="cursor-pointer p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-[#222433] bg-gray-50/50 dark:bg-[#1c1d28] space-y-2 sm:space-y-2.5 hover:border-blue-200 dark:hover:border-blue-900/40 transition group"
                    >
                      {/* Event Header: Time & Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] sm:text-xs font-mono font-bold text-gray-700 dark:text-gray-300">
                            {ev.time || "All Day"} {ev.endTime ? `- ${ev.endTime}` : ""}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                          <Badge variant={meta.badgeVariant} size="sm" className="text-[9px] sm:text-[10px] px-1.5 py-0 sm:px-2 sm:py-0.5">
                            {meta.label}
                          </Badge>

                          {ev.isOverdue ? (
                            <Badge variant="rose" size="sm" className="text-[9px] sm:text-[10px] px-1.5 py-0 sm:px-2 sm:py-0.5 font-extrabold animate-pulse">
                              OVERDUE
                            </Badge>
                          ) : (
                            <Badge variant="gray" size="sm" className="text-[9px] sm:text-[10px] px-1.5 py-0 sm:px-2 sm:py-0.5">
                              {ev.statusLabel}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Event Title & Group Info */}
                      <div>
                        <h4 className="text-[13px] sm:text-sm font-bold text-gray-900 dark:text-white leading-snug">
                          {ev.title}
                        </h4>
                        {ev.groupName && (
                          <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-gray-500 dark:text-[#9396a8] mt-0.5 sm:mt-1 font-medium">
                            <HiUsers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{ev.groupName}</span>
                          </div>
                        )}
                      </div>

                      {/* Panelist Role Highlight (if applicable) */}
                      {ev.panelistRole && (
                        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-purple-200/60 dark:border-purple-800/40 w-max">
                          <HiAcademicCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>Role: {ev.panelistRole}</span>
                        </div>
                      )}

                      {/* Details Breakdown */}
                      <div className="pt-2 border-t border-gray-200/50 dark:border-[#262838] text-[11px] sm:text-xs space-y-1 text-gray-600 dark:text-[#9396a8]">
                        {ev.researchTitle && (
                          <p className="line-clamp-2">
                            <span className="font-medium text-gray-400">Research:</span>{" "}
                            <span className="text-gray-800 dark:text-gray-200 font-semibold">{ev.researchTitle}</span>
                          </p>
                        )}

                        {ev.chapter && (
                          <p className="truncate">
                            <span className="font-medium text-gray-400">Chapter:</span>{" "}
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
                          <p className="truncate">
                            <span className="font-medium text-gray-400">By:</span>{" "}
                            <span className="text-gray-800 dark:text-gray-200 font-medium">{ev.assignedBy}</span>
                          </p>
                        )}

                        {ev.venue && (
                          <p className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium truncate">
                            <HiMapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                            <span>{ev.venue}</span>
                          </p>
                        )}
                      </div>

                      {/* Navigation Link to Existing Module */}
                      {ev.link && (
                        <div className="pt-2 flex justify-end">
                          <Link
                            to={ev.link}
                            className="text-[11px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                          >
                            Open Module <HiArrowTopRightOnSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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

      {/* Phase 8: Event Details Modal */}
      <Modal
        isOpen={!!selectedEventDetails}
        onClose={() => setSelectedEventDetails(null)}
        title="Event Details"
      >
        {selectedEventDetails && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold text-blue-600 mb-1">
                {selectedEventDetails.statusLabel || selectedEventDetails.eventType}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {selectedEventDetails.title}
              </h3>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <p><strong>Date:</strong> {selectedEventDetails.date}</p>
              <p><strong>Time:</strong> {selectedEventDetails.time || "All Day"} {selectedEventDetails.endTime ? `- ${selectedEventDetails.endTime}` : ""}</p>
              {selectedEventDetails.description && (
                <p><strong>Details:</strong> {selectedEventDetails.description}</p>
              )}
              {selectedEventDetails.venue && (
                <p><strong>Venue:</strong> {selectedEventDetails.venue}</p>
              )}
              {selectedEventDetails.assignedBy && (
                <p><strong>Assigned By:</strong> {selectedEventDetails.assignedBy}</p>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-gray-100 dark:border-[#222433]">
              <Button variant="outline" onClick={() => setSelectedEventDetails(null)}>
                Close
              </Button>
              
              {/* Phase 7: Edit / Delete for custom events */}
              {selectedEventDetails.isCustom && effectiveRole === "student" ? (
                <>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setCustomEvents(prev => prev.filter(e => e.id !== selectedEventDetails.id));
                      setSelectedEventDetails(null);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    Delete
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setEditingEventId(selectedEventDetails.id);
                      setEventFormData({
                        title: selectedEventDetails.title,
                        eventType: selectedEventDetails.eventType,
                        date: selectedEventDetails.date,
                        startTime: selectedEventDetails.startTime || "",
                        endTime: selectedEventDetails.endTime || "",
                        description: selectedEventDetails.description || ""
                      });
                      setSelectedEventDetails(null);
                      setIsEventModalOpen(true);
                    }}
                  >
                    Edit Event
                  </Button>
                </>
              ) : selectedEventDetails.link ? (
                <Link to={selectedEventDetails.link}>
                  <Button variant="primary">
                    Open Module →
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </Modal>

      {/* Phase 6: Event Creation Modal */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title="Schedule Event"
      >
        <div className="space-y-4">
          {conflictWarning && (
            <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-2.5 text-xs font-semibold rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-2">
              <HiExclamationTriangle className="w-4 h-4 shrink-0" />
              {conflictWarning}
            </div>
          )}
          <Input
            label="Event Title"
            placeholder="e.g. Group Meeting, Writing Session"
            value={eventFormData.title}
            onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Event Type
              </label>
              <select
                className="w-full bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={eventFormData.eventType}
                onChange={(e) => setEventFormData({ ...eventFormData, eventType: e.target.value })}
              >
                <option value="MEETING">Meeting</option>
                <option value="CONSULTATION">Consultation</option>
                <option value="TASK">Deadline</option>
                <option value="OTHER">Other Activity</option>
              </select>
            </div>
            <Input
              label="Date"
              type="date"
              value={eventFormData.date}
              onChange={(e) => setEventFormData({ ...eventFormData, date: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              placeholder="e.g. 09:00 AM"
              value={eventFormData.startTime}
              onChange={(e) => setEventFormData({ ...eventFormData, startTime: e.target.value })}
            />
            <Input
              label="End Time"
              placeholder="e.g. 10:30 AM"
              value={eventFormData.endTime}
              onChange={(e) => setEventFormData({ ...eventFormData, endTime: e.target.value })}
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!eventFormData.title || !eventFormData.date) return;
                
                if (editingEventId) {
                  setCustomEvents(prev => prev.map(e => e.id === editingEventId ? {
                    ...e,
                    title: eventFormData.title,
                    eventType: eventFormData.eventType,
                    date: eventFormData.date,
                    time: eventFormData.startTime,
                    startTime: eventFormData.startTime,
                    endTime: eventFormData.endTime,
                    description: eventFormData.description
                  } : e));
                  setEditingEventId(null);
                } else {
                  const newEvent = {
                    id: `custom_${Date.now()}`,
                    sourceType: 'custom',
                    sourceId: `custom_${Date.now()}`,
                    eventType: eventFormData.eventType,
                    title: eventFormData.title,
                    date: eventFormData.date,
                    time: eventFormData.startTime,
                    startTime: eventFormData.startTime,
                    endTime: eventFormData.endTime,
                    description: eventFormData.description,
                    groupName: groupInfo?.name || "My Group",
                    groupId: groupInfo?.id,
                    status: "scheduled",
                    statusLabel: "Scheduled",
                    isOverdue: false,
                    assignedBy: userProfile?.firstName || "Student",
                    isCustom: true // Marker for Phase 7
                  };
                  setCustomEvents((prev) => [...prev, newEvent]);
                }
                
                setIsEventModalOpen(false);
                setEventFormData({ ...eventFormData, title: "", description: "" });
              }}
            >
              Save Event
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export const AdminMasterCalendar = MasterCalendar;
export default MasterCalendar;
