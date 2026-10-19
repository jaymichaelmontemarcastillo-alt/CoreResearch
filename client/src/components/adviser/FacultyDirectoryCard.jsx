// src/components/adviser/FacultyDirectoryCard.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Mail, SquarePen, MoreVertical, Copy, Check, Eye, Tag, Users } from 'lucide-react';

/**
 * Format department names cleanly (e.g. "Department of Information Technology" -> "Information Technology")
 */
export const formatDepartmentName = (dept) => {
  if (!dept) return 'Computer Studies';
  return dept.replace(/^Department of\s+/i, '').trim();
};

/**
 * Select a Google Classroom-style calm academic banner palette based on department or card index
 */
export const getFacultyBannerTheme = (department = '', index = 0) => {
  const dept = (department || '').toLowerCase();

  if (dept.includes('computer science') || dept.includes('cs')) {
    return {
      gradient: 'from-[#1a73e8] to-[#1557b0]', // Classic Google Classroom Blue
      accentColor: '#1a73e8',
      initialBg: 'bg-[#1557b0]',
    };
  }
  if (dept.includes('information technology') || dept.includes('it')) {
    return {
      gradient: 'from-[#0d9488] to-[#115e59]', // Deep Teal / Pine
      accentColor: '#0d9488',
      initialBg: 'bg-[#0f766e]',
    };
  }
  if (dept.includes('information systems') || dept.includes('is')) {
    return {
      gradient: 'from-[#4f46e5] to-[#3730a3]', // Indigo / Slate Royal
      accentColor: '#4f46e5',
      initialBg: 'bg-[#4338ca]',
    };
  }

  const palettes = [
    { gradient: 'from-[#1e40af] to-[#172554]', accentColor: '#1e40af', initialBg: 'bg-[#1e40af]' },
    { gradient: 'from-[#047857] to-[#064e3b]', accentColor: '#047857', initialBg: 'bg-[#047857]' },
    { gradient: 'from-[#475569] to-[#1e293b]', accentColor: '#475569', initialBg: 'bg-[#475569]' },
    { gradient: 'from-[#7c3aed] to-[#5b21b6]', accentColor: '#7c3aed', initialBg: 'bg-[#6d28d9]' },
  ];
  return palettes[index % palettes.length];
};

export const FacultyDirectoryCard = ({
  adviser,
  index = 0,
  onManageProfile,
  onViewProfile,
  onShowToast,
  mode = 'admin', // 'admin' | 'directory'
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Derived values
  const fullName =
    adviser.fullName ||
    adviser.displayName ||
    `${adviser.first_name || ''} ${adviser.last_name || ''}`.trim() ||
    'Faculty Member';

  const hasCustomRank =
    adviser.academicRank &&
    adviser.academicRank.toLowerCase().trim() !== 'assistant professor';
  const cleanDepartment = formatDepartmentName(adviser.department);
  const subtitleText = hasCustomRank ? `${adviser.academicRank} • ${cleanDepartment}` : cleanDepartment;
  const theme = getFacultyBannerTheme(adviser.department, index);

  // Workload computations
  const adviserLimit = adviser.maxCapacity || adviser.maxAdvisees || 5;
  const activeCount = adviser.activeAdviseeCount || 0;
  const percent = Math.min(100, Math.round((activeCount / adviserLimit) * 100));
  const isAtCapacity = activeCount >= adviserLimit;
  const isNearCapacity = !isAtCapacity && percent >= 80;
  const remainingSlots = Math.max(0, adviserLimit - activeCount);

  // Semantic Progress Bar Color
  // Available (< 80%): Emerald/Teal (#0d9488)
  // Near Capacity (80%–99%): Amber (#d97706)
  // Full (100%): Rose/Red (#dc2626)
  const progressBgClass = isAtCapacity
    ? 'bg-[#dc2626]'
    : isNearCapacity
    ? 'bg-[#d97706]'
    : 'bg-[#0d9488]';

  // Research expertise tags
  const expertiseTags =
    adviser.expertise || adviser.selectedExpertise || adviser.allExpertise || [];
  const visibleTags = expertiseTags.slice(0, 2);
  const extraTagsCount = Math.max(0, expertiseTags.length - 2);
  const remainingTags = expertiseTags.slice(2);

  // Initial letter for fallback avatar
  const initialLetter = fullName.charAt(0).toUpperCase() || 'F';
  const employeeId = adviser.studentIdOrEmployeeId || adviser.uid?.slice(0, 8) || 'FACULTY';

  // Handle email button click
  const handleEmailClick = (e) => {
    e.stopPropagation();
    if (!adviser.email) {
      if (onShowToast) onShowToast('No email registered for this adviser.', 'error');
      return;
    }

    navigator.clipboard?.writeText(adviser.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);

    if (onShowToast) {
      onShowToast(`Copied ${adviser.email} to clipboard!`, 'success');
    }

    // Open mail client
    window.location.href = `mailto:${adviser.email}`;
  };

  // Handle copy Adviser ID
  const handleCopyId = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(employeeId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    setIsMenuOpen(false);

    if (onShowToast) {
      onShowToast(`Copied Adviser ID (${employeeId}) to clipboard!`, 'success');
    }
  };

  return (
    <div
      className="group relative flex flex-col justify-between rounded-[12px] border border-[#dadce0] dark:border-[#2b2d3f] bg-white dark:bg-[#15161e] overflow-hidden transition-all duration-200 ease-out hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
      style={{ minHeight: '320px' }}
    >
      {/* 1. TOP COLORED BANNER (Google Classroom Layout) */}
      <div
        className={`relative h-[100px] w-full bg-gradient-to-r ${theme.gradient} px-5 pt-4 pb-3 flex flex-col justify-start overflow-visible select-none`}
      >
        {/* Subtle geometric pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 85% 20%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)',
          }}
        />

        {/* Primary Text in Header Banner */}
        <div className="relative z-10 pr-2">
          {/* Faculty Name: Prominent bold white title (18px / 1.15rem, font-weight 600, single-line truncation) */}
          <h3
            className="text-[18px] font-semibold text-white tracking-tight leading-snug truncate drop-shadow-xs"
            title={fullName}
          >
            {fullName}
          </h3>

          {/* Department / Subtitle: Minimized compact muted subtitle (13px, color rgba(255,255,255,0.88)) */}
          <p
            className="text-[13px] text-white/90 font-medium truncate mt-0.5 tracking-normal"
            title={subtitleText}
          >
            {subtitleText}
          </p>
        </div>

        {/* 2. PROFILE AVATAR: Left semi-centered vertically straddling the banner/body boundary */}
        <div className="absolute left-5 -bottom-[34px] z-20">
          <div className="w-[68px] h-[68px] rounded-full border-[3px] border-white dark:border-[#15161e] shadow-[0_2px_6px_rgba(0,0,0,0.12)] overflow-hidden bg-white dark:bg-[#1c1d28] flex items-center justify-center">
            {adviser.profile_image && !imgError ? (
              <img
                src={adviser.profile_image}
                alt={fullName}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div
                className={`w-full h-full ${theme.initialBg} flex items-center justify-center text-white font-bold text-2xl select-none`}
              >
                {initialLetter}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. CARD BODY: Highlighted Advisee Workload & Minimized Metadata */}
      <div className="flex-1 bg-white dark:bg-[#15161e] px-5 pt-11 pb-4 flex flex-col justify-between space-y-4">
        {/* Advisee Workload Section (Primary Focal Point) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Advisee Workload
            </span>
            <span className="font-bold text-gray-900 dark:text-white tabular-nums">
              {activeCount} / {adviserLimit} groups
            </span>
          </div>

          {/* Semantic slim progress bar (height: 8px, rounded-full, track: #f1f3f4) */}
          <div className="w-full h-2 rounded-full bg-[#f1f3f4] dark:bg-[#2b2d3f] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${progressBgClass}`}
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* Concise helper caption below (12px, #5f6368) */}
          <div className="text-[12px] font-normal">
            {isAtCapacity ? (
              <span className="text-[#dc2626] font-medium">
                At maximum advising capacity
              </span>
            ) : isNearCapacity ? (
              <span className="text-[#d97706] font-medium">
                {remainingSlots} advising slot{remainingSlots === 1 ? '' : 's'} remaining
              </span>
            ) : (
              <span className="text-[#5f6368] dark:text-[#9aa0a6]">
                {remainingSlots} advising slot{remainingSlots === 1 ? '' : 's'} available
              </span>
            )}
          </div>
        </div>

        {/* Minimized Research Expertise (Locked to single line, at most 2 chips + '+N more' badge) */}
        <div className="pt-0.5">
          {visibleTags.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
              {visibleTags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#f8f9fa] dark:bg-[#1c1d28] text-[#4b5563] dark:text-[#9ca3af] border border-[#e5e7eb] dark:border-[#2b2d3f] truncate max-w-[130px]"
                  title={tag}
                >
                  {tag}
                </span>
              ))}

              {extraTagsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTagsModal(true)}
                  className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#f1f3f4] dark:bg-[#222433] text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#e8eaed] dark:hover:bg-[#2b2d3f] border border-[#dadce0] dark:border-[#2b2d3f] transition-colors shrink-0 cursor-pointer"
                  title={`Click to view ${extraTagsCount} more: ${remainingTags.join(', ')}`}
                >
                  +{extraTagsCount} more
                </button>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-gray-400 dark:text-gray-500 italic">
              No expertise tags listed
            </div>
          )}
        </div>
      </div>

      {/* 4. GOOGLE CLASSROOM-STYLE BOTTOM FOOTER & ACTION ICONS */}
      <div className="relative border-t border-[#e5e7eb] dark:border-[#2b2d3f] px-4 py-2 min-h-[48px] h-12 flex items-center justify-end bg-white dark:bg-[#15161e]">
        {/* Clean Black/Dark-Charcoal Icon Buttons */}
        <div className="flex items-center gap-1">
          {/* Action 1: Copy/Send Email Icon */}
          <button
            type="button"
            onClick={handleEmailClick}
            disabled={!adviser.email}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-150 ${
              adviser.email
                ? 'text-[#3c4043] dark:text-[#dadce0] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:bg-black/[0.12] cursor-pointer'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-40'
            }`}
            title={
              adviser.email
                ? copiedEmail
                  ? 'Copied to clipboard!'
                  : `Email: ${adviser.email} (Click to copy & mail)`
                : 'No email registered'
            }
            aria-label="Email adviser"
          >
            {copiedEmail ? (
              <Check className="w-[18px] h-[18px] text-[#0d9488]" />
            ) : (
              <Mail className="w-[18px] h-[18px]" strokeWidth={2} />
            )}
          </button>

          {/* Action 2: Manage Profile / Edit Adviser Icon (or View Profile in directory mode) */}
          {mode === 'admin' && onManageProfile ? (
            <button
              type="button"
              onClick={() => onManageProfile(adviser)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#3c4043] dark:text-[#dadce0] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:bg-black/[0.12] transition-colors duration-150 cursor-pointer"
              title="Manage Profile"
              aria-label="Manage Profile"
            >
              <SquarePen className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
          ) : onViewProfile ? (
            <button
              type="button"
              onClick={() => onViewProfile(adviser)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#3c4043] dark:text-[#dadce0] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:bg-black/[0.12] transition-colors duration-150 cursor-pointer"
              title="View Profile & Published Works"
              aria-label="View Profile"
            >
              <Eye className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
          ) : null}

          {/* Action 3: More Actions Overflow Icon */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#3c4043] dark:text-[#dadce0] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:bg-black/[0.12] transition-colors duration-150 cursor-pointer"
              title="More actions"
              aria-label="More actions"
            >
              <MoreVertical className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>

            {/* Overflow Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 bottom-full mb-1.5 w-56 rounded-xl bg-white dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] shadow-lg py-1.5 z-30 text-xs">
                {/* Copy Adviser ID */}
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  {copiedId ? (
                    <Check className="w-4 h-4 text-[#0d9488]" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="truncate">
                    Copy ID: <span className="font-mono text-gray-500">{employeeId}</span>
                  </span>
                </button>

                {/* View All Expertise */}
                {expertiseTags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setShowTagsModal(true);
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span>View All Research Tags ({expertiseTags.length})</span>
                  </button>
                )}

                {/* Manage Profile (Admin) */}
                {mode === 'admin' && onManageProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onManageProfile(adviser);
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <SquarePen className="w-4 h-4 text-gray-400" />
                    <span>Edit Profile</span>
                  </button>
                )}

                {/* View Works (Student/Directory) */}
                {onViewProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onViewProfile(adviser);
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span>View Profile & Works</span>
                  </button>
                )}

                {/* Status indicator line */}
                <div className="border-t border-gray-100 dark:border-[#2b2d3f] my-1" />
                <div className="px-3.5 py-1 text-[11px] text-gray-400 dark:text-gray-500 flex items-center justify-between">
                  <span>Mentorship Status</span>
                  <span
                    className={`font-semibold capitalize ${
                      adviser.status === 'active'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {adviser.status || 'Active'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QUICK EXPERTISE TAGS MODAL (Shown when clicking +N more or from overflow menu) */}
      {showTagsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowTagsModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2b2d3f] pb-3">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Research Expertise
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {fullName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTagsModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-1">
              {expertiseTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#f8f9fa] dark:bg-[#222433] text-[#3c4043] dark:text-gray-200 border border-[#e5e7eb] dark:border-[#2b2d3f]"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-[#2b2d3f]">
              <button
                type="button"
                onClick={() => setShowTagsModal(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-[#222433] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2b2d3f] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyDirectoryCard;
