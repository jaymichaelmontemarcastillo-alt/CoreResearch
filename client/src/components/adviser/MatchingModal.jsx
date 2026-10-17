// src/components/adviser/MatchingModal.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Toast } from "../ui/Toast";
import {
  FileText,
  Search,
  Check,
  ChevronRight,
  ChevronDown,
  Info,
  BookOpen,
  AlertTriangle,
  X,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import adviserMatchingService from "../../services/adviserMatching.service";
import adviserRequestService from "../../services/adviserRequest.service";
import groupService from "../../services/group.service";
import { courseService } from "../../services/course.service";
import { sectionService } from "../../services/section.service";
import { useConfirm } from "../../context/ConfirmContext";

const LOADING_MESSAGES = [
  "Analyzing your research title...",
  "Evaluating research domain & keywords...",
  "Matching faculty adviser specializations...",
  "Calculating semantic compatibility scores...",
  "Preparing recommended advisers...",
];

export const MatchingModal = ({
  isOpen,
  onClose,
  title = "",
  description = "",
  currentUser,
  userProfile,
  declinedAdviserIds = [],
  restoredSession = null,
  onSuccess,
  initialPreviewState = null, // null | 'live' | 'loading' | 'empty' | 'error'
}) => {
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [matches, setMatches] = useState([]);
  const [availableAlternatives, setAvailableAlternatives] = useState([]);
  const [allTopMatchesFull, setAllTopMatchesFull] = useState(false);
  const [activeTab, setActiveTab] = useState("matches"); // 'matches' | 'available'
  const [expandedAdviserId, setExpandedAdviserId] = useState(null);
  const [serviceError, setServiceError] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [toast, setToast] = useState("");

  // UI Interactive States
  const [selectedAdviser, setSelectedAdviser] = useState(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [isFullTitleOpen, setIsFullTitleOpen] = useState(false);
  const [previewState, setPreviewState] = useState(initialPreviewState);

  const loadingIntervalRef = useRef(null);
  const isOpenRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const lastInputRef = useRef("");

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Progressive loading message animation
  useEffect(() => {
    if (isOpen && loading) {
      let index = 0;
      loadingIntervalRef.current = setInterval(() => {
        index = (index + 1) % LOADING_MESSAGES.length;
        setLoadingMessage(LOADING_MESSAGES[index]);
      }, 1800);
    }
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    };
  }, [isOpen, loading]);

  const applyResults = (result) => {
    const recMatches = Array.isArray(result?.matches) ? result.matches : [];
    const recAlternatives = Array.isArray(result?.availableAlternatives)
      ? result.availableAlternatives
      : [];
    const topMatchesAreFull = Boolean(
      result?.allTopMatchesFull ||
      (recMatches.length > 0 &&
        recMatches.every(
          (match) =>
            match.isFull ||
            (match.activeGroupsCount || 0) >= (match.maxCapacity || 5),
        )),
    );

    setMatches(recMatches.slice(0, 5));
    setAvailableAlternatives(recAlternatives);
    setAllTopMatchesFull(topMatchesAreFull);
    setActiveTab(
      recMatches.length === 0 || topMatchesAreFull ? "available" : "matches",
    );
    setServiceError(null);
    setLoading(false);
    hasLoadedRef.current = true;
  };

  const pollForMatchingResults = async (sessionId) => {
    while (isOpenRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      if (!isOpenRef.current) return;

      const session = await adviserMatchingService.getLatestMatchingSession();
      if (!session || (sessionId && session.id !== sessionId)) {
        throw new Error(
          "The matching session could not be restored. Please retry matching.",
        );
      }
      if (session.status === "processing") continue;
      if (session.status === "failed") {
        hasLoadedRef.current = true;
        setServiceError(
          session.statusMessage || "Matching failed. Please retry.",
        );
        setLoading(false);
        return;
      }
      applyResults(session);
      return;
    }
  };

  const runMatching = async (sessionToRestore = null) => {
    if (!title) return;
    setLoading(true);
    setServiceError(null);
    setSelectedAdviser(null);
    try {
      if (sessionToRestore) {
        if (sessionToRestore.status === "processing") {
          setLoadingMessage("Your matching request is still processing...");
          await pollForMatchingResults(sessionToRestore.id);
        } else if (sessionToRestore.status === "failed") {
          hasLoadedRef.current = true;
          setServiceError(
            sessionToRestore.statusMessage || "Matching failed. Please retry.",
          );
          setLoading(false);
        } else {
          applyResults(sessionToRestore);
        }
        return;
      }

      const result = await adviserMatchingService.getRecommendations(
        title,
        description || "",
      );
      if (result.status === "processing") {
        setLoadingMessage("Your matching request is still processing...");
        await pollForMatchingResults(result.sessionId);
      } else if (result.status === "failed") {
        hasLoadedRef.current = true;
        setServiceError(
          result.statusMessage || "Matching failed. Please retry.",
        );
        setLoading(false);
      } else {
        applyResults(result);
      }
    } catch (err) {
      console.error("[MatchingModal] error:", err);
      setServiceError(
        err.message || "Unable to complete adviser matching at this moment.",
      );
      setLoading(false);
    } finally {
      if (isOpenRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    isOpenRef.current = isOpen;
    const inputKey = `${title}\n${description || ""}`;
    if (lastInputRef.current !== inputKey) {
      lastInputRef.current = inputKey;
      hasLoadedRef.current = false;
      setMatches([]);
      setAvailableAlternatives([]);
      setAllTopMatchesFull(false);
      setActiveTab("matches");
      setExpandedAdviserId(null);
      setSelectedAdviser(null);
    }
    if (isOpen && title && !hasLoadedRef.current) {
      runMatching(restoredSession);
    }
  }, [isOpen, title, description, restoredSession]);

  // Filter list by user search query
  const filterList = (list) => {
    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase().trim();
    return list.filter((adv) => {
      const name = (adv.adviserName || adv.fullName || "").toLowerCase();
      const dept = (adv.department || "").toLowerCase();
      const explanation = (adv.explanation || "").toLowerCase();
      const keywords = (adv.matchedKeywords || adv.keywords || []).join(" ").toLowerCase();
      const expertise = (adv.expertise || adv.specialization || []).join(" ").toLowerCase();
      const papers = (adv.publishedWorks || [])
        .map((p) => `${p.title || ""} ${p.abstract || ""}`)
        .join(" ")
        .toLowerCase();
      return (
        name.includes(q) ||
        dept.includes(q) ||
        explanation.includes(q) ||
        keywords.includes(q) ||
        expertise.includes(q) ||
        papers.includes(q)
      );
    });
  };

  const filteredMatches = useMemo(() => filterList(matches), [matches, searchFilter]);
  const filteredAlternatives = useMemo(
    () => filterList(availableAlternatives),
    [availableAlternatives, searchFilter]
  );

  const displayedList = activeTab === "matches" ? filteredMatches : filteredAlternatives;

  // Compute active effective state:
  // If previewState is manually forced: 'live' | 'loading' | 'empty' | 'error'
  // Otherwise computed naturally:
  const effectiveState = previewState
    ? previewState
    : loading
    ? "loading"
    : serviceError
    ? "error"
    : displayedList.length === 0
    ? "empty"
    : "live";

  const handleSelectAdviser = async (adviser) => {
    if (!adviser) return;

    const isConfirmed = await confirm({
      title: "Confirm Adviser Selection",
      message: `Are you sure you want to select ${adviser.adviserName || adviser.fullName} as your preferred faculty mentor?`,
      confirmText: "Select Adviser",
      variant: "primary",
    });
    if (!isConfirmed) return;

    setSubmittingId(adviser.adviserId || adviser.uid);
    try {
      const group = await groupService.getGroupByStudentId(currentUser.uid);
      const allCourses = await courseService.getAllCourses();

      const courseId = group?.courseId || userProfile?.courseId;
      const sectionId = group?.sectionId || userProfile?.sectionId;
      const course = allCourses.find((c) => c.id === courseId);

      let section = null;
      if (courseId && sectionId) {
        const sections = await sectionService.getSectionsByCourseId(courseId);
        section = sections.find((s) => s.id === sectionId);
      }

      const request = await adviserRequestService.createRequest({
        studentId: currentUser.uid,
        studentName: userProfile?.fullName || currentUser.email,
        groupId: group?.id,
        groupName: group?.name,
        courseId: course?.id,
        courseName: course?.code || course?.name,
        sectionId: section?.id,
        sectionName: section?.name,
        researchTitle: title,
        researchDescription: description,
        adviserId: adviser.adviserId || adviser.uid,
        adviserName: adviser.adviserName || adviser.fullName,
        compatibilityScore: adviser.compatibilityScore || adviser.score,
      });

      if (group?.id && title) {
        groupService.updateGroup(group.id, { title }).catch((err) => {
          console.warn("[MatchingModal] error updating group title:", err);
        });
      }

      setToast(`Request successfully sent to ${adviser.adviserName || adviser.fullName}!`);
      if (onSuccess) onSuccess(request);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error("[MatchingModal] select error:", err);
      setToast("Failed to select adviser: " + (err.message || "Unknown error"));
    } finally {
      setSubmittingId(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Container */}
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#222433] shadow-2xl overflow-hidden z-10 transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Notification */}
        {toast && (
          <div className="absolute top-3 right-4 z-50">
            <Toast
              message={toast}
              variant={toast.includes("Failed") ? "error" : "success"}
              onClose={() => setToast("")}
            />
          </div>
        )}

        {/* 1. MODAL HEADER */}
        <div className="px-5 sm:px-6 pt-5 pb-3 flex items-center justify-between gap-3 border-b border-transparent shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Faculty Adviser Matching
            </h2>

            {/* Restored saved match results pill badge */}
            {restoredSession && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                Restored saved match results
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. PROPOSAL INFO BOX */}
        <div className="px-5 sm:px-6 pb-3 shrink-0">
          <div className="rounded-xl border border-gray-200 dark:border-[#2b2d3f] bg-gray-50/70 dark:bg-[#1a1b26] p-3 flex items-start gap-2.5 transition-all">
            <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" strokeWidth={2} />
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                Proposal:
              </span>
              <p
                className={`text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 ${
                  isFullTitleOpen ? "whitespace-normal" : "truncate"
                }`}
              >
                {title || "Research Manuscript Title"}
              </p>
              {isFullTitleOpen && description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 pt-1.5 border-t border-gray-200/50 dark:border-[#2b2d3f]">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsFullTitleOpen(!isFullTitleOpen)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-2 cursor-pointer self-start"
            >
              {isFullTitleOpen ? "Collapse" : "Full title"}
            </button>
          </div>
        </div>

        {/* 3. TABS & FILTER ROW */}
        <div className="px-5 sm:px-6 pb-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-[#222433] shrink-0">
          {/* Left Segmented Tab Control */}
          <div className="inline-flex bg-gray-100 dark:bg-[#1c1d28] p-1 rounded-xl border border-gray-200/60 dark:border-[#2b2d3f] shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("matches")}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === "matches"
                  ? "bg-white dark:bg-[#252836] text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Recommended Matches
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                  activeTab === "matches"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {filteredMatches.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("available")}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === "available"
                  ? "bg-white dark:bg-[#252836] text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Available Faculty
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                  activeTab === "available"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {filteredAlternatives.length}
              </span>
            </button>
          </div>

          {/* Right Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter by name, topic, or paper..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#2b2d3f] rounded-full text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition-all"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 4. MAIN CONTENT AREA (Live Data, Loading, Empty, or Error) */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3.5">
          {/* VERSION 2: LOADING SKELETON STATE */}
          {effectiveState === "loading" && (
            <div className="space-y-3.5">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-200 dark:border-[#2b2d3f] bg-white dark:bg-[#15161e] p-5 space-y-4 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
                      <div className="space-y-2">
                        <div className="h-4 w-44 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                        <div className="h-3 w-28 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="h-8 w-28 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse shrink-0" />
                  </div>

                  <div className="h-12 w-full bg-gray-50 dark:bg-gray-800/60 rounded-xl animate-pulse" />

                  <div className="flex items-center gap-2">
                    <div className="h-6 w-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                    <div className="h-6 w-28 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                    <div className="h-6 w-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VERSION 4: ERROR STATE */}
          {effectiveState === "error" && (
            <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-[#15161e] p-10 sm:p-14 flex flex-col items-center justify-center text-center space-y-3.5 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Unable to load faculty matching results
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                  We encountered a temporary network issue while retrieving adviser compatibility data. Your manuscript draft is safe.
                </p>
              </div>

              <button
                type="button"
                onClick={() => runMatching()}
                className="mt-2 bg-black dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 font-semibold text-xs px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
              >
                Retry loading results
              </button>
            </div>
          )}

          {/* VERSION 3: EMPTY STATE */}
          {effectiveState === "empty" && (
            <div className="rounded-2xl border border-gray-200 dark:border-[#2b2d3f] p-10 sm:p-14 flex flex-col items-center justify-center text-center space-y-3.5 bg-white dark:bg-[#15161e] shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
                <Search className="w-5 h-5 text-gray-400" />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  No matching faculty advisers found
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                  No recommended matches met the minimum threshold for this manuscript title. Browse the Available Faculty tab to select an adviser manually.
                </p>
              </div>

              {availableAlternatives.length > 0 && activeTab === "matches" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("available")}
                  className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
                >
                  View All Available Faculty ({availableAlternatives.length})
                </button>
              )}
            </div>
          )}

          {/* VERSION 1: LIVE DATA STATE */}
          {effectiveState === "live" && (
            <div className="space-y-3.5">
              {displayedList.map((adviser, index) => {
                const adviserId = adviser.adviserId || adviser.uid || adviser.id;
                const score = adviser.compatibilityScore || adviser.score || 0;
                const maxCap = adviser.maxCapacity || adviser.maxAdvisees || 5;
                const activeCount = adviser.activeGroupsCount || adviser.activeAdviseeCount || 0;
                const openSlots = adviser.availableSlots ?? Math.max(0, maxCap - activeCount);
                const isAtCapacity = openSlots <= 0 || adviser.isFull;
                const isSelected = selectedAdviser && (selectedAdviser.adviserId === adviserId || selectedAdviser.uid === adviserId);
                const isExpanded = expandedAdviserId === adviserId;

                const fullName =
                  adviser.adviserName ||
                  adviser.fullName ||
                  adviser.displayName ||
                  "Faculty Member";

                const department = adviser.department || "College of Computer Studies";

                // Generate 2-letter initials
                const initials = fullName
                  .split(" ")
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "FA";

                // Matched tags & all tags
                const matchedTags = adviser.matchedKeywords || adviser.matchedTags || [];
                const allTags = Array.from(
                  new Set([
                    ...matchedTags,
                    ...(adviser.expertise || []),
                    ...(adviser.specialization || []),
                  ])
                );

                const publishedPapers = adviser.publishedWorks || adviser.matchedPublications || [];

                return (
                  <div
                    key={`${adviserId}-${index}`}
                    className={`rounded-xl border bg-white dark:bg-[#15161e] p-4 sm:p-5 space-y-3.5 transition-all shadow-2xs ${
                      isSelected
                        ? "border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20"
                        : "border-gray-200 dark:border-[#2b2d3f] hover:border-gray-300 dark:hover:border-gray-700"
                    }`}
                  >
                    {/* Top Row: Avatar, Name, Badges, and Select Button */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Circular Avatar with Rank Badge */}
                        <div className="relative shrink-0">
                          {adviser.profile_image ? (
                            <img
                              src={adviser.profile_image}
                              alt={fullName}
                              className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-[#15161e] shadow-xs"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                              {initials}
                            </div>
                          )}

                          {/* Black Rank Badge */}
                          <div className="w-4 h-4 rounded-full bg-black text-white text-[9px] font-bold flex items-center justify-center absolute -bottom-0.5 -right-0.5 border border-white dark:border-[#15161e]">
                            #{index + 1}
                          </div>
                        </div>

                        {/* Name & Badges */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                              {fullName}
                            </h3>

                            {/* Match % Pill Badge */}
                            {score > 0 && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                {score}% Match
                              </span>
                            )}

                            {/* Open Slots Pill Badge */}
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                isAtCapacity
                                  ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200/80 dark:border-red-900/40"
                                  : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900/40"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isAtCapacity ? "bg-red-500" : "bg-emerald-500"
                                }`}
                              />
                              {isAtCapacity ? "Capacity Full" : `${openSlots} / ${maxCap} slots open`}
                            </span>
                          </div>

                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {department}
                          </p>
                        </div>
                      </div>

                      {/* Select Action Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedAdviser(adviser)}
                        className={`font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer ${
                          isSelected
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Selected
                          </>
                        ) : (
                          <>
                            Select Adviser <ChevronRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* "Why matched" Callout Box */}
                    <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100/80 dark:border-blue-900/40 rounded-xl p-3 text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <span className="font-bold text-gray-900 dark:text-white">Why matched: </span>
                        {adviser.explanation ? (
                          <span>{adviser.explanation}</span>
                        ) : (
                          <span>
                            Moderate compatibility based on general research domain.
                            {matchedTags.length > 0 && (
                              <span>
                                {" "}
                                Shared focus in{" "}
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {matchedTags.slice(0, 2).join(" & ")}
                                </span>
                                .
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expertise Row with Checkmarks */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="text-gray-400 dark:text-gray-500 font-medium mr-1 shrink-0">
                        Expertise:
                      </span>
                      {allTags.slice(0, 5).map((tag, tIdx) => {
                        const isMatched = matchedTags.includes(tag);
                        return isMatched ? (
                          <span
                            key={tIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shadow-2xs"
                          >
                            <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            {tag}
                          </span>
                        ) : (
                          <span
                            key={tIdx}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-50 dark:bg-[#1c1d28] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2b2d3f]"
                          >
                            {tag}
                          </span>
                        );
                      })}
                    </div>

                    {/* Bottom Evidence Accordion Row */}
                    <div className="pt-2 border-t border-gray-100 dark:border-[#222433] flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAdviserId(isExpanded ? null : adviserId)
                        }
                        className="inline-flex items-center gap-1.5 font-medium hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                        Published Research Evidence ({publishedPapers.length} paper
                        {publishedPapers.length === 1 ? "" : "s"})
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAdviserId(isExpanded ? null : adviserId)
                        }
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs font-medium cursor-pointer"
                      >
                        Inspect titles & abstracts
                      </button>
                    </div>

                    {/* Expandable Published Papers List */}
                    {isExpanded && publishedPapers.length > 0 && (
                      <div className="pt-2 space-y-2 max-h-48 overflow-y-auto">
                        {publishedPapers.map((paper, pIdx) => (
                          <div
                            key={pIdx}
                            className="p-3 rounded-lg bg-gray-50 dark:bg-[#1c1d28] border border-gray-200/70 dark:border-[#2b2d3f] space-y-1 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white leading-snug">
                                {paper.title}
                              </h4>
                              {paper.publicationYear && (
                                <span className="text-[10px] text-gray-400 shrink-0">
                                  {paper.publicationYear}
                                </span>
                              )}
                            </div>
                            {paper.abstract && (
                              <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2">
                                {paper.abstract}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. MODAL FOOTER */}
        <div className="px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-[#222433] bg-white dark:bg-[#15161e] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Helper caption with green dot */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Compatibility scores reflect NLP topic overlap; verify advising slot capacity before requesting.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-4 py-2 font-medium cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedAdviser || submittingId !== null}
              onClick={() => selectedAdviser && handleSelectAdviser(selectedAdviser)}
              className={`text-xs font-semibold px-5 py-2.5 rounded-xl transition-all ${
                selectedAdviser
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                  : "bg-gray-100 dark:bg-[#2b2d3f] text-gray-400 dark:text-gray-500 cursor-not-allowed"
              }`}
            >
              {submittingId ? "Sending..." : "Confirm Adviser Selection"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MatchingModal;
