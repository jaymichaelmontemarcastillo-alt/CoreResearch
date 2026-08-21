// src/components/Sidebar.jsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  FileSignature,
  FolderKanban,
  FileText,
  Library,
  MessageSquare,
  CalendarDays,
  Award,
  UserCog,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BookOpen,
  Users,
  GraduationCap,
  Link as LinkIcon,
  ClipboardList,
} from "lucide-react";

export const Sidebar = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // REAL application navigation items with strictly enforced RBAC roles & distinct icons
  const navigationCategories = [
    {
      category: "RESEARCH",
      items: [
        {
          label: "Dashboard",
          path: "/dashboard",
          icon: LayoutDashboard,
          roles: ["student", "adviser", "panelist", "admin", "research_coordinator"],
        },
        {
          label: "Proposals",
          path: "/proposals",
          icon: FileSignature,
          roles: ["student", "adviser"],
        },
        {
          label: "Proposal Review",
          path: "/coordinator/proposals",
          icon: ClipboardList,
          roles: ["research_coordinator", "admin"],
        },
        ...(role === "student"
          ? [
            {
              label: "Research Workspace",
              path: "/research/workspace",
              icon: BookOpen,
              roles: ["student"],
            },
            {
              label: "My Group",
              path: "/my-group",
              icon: Users,
              roles: ["student"],
            },
          ]
          : []),
        ...(role === "adviser" || role === "research_coordinator" || role === "admin"
          ? [
            {
              label: "My Advisees",
              path: "/advisees",
              icon: Users,
              roles: ["adviser", "research_coordinator", "admin"],
            },
          ]
          : []),
        {
          label: "Documents",
          path: "/documents",
          icon: FileText,
          roles: ["student", "adviser", "admin", "research_coordinator"],
        },
        {
          label: "Repository",
          path: "/repository",
          icon: Library,
          roles: ["student", "adviser", "panelist", "admin", "research_coordinator"],
        },
      ],
    },
    {
      category: "ACADEMIC",
      items: [
        {
          label: "Reviews",
          path: "/reviews",
          icon: MessageSquare,
          roles: ["student", "adviser", "panelist", "admin", "research_coordinator"],
        },
        {
          label: "Schedules",
          path: "/schedules",
          icon: CalendarDays,
          roles: ["student", "adviser", "panelist", "admin", "research_coordinator"],
        },
        {
          label: "Grading",
          path: "/grading",
          icon: Award,
          roles: ["adviser", "panelist", "admin"], // STRICT: Students cannot access Grading
        },
      ],
    },
    {
      category: "ADMIN",
      items: [
        {
          label: "User Directory",
          path: "/admin/users",
          icon: UserCog,
          roles: ["admin"], // STRICT: Only Admin can access User Management
        },
        {
          label: "Students",
          path: "/admin/students",
          icon: GraduationCap,
          roles: ["admin", "research_coordinator"],
        },
        {
          label: "Research Groups",
          path: "/admin/groups",
          icon: Users,
          roles: ["admin", "research_coordinator"],
        },
        {
          label: "Courses",
          path: "/admin/courses",
          icon: BookOpen,
          roles: ["admin"], // STRICT: Only Admin can access Course Management
        },
      ],
    },
  ];

  // Helper ensuring ONLY ONE menu item is active
  const isItemActive = (path) => {
    const currentPath = location.pathname;
    if (path === "/proposals") {
      return currentPath.startsWith("/proposals");
    }
    if (path === "/coordinator/proposals") {
      return currentPath.startsWith("/coordinator/proposals");
    }
    if (path === "/admin/users") {
      return currentPath.startsWith("/admin/users");
    }
    if (path === "/admin/courses") {
      return currentPath.startsWith("/admin/courses");
    }
    return currentPath === path;
  };

  const renderContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transition-all duration-200 select-none overflow-x-hidden">
      {/* BRANDING / COLLAPSE HEADER SECTION */}
      <div className="h-16 flex items-center border-b border-gray-100 dark:border-slate-800/80 shrink-0 px-4 overflow-x-hidden">
        {collapsed ? (
          /* Collapsed Mode: Hide logo and text completely, center chevron expand button */
          <div className="w-full flex items-center justify-center">
            <button
              onClick={onToggleCollapse}
              className="w-10 h-10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all shrink-0"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          /* Expanded Mode: Circular logo + CoreResearch text on left, chevron collapse button on right */
          <div className="w-full flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
                c
              </div>
              <span className="text-lg tracking-tight truncate">
                <span className="font-normal text-gray-900 dark:text-white">Core</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">Research</span>
              </span>
            </Link>

            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all hidden lg:flex items-center justify-center shrink-0"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* CATEGORIZED NAVIGATION */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-6 ${collapsed ? "px-2" : "px-3"}`}>
        {navigationCategories.map((sec) => {
          const visibleItems = sec.items.filter((item) =>
            item.roles.includes(role || "student")
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={sec.category} className="space-y-1.5">
              {/* Category Header Label */}
              {!collapsed && (
                <div className="px-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">
                  {sec.category}
                </div>
              )}

              {/* Category Items */}
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item.path);

                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      className={`relative group flex items-center transition-all duration-150 ${collapsed
                          ? "justify-center h-11 w-11 mx-auto rounded-xl shrink-0"
                          : "gap-3.5 h-11 px-3.5 rounded-xl text-sm font-medium"
                        } ${active
                          ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-slate-800/60"
                        }`}
                    >
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-colors ${active
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200"
                          }`}
                      />

                      {!collapsed && <span className="truncate">{item.label}</span>}

                      {/* Floating Tooltip in Collapsed Mode */}
                      {collapsed && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 dark:bg-slate-800 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none shadow-lg z-50 transition-opacity duration-150">
                          {item.label}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER SECTION */}
      <div className={`p-3 border-t border-gray-200 dark:border-slate-800 shrink-0 space-y-2 overflow-x-hidden ${collapsed ? "px-2" : "px-3"}`}>
        {/* Placeholder container for profile */}
        {!collapsed && <div className="h-2" />}

        {/* Dedicated Logout Button */}
        <button
          onClick={handleLogout}
          className={`relative group flex items-center text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all ${collapsed
              ? "justify-center h-11 w-11 mx-auto rounded-xl shrink-0"
              : "gap-3.5 h-11 px-3.5 w-full rounded-xl"
            }`}
        >
          <LogOut className="w-5 h-5 shrink-0 text-red-500 dark:text-red-400" />
          {!collapsed && <span>Logout</span>}

          {/* Floating Tooltip for Logout in Collapsed Mode */}
          {collapsed && (
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none shadow-lg z-50 transition-opacity duration-150">
              Logout
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden lg:block fixed left-0 top-0 bottom-0 z-40 transition-all duration-200 ${collapsed ? "w-20" : "w-64"
          }`}
      >
        {renderContent()}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 h-full bg-white dark:bg-slate-900 shadow-xl z-50 animate-slide-in">
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
};
