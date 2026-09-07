// src/components/Header.jsx
import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../hooks/useNotifications";
import { Avatar } from "./ui/Avatar";
import {
  HiBars3,
  HiBell,
  HiArrowRightOnRectangle,
  HiUserCircle,
  HiLockClosed,
  HiChevronDown,
} from "react-icons/hi2";

export const Header = ({ onOpenMobileMenu }) => {
  const { userProfile, currentUser, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications(currentUser?.uid);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setNotificationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const prevUnreadCountRef = useRef(0);

  // Auto-open dropdown when new notification arrives
  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current) {
      setNotificationDropdownOpen(true);
      setProfileDropdownOpen(false);
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    setNotificationDropdownOpen(false);
    
    // Simple navigation rules based on notification title/type
    if (notif.title.toLowerCase().includes('adviser request')) {
      if (userProfile?.role === 'adviser') {
        navigate('/dashboard');
      } else {
        navigate('/research-workspace');
      }
    }
  };

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    await logout();
    navigate("/login");
  };

  // Map route to clean real page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Dashboard";
    if (path === "/notifications") return "Notifications";
    if (path === "/masterlist") return "Section Masterlist";
    if (path === "/my-group") return "My Research Group";
    if (path === "/panelists") return "Panelist Defense Schedules";
    if (path === "/advisees") return "My Advisees";
    if (path === "/profile" || path === "/profile-settings" || path === "/settings") return "Account Settings";
    if (path.startsWith("/proposals")) return "Title Proposals";
    if (path.startsWith("/documents")) return "Documents";
    if (path.startsWith("/projects")) return "Research Projects";
    if (path.startsWith("/schedules")) return "Defense Schedules";
    if (path.startsWith("/admin/scheduling")) return "Defense Scheduling";
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
      className="sticky top-0 z-20 h-16 bg-gray-50/80 dark:bg-[#0b0c10]/80 backdrop-blur-md border-b border-gray-200/50 dark:border-[#1c1d28]/60 px-6 sm:px-8 lg:px-12 flex items-center justify-between shrink-0 transition-all duration-300 ease-in-out"
    >
      {/* LEFT SECTION — Mobile Menu + Page Title */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1b26] text-gray-600 dark:text-[#9396a8] transition shrink-0"
          aria-label="Open navigation menu"
        >
          <HiBars3 className="w-6 h-6" />
        </button>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      {/* RIGHT SECTION — DASHBOARD ------------- bell --- profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notification Icon & Dropdown */}
        <div className="relative" ref={notificationDropdownRef}>
          <button 
            onClick={() => {
              setNotificationDropdownOpen(!notificationDropdownOpen);
              setProfileDropdownOpen(false);
            }}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1a1b26] text-gray-500 dark:text-[#9396a8] relative transition border border-transparent hover:border-gray-200/80 dark:hover:border-[#222433]"
            title="Notifications"
          >
            <HiBell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>

          {notificationDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#222433] rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in flex flex-col max-h-[85vh]">
              <div className="p-3 border-b border-gray-100 dark:border-[#222433] flex items-center justify-between bg-gray-50/50 dark:bg-[#111218]">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={async () => {
                      await markAllAsRead();
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="overflow-y-auto flex-1 p-1">
                {loading && notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500">Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                    <HiBell className="w-8 h-8 text-gray-300 dark:text-[#4c5064]" />
                    <span>No notifications yet.</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.slice(0, 6).map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3 rounded-xl cursor-pointer transition-colors flex gap-3 items-start ${
                          notif.read 
                            ? 'hover:bg-gray-50 dark:hover:bg-[#1c1d28]/60' 
                            : 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                        }`}
                      >
                        <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${notif.read ? 'bg-transparent' : 'bg-blue-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${notif.read ? 'text-gray-900 dark:text-[#9396a8]' : 'font-semibold text-gray-900 dark:text-white'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-[#6b6f84] mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-[#4c5064] mt-1.5">
                            {new Date(notif.createdAt).toLocaleString(undefined, { 
                              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* See all link — shown when there are more than 6 notifications */}
              {notifications.length > 6 && (
                <div className="border-t border-gray-100 dark:border-[#222433] p-2">
                  <Link
                    to="/notifications"
                    onClick={() => setNotificationDropdownOpen(false)}
                    className="flex items-center justify-center w-full py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1c1d28]/60 transition-colors"
                  >
                    See all notifications ({notifications.length}) →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subtle Divider */}
        <div className="h-5 w-px bg-gray-200 dark:bg-[#222433] mx-0.5" />

        {/* User Profile Dropdown Pill */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setProfileDropdownOpen(!profileDropdownOpen);
              setNotificationDropdownOpen(false);
            }}
            className="flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1a1b26] transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 group border border-transparent hover:border-gray-200/80 dark:hover:border-[#222433]"
            title="Account & Profile Settings"
          >
            <Avatar name={displayName} src={avatarSrc} size="sm" color="blue" />
            <span className="hidden sm:inline-block text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[150px] text-left">
              {displayName}
            </span>
            <HiChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile Dropdown Menu */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#222433] rounded-2xl shadow-2xl z-50 p-2 animate-scale-in">
              {/* User Header Summary */}
              <div className="p-3 bg-gray-50 dark:bg-[#1c1d28] border border-transparent dark:border-[#222433] rounded-xl mb-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 dark:text-[#9396a8] truncate mt-0.5">
                  {userProfile?.email || currentUser?.email || "user@university.edu"}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-transparent dark:border-blue-500/30">
                    {roleLabel}
                  </span>
                  {userProfile?.department && (
                    <span className="text-[11px] text-gray-400 dark:text-[#6b6f84] truncate max-w-[120px]">
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-[#9396a8] hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition text-left"
                >
                  <HiUserCircle className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  <span>Profile Settings</span>
                </button>

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate("/profile?tab=password");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-[#9396a8] hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition text-left"
                >
                  <HiLockClosed className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  <span>Password & Security</span>
                </button>
              </div>

              {/* Divider & Logout */}
              <div className="my-1.5 border-t border-gray-100 dark:border-[#222433]" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition text-left"
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

export default Header;
