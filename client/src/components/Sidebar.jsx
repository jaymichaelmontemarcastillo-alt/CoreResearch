// src/components/Sidebar.jsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import logoImg from "../assets/logo.png";
import { adviserRequestService } from "../services/adviserRequest.service";
import researchWorkspaceService from "../services/researchWorkspace.service";
import groupService from "../services/group.service";
import {
  HiSquares2X2,
  HiDocumentText,
  HiClipboardDocumentCheck,
  HiBuildingLibrary,
  HiChatBubbleLeftRight,
  HiCalendarDays,
  HiUsers,
  HiUserGroup,
  HiAcademicCap,
  HiBookOpen,
  HiChevronLeft,
  HiChevronRight,
  HiArrowRightOnRectangle,
  HiSparkles,
  HiMoon,
  HiSun,
  HiViewColumns,
} from "react-icons/hi2";

export const Sidebar = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout, currentFacultyMode } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const effectiveRole = role === "faculty" ? currentFacultyMode : role;

  const [hasWorkspace, setHasWorkspace] = React.useState(false);
  const { currentUser } = useAuth();

  React.useEffect(() => {
    const checkWorkspace = async () => {
      if (effectiveRole === "student" && currentUser?.uid) {
        try {
          const group = await groupService.getGroupByStudentId(currentUser.uid);
          const ws = await researchWorkspaceService.getWorkspaceByStudentOrGroup(
            currentUser.uid,
            group?.id
          );

          if (ws) {
            setHasWorkspace(true);
          } else {
            const requests = await adviserRequestService.getRequestsForStudentOrGroup(
              currentUser.uid
            );
            if (requests.some((r) => r.status === "accepted")) {
              setHasWorkspace(true);
            } else {
              setHasWorkspace(false);
            }
          }
        } catch (err) {
          console.error("Sidebar workspace fetch error", err);
        }
      }
    };
    checkWorkspace();
  }, [effectiveRole, currentUser]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navigationCategories = [
    {
      category: "RESEARCH",
      items: [
        {
          label: "Dashboard",
          path: "/dashboard",
          icon: HiSquares2X2,
          roles: ["student", "adviser", "panelist", "admin", "research_coordinator"],
        },
        ...(!hasWorkspace && effectiveRole === "student"
          ? [
              {
                label: "Submit Title",
                path: "/submit-title",
                icon: HiDocumentText,
                roles: ["student"],
              },
            ]
          : []),
        {
          label: "Proposal Review",
          path: "/coordinator/proposals",
          icon: HiClipboardDocumentCheck,
          roles: ["research_coordinator", "admin"],
        },
        ...(hasWorkspace && effectiveRole === "student"
          ? [
              {
                label: "Research Workspace",
                path: "/research/workspace",
                icon: HiBookOpen,
                roles: ["student"],
              },
              {
                label: "My Group",
                path: "/my-group",
                icon: HiUserGroup,
                roles: ["student"],
              },
            ]
          : []),
        ...(effectiveRole === "adviser" ||
        effectiveRole === "research_coordinator" ||
        effectiveRole === "admin"
          ? [
              {
                label: "My Advisees",
                path: "/advisees",
                icon: HiUsers,
                roles: ["adviser", "research_coordinator", "admin"],
              },
            ]
          : []),
        ...(effectiveRole === "panelist"
          ? [
              {
                label: "Panel Assignments",
                path: "/panelist/defendees",
                icon: HiUsers,
                roles: ["panelist"],
              },
            ]
          : []),
        {
          label: "Repository",
          path: "/repository",
          icon: HiBuildingLibrary,
          roles: [
            "student",
            "adviser",
            "panelist",
            "admin",
            "research_coordinator",
            "faculty",
          ],
        },
      ],
    },
    {
      category: "ACADEMIC",
      items: [
        {
          label: "Reviews",
          path: "/reviews",
          icon: HiChatBubbleLeftRight,
          roles: ["student", "adviser", "panelist", "admin", "research_coordinator"],
        },
        {
          label: "Schedules",
          path: "/schedules",
          icon: HiCalendarDays,
          roles: ["student", "adviser", "panelist", "admin", "research_coordinator"],
        },
      ],
    },
    {
      category: "ADMIN",
      items: [
        {
          label: "User Directory",
          path: "/admin/users",
          icon: HiUsers,
          roles: ["admin"],
        },
        {
          label: "Students",
          path: "/admin/students",
          icon: HiAcademicCap,
          roles: ["admin", "research_coordinator"],
        },
        {
          label: "Research Groups",
          path: "/admin/groups",
          icon: HiUserGroup,
          roles: ["admin", "research_coordinator"],
        },
        {
          label: "Scheduling",
          path: "/admin/scheduling",
          icon: HiCalendarDays,
          roles: ["admin", "research_coordinator"],
        },
        {
          label: "Courses",
          path: "/admin/courses",
          icon: HiBookOpen,
          roles: ["admin"],
        },
      ],
    },
  ];

  const isItemActive = (path) => {
    const currentPath = location.pathname;
    if (path === "/proposals") return currentPath.startsWith("/proposals");
    if (path === "/coordinator/proposals")
      return currentPath.startsWith("/coordinator/proposals");
    if (path === "/admin/users") return currentPath.startsWith("/admin/users");
    if (path === "/admin/courses") return currentPath.startsWith("/admin/courses");
    return currentPath === path;
  };

  const renderContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-[#111218] border-r border-gray-200 dark:border-[#222433] transition-all duration-200 select-none overflow-x-hidden">
      {/* BRANDING / COLLAPSE HEADER SECTION */}
      <div className="h-16 flex items-center border-b border-gray-100 dark:border-[#222433] shrink-0 px-4 overflow-x-hidden">
        {collapsed ? (
          <div className="w-full flex items-center justify-center">
            <button
              onClick={onToggleCollapse}
              className="w-10 h-10 rounded-xl text-gray-500 dark:text-[#9396a8] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1b26] flex items-center justify-center transition-all shrink-0 border border-transparent dark:border-[#222433]"
              title="Expand Sidebar"
            >
              <HiChevronRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
              <img
                src={logoImg}
                alt="CoreResearch Logo"
                className="w-8 h-8 object-contain shrink-0"
              />
              <span className="text-base tracking-tight truncate">
                <span className="font-semibold text-gray-900 dark:text-white">Core</span>
                <span className="font-semibold text-blue-600 dark:text-blue-500">Research</span>
              </span>
            </Link>

            {/* Sidebar Collapse Toggle Button */}
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-gray-400 dark:text-[#9396a8] hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1b26] border border-transparent dark:border-[#222433] transition-all hidden lg:flex items-center justify-center shrink-0"
              title="Collapse Sidebar"
            >
              <HiChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* CATEGORIZED NAVIGATION */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-5 custom-scrollbar ${
          collapsed ? "px-2" : "px-3"
        }`}
      >
        {navigationCategories.map((sec) => {
          const visibleItems = sec.items.filter((item) =>
            item.roles.includes(role || "student")
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={sec.category} className="space-y-1.5">
              {!collapsed && (
                <div className="px-3 text-[10px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider truncate">
                  {sec.category}
                </div>
              )}

              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item.path);

                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      className={`relative group flex items-center transition-all duration-150 ${
                        collapsed
                          ? "justify-center h-10 w-10 mx-auto rounded-xl shrink-0"
                          : "gap-3 h-10 px-3 rounded-xl text-sm font-medium"
                      } ${
                        active
                          ? "bg-blue-600 text-white font-medium shadow-md shadow-blue-600/25"
                          : "text-gray-600 dark:text-[#9396a8] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-[#1a1b26] dark:hover:border dark:hover:border-[#222433]"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-colors ${
                          active
                            ? "text-white"
                            : "text-gray-500 dark:text-[#9396a8] group-hover:text-gray-700 dark:group-hover:text-white"
                        }`}
                      />

                      {!collapsed && <span className="truncate text-[13px]">{item.label}</span>}

                      {collapsed && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 dark:bg-[#15161e] text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none shadow-lg border border-transparent dark:border-[#222433] z-50 transition-opacity duration-150">
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

      {/* FOOTER SECTION: DARK MODE TOGGLE + LOGOUT */}
      <div
        className={`p-3 border-t border-gray-200 dark:border-[#222433] shrink-0 space-y-2 overflow-x-hidden ${
          collapsed ? "px-2" : "px-3"
        }`}
      >
        {/* Dark Mode Toggle Row */}
        {!collapsed ? (
          <div
            onClick={toggleTheme}
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-[#9396a8] hover:bg-gray-100 dark:hover:bg-[#1a1b26] hover:text-gray-900 dark:hover:text-white cursor-pointer transition select-none border border-transparent dark:hover:border-[#222433]"
          >
            <div className="flex items-center gap-2.5">
              {theme === "dark" ? (
                <HiMoon className="w-4 h-4 text-blue-400" />
              ) : (
                <HiSun className="w-4 h-4 text-amber-500" />
              )}
              <span>Dark Mode</span>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={theme === "dark"}
              onClick={(e) => {
                e.stopPropagation();
                toggleTheme();
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                theme === "dark" ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  theme === "dark" ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ) : (
          <button
            onClick={toggleTheme}
            className="group relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl text-gray-500 dark:text-[#9396a8] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1b26] border border-transparent dark:border-[#222433] transition shrink-0"
            title="Toggle Dark Mode"
          >
            {theme === "dark" ? (
              <HiMoon className="w-5 h-5 text-blue-400" />
            ) : (
              <HiSun className="w-5 h-5 text-amber-500" />
            )}
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 dark:bg-[#15161e] text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none shadow-lg border border-transparent dark:border-[#222433] z-50 transition-opacity duration-150">
              Toggle Theme
            </div>
          </button>
        )}

        {/* Dedicated Logout Button */}
        <button
          onClick={handleLogout}
          className={`relative group flex items-center text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 dark:hover:border dark:hover:border-red-900/40 transition-all ${
            collapsed
              ? "justify-center h-10 w-10 mx-auto rounded-xl shrink-0"
              : "gap-2.5 h-9 px-3 w-full rounded-xl"
          }`}
        >
          <HiArrowRightOnRectangle className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
          {!collapsed && <span>Logout</span>}

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
        className={`hidden lg:block fixed left-0 top-0 bottom-0 z-40 transition-all duration-200 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {renderContent()}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 h-full bg-white dark:bg-[#111218] shadow-xl border-r border-gray-200 dark:border-[#222433] z-50 animate-slide-in">
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
};
