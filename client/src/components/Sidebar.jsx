import React, { useState, useEffect } from "react";
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
  HiClipboardDocumentList,
  HiBuildingLibrary,
  HiCalendarDays,
  HiUsers,
  HiUserGroup,
  HiAcademicCap,
  HiBookOpen,
  HiArrowRightOnRectangle,
  HiSun,
  HiMoon,
  HiBell,
} from "react-icons/hi2";

export const Sidebar = ({
  mobileOpen,
  onCloseMobile,
  isHovered: externalHovered,
  onHoverChange,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout, currentFacultyMode, currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [internalHovered, setInternalHovered] = useState(false);
  const isExpanded = externalHovered !== undefined ? externalHovered : internalHovered;

  const handleHover = (state) => {
    setInternalHovered(state);
    if (onHoverChange) onHoverChange(state);
  };

  const [hasWorkspace, setHasWorkspace] = useState(false);

  const effectiveRole = role === "faculty" ? currentFacultyMode : role;

  useEffect(() => {
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
          roles: ["student", "adviser", "panelist", "admin", "research_coordinator", "faculty"],
        },
        {
          label: "Notifications",
          path: "/notifications",
          icon: HiBell,
          roles: ["student", "adviser", "panelist", "admin", "research_coordinator", "faculty"],
        },
        ...(effectiveRole === "student"
          ? [
              {
                label: "My Group",
                path: "/my-group",
                icon: HiUserGroup,
                roles: ["student"],
              },
              {
                label: "Masterlist",
                path: "/masterlist",
                icon: HiClipboardDocumentList,
                roles: ["student"],
              },
              ...(!hasWorkspace
                ? [
                    {
                      label: "Submit Title",
                      path: "/submit-title",
                      icon: HiDocumentText,
                      roles: ["student"],
                    },
                  ]
                : [
                    {
                      label: "Research Workspace",
                      path: "/research/workspace",
                      icon: HiBookOpen,
                      roles: ["student"],
                    },
                  ]),
            ]
          : []),
        ...(effectiveRole === "adviser" ||
        effectiveRole === "research_coordinator" ||
        effectiveRole === "admin" ||
        effectiveRole === "faculty"
          ? [
              {
                label: "My Advisees",
                path: "/advisees",
                icon: HiUsers,
                roles: ["adviser", "research_coordinator", "admin", "faculty"],
              },
              {
                label: "Panelists",
                path: "/panelists",
                icon: HiUserGroup,
                roles: ["adviser", "research_coordinator", "admin", "faculty", "panelist"],
              },
            ]
          : []),
        ...(effectiveRole === "panelist"
          ? [
              {
                label: "Panelists",
                path: "/panelists",
                icon: HiUserGroup,
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
          label: "Schedule",
          path: "/schedules",
          icon: HiCalendarDays,
          roles: ["student", "adviser", "panelist", "admin", "research_coordinator", "faculty"],
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
          label: "Adviser Matching",
          path: "/adviser-matching",
          icon: HiUsers,
          roles: ["admin", "research_coordinator"],
        },
      ],
    },
  ];

  const isItemActive = (path) => {
    const currentPath = location.pathname;
    if (path === "/proposals") return currentPath.startsWith("/proposals");
    if (path === "/admin/users") return currentPath.startsWith("/admin/users");
    if (path === "/admin/courses") return currentPath.startsWith("/admin/courses");
    return currentPath === path;
  };

  const renderContent = (expanded) => (
    <div className="flex flex-col h-full bg-white dark:bg-[#15161e] border border-gray-200/90 dark:border-[#222433] rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/60 select-none overflow-hidden transition-all duration-300 ease-in-out">
      {/* BRANDING HEADER SECTION — NO TOGGLE ARROW */}
      <div className={`flex items-center shrink-0 border-b border-gray-100 dark:border-[#202230] h-16 overflow-hidden transition-all duration-300 ease-in-out ${
        expanded ? "px-3.5" : "px-0 justify-center"
      }`}>
        <Link
          to="/dashboard"
          className={`flex items-center transition-all duration-300 ease-in-out ${
            expanded ? "gap-3 w-full min-w-0" : "justify-center w-full h-full"
          }`}
          title="CoreResearch Dashboard"
        >
          <img
            src={logoImg}
            alt="CoreResearch Logo"
            className="w-8 h-8 object-contain shrink-0 drop-shadow-sm transition-transform duration-300"
          />
          {expanded && (
            <span className="text-base tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out opacity-100 max-w-[160px]">
              <span className="font-bold text-gray-900 dark:text-white">Core</span>
              <span className="font-bold text-gray-700 dark:text-gray-300">Research</span>
            </span>
          )}
        </Link>
      </div>

      {/* CATEGORIZED NAVIGATION */}
      <div className={`flex-1 overflow-y-auto no-scrollbar py-3 space-y-4 ${expanded ? "px-3" : "px-2"}`}>
        {navigationCategories.map((sec) => {
          const visibleItems = sec.items.filter((item) =>
            item.roles.includes(role || "student")
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={sec.category} className="space-y-1">
              <div
                className={`px-3 text-[10px] font-semibold text-gray-400 dark:text-[#72768f] uppercase tracking-wider whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                  expanded ? "opacity-100 max-h-6 py-1" : "opacity-0 max-h-0 py-0 pointer-events-none"
                }`}
              >
                {sec.category}
              </div>

              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item.path);

                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      className={`relative flex items-center transition-all duration-300 ease-in-out rounded-xl font-medium ${
                        expanded
                          ? "gap-3 h-10 px-3 text-sm"
                          : "justify-center h-10 w-10 mx-auto"
                      } ${
                        active
                          ? "bg-gray-100 dark:bg-[#1f212d] text-gray-900 dark:text-white border border-gray-200 dark:border-[#2c2f42] font-semibold shadow-sm"
                          : "text-gray-500 dark:text-[#888ca3] hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1a1c26]"
                      }`}
                      title={!expanded ? item.label : undefined}
                    >
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-colors ${
                          active
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-[#888ca3] group-hover:text-gray-800 dark:group-hover:text-white"
                        }`}
                      />

                      <span
                        className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out text-[13px] ${
                          expanded
                            ? "opacity-100 max-w-[160px]"
                            : "opacity-0 max-w-0 pointer-events-none"
                        }`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTTOM SECTION: THEME SWITCH & LOGOUT */}
      <div className={`p-3 border-t border-gray-100 dark:border-[#202230] shrink-0 space-y-2 ${expanded ? "px-3" : "px-2"}`}>
        {/* THEME TOGGLE SWITCH */}
        {!expanded ? (
          <div className="flex justify-center">
            <button
              onClick={toggleTheme}
              className="h-10 w-10 rounded-xl flex items-center justify-center text-gray-500 dark:text-[#9ea3be] hover:text-amber-500 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-[#1f212d] transition-all border border-transparent dark:border-[#222433]"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <HiSun className="w-5 h-5 text-amber-400" />
              ) : (
                <HiMoon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        ) : (
          <div className="bg-gray-100/90 dark:bg-[#1a1c27] p-1 rounded-xl flex items-center gap-1 border border-gray-200/60 dark:border-[#252839] transition-all duration-300 ease-in-out">
            <button
              type="button"
              onClick={() => { if (theme === "dark") toggleTheme(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === "light"
                  ? "bg-white text-gray-900 shadow-sm font-semibold"
                  : "text-gray-500 dark:text-[#888ca3] hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <HiSun className={`w-3.5 h-3.5 ${theme === "light" ? "text-amber-500" : ""}`} />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => { if (theme === "light") toggleTheme(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === "dark"
                  ? "bg-[#252839] text-white shadow-sm font-semibold"
                  : "text-gray-500 dark:text-[#888ca3] hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <HiMoon className="w-3.5 h-3.5 text-amber-300 dark:text-white" />
              <span>Dark</span>
            </button>
          </div>
        )}

        {/* LOGOUT BUTTON */}
        <button
          onClick={handleLogout}
          className={`relative flex items-center text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-300 ease-in-out rounded-xl ${
            expanded
              ? "gap-2.5 h-9 px-3 w-full"
              : "justify-center h-10 w-10 mx-auto"
          }`}
          title={!expanded ? "Logout" : undefined}
        >
          <HiArrowRightOnRectangle className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
          <span
            className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
              expanded ? "opacity-100 max-w-[120px]" : "opacity-0 max-w-0 pointer-events-none"
            }`}
          >
            Logout
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Container-like Sidebar in Flexbox flow that actively pushes content */}
      <aside
        onMouseEnter={() => handleHover(true)}
        onMouseLeave={() => handleHover(false)}
        className={`hidden lg:flex flex-col shrink-0 sticky top-0 h-screen p-3 z-30 transition-all duration-300 ease-in-out select-none ${
          isExpanded ? "w-64" : "w-[88px]"
        }`}
      >
        {renderContent(isExpanded)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex p-3">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 h-full z-50 animate-slide-in">
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
