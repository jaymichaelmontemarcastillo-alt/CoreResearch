// src/components/Header.jsx
import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Avatar } from "./ui/Avatar";
import {
  HiBars3,
  HiMagnifyingGlass,
  HiMoon,
  HiSun,
  HiBell,
  HiArrowRightOnRectangle,
  HiUserCircle,
  HiLockClosed,
  HiChevronDown,
} from "react-icons/hi2";

export const Header = ({ onOpenMobileMenu, sidebarCollapsed }) => {
  const { userProfile, currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    await logout();
    navigate("/login");
  };

  // Map route to clean real page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Dashboard";
    if (path === "/profile" || path === "/profile-settings" || path === "/settings") return "Account Settings";
    if (path.startsWith("/proposals")) return "Title Proposals";
    if (path.startsWith("/documents")) return "Documents";
    if (path.startsWith("/projects")) return "Research Projects";
    if (path.startsWith("/schedules")) return "Defense Schedules";
    if (path.startsWith("/reviews")) return "Reviews & Annotations";
    if (path.startsWith("/grading")) return "Digital Rubric & Grading";
    if (path.startsWith("/repository")) return "Research Repository";
    if (path.startsWith("/admin/users")) return "User Directory";
    if (path === "/onboarding") return "Profile Setup";
    return "Dashboard";
  };

  // Construct the display name robustly based on available profile/auth data
  const displayName = 
    userProfile?.fullName || 
    (userProfile?.first_name && userProfile?.last_name ? `${userProfile.first_name} ${userProfile.last_name}` : null) ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "Researcher";

  const avatarSrc = userProfile?.profile_image || currentUser?.photoURL || "";

  const roleLabel =
    userProfile?.role === "admin"
      ? "Admin"
      : userProfile?.role === "research_coordinator"
      ? "Coordinator"
      : userProfile?.role === "adviser"
      ? "Adviser"
      : userProfile?.role === "panelist"
      ? "Panelist"
      : "Student";

  return (
    <header
      className={`sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 transition-all duration-200 ${
        sidebarCollapsed ? "lg:pl-24" : "lg:pl-72"
      }`}
    >
      {/* LEFT SECTION — Page Title */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400 transition"
        >
          <HiBars3 className="w-6 h-6" />
        </button>

        <h1 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      {/* CENTER SECTION — Centered Search Bar */}
      <div className="hidden sm:flex flex-1 max-w-sm mx-6">
        <div className="relative w-full">
          <HiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-10 bg-gray-50/70 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/80 rounded-xl text-sm pl-10 pr-3.5 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* RIGHT SECTION — Theme toggle, Notification, Divider, User Avatar & Menu */}
      <div className="flex items-center gap-3 shrink-0">
        {/* 1. Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition"
          title={theme === "dark" ? "Light Mode" : "Dark Mode"}
        >
          {theme === "dark" ? (
            <HiSun className="w-5 h-5 text-amber-400" />
          ) : (
            <HiMoon className="w-5 h-5" />
          )}
        </button>

        {/* 2. Notification Icon */}
        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 relative transition">
          <HiBell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* 3. Vertical Divider */}
        <div className="h-5 w-px bg-gray-200 dark:bg-slate-800 mx-0.5" />

        {/* 4. User Profile Dropdown Pill */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 group"
            title="Account & Profile Settings"
          >
            <Avatar name={displayName} src={avatarSrc} size="sm" color="blue" />
            <span className="hidden md:inline-block text-sm font-medium text-gray-900 dark:text-white truncate max-w-[140px] text-left">
              {displayName}
            </span>
            <HiChevronDown className={`hidden md:block w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile Dropdown Menu */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 animate-scale-in">
              {/* User Header Summary */}
              <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl mb-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {userProfile?.email || currentUser?.email || "user@university.edu"}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                    {roleLabel}
                  </span>
                  {userProfile?.department && (
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-[120px]">
                      • {userProfile.department}
                    </span>
                  )}
                </div>
              </div>

              {/* Menu Links */}
              <div className="space-y-0.5 pt-1">
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate("/profile?tab=profile");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition text-left"
                >
                  <HiUserCircle className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  <span>Profile Settings</span>
                </button>

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate("/profile?tab=password");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition text-left"
                >
                  <HiLockClosed className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  <span>Password & Security</span>
                </button>
              </div>

              {/* Divider & Logout */}
              <div className="my-1.5 border-t border-gray-100 dark:border-slate-800" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition text-left"
              >
                <HiArrowRightOnRectangle className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

