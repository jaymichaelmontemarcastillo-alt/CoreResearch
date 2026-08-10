// src/components/Header.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Avatar } from "./ui/Avatar";
import {
  Menu,
  Search,
  Moon,
  Sun,
  Bell,
  LogOut,
} from "lucide-react";

export const Header = ({ onOpenMobileMenu, sidebarCollapsed }) => {
  const { userProfile, currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Map route to clean real page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Dashboard";
    if (path.startsWith("/manuscripts")) return "Manuscripts";
    if (path.startsWith("/proposals")) return "Title Proposals";
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
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      {/* CENTER SECTION — Centered Search Bar */}
      <div className="hidden sm:flex flex-1 max-w-sm mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-10 bg-gray-50/70 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/80 rounded-xl text-sm pl-10 pr-3.5 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* RIGHT SECTION — Sequence matching reference image 2:
          1. Theme toggle (Moon/Sun)
          2. Notification bell with red dot
          3. Vertical divider
          4. User avatar
          5. User name
          6. Logout icon
      */}
      <div className="flex items-center gap-3 shrink-0">
        {/* 1. Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition"
          title={theme === "dark" ? "Light Mode" : "Dark Mode"}
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* 2. Notification Icon */}
        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 relative transition">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* 3. Vertical Divider */}
        <div className="h-5 w-px bg-gray-200 dark:bg-slate-800 mx-0.5" />

        {/* 4. User Avatar & 5. User Name */}
        <div className="flex items-center gap-2.5">
          <Avatar name={displayName} size="sm" color="blue" />
          <span className="hidden md:inline-block text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
            {displayName}
          </span>
        </div>

        {/* 6. Logout Icon Button */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition ml-0.5"
          title="Logout"
        >
          <LogOut className="w-4 h-4 text-red-500 dark:text-red-400" />
        </button>
      </div>
    </header>
  );
};
