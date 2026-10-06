import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useConfirm } from "../context/ConfirmContext";
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
  HiChevronRight,
  HiChevronLeft,
  HiChartBar,
  HiPlus,
  HiMinus,
} from "react-icons/hi2";

export const Sidebar = ({
  mobileOpen,
  onCloseMobile,
  isExpanded: externalExpanded,
  onToggle,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout, currentFacultyMode, currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { confirm } = useConfirm();

  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;

  const toggleSidebar = () => {
    if (mobileOpen && onCloseMobile) {
      onCloseMobile();
      return;
    }
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded(!isExpanded);
    }
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
    const isConfirmed = await confirm({
      title: "Confirm Logout",
      message: "Are you sure you want to log out of your account?",
      confirmText: "Log Out",
      variant: "danger",
    });
    
    if (isConfirmed) {
      await logout();
      navigate("/login");
    }
  };

  const [openDropdowns, setOpenDropdowns] = useState({});

  const toggleDropdown = (category) => {
    if (!isExpanded) {
      if (onToggle) {
        onToggle();
      } else {
        setInternalExpanded(true);
      }
      setOpenDropdowns((prev) => ({ ...prev, [category]: true }));
    } else {
      setOpenDropdowns((prev) => ({
        ...prev,
        [category]: !prev[category],
      }));
    }
  };

  const navItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: HiSquares2X2,
      roles: ["student", "adviser", "panelist", "admin", "research_coordinator", "faculty"],
    },
    {
      category: "Research Management",
      icon: HiDocumentText,
      items: [
        {
          label: "Research Groups",
          path: "/admin/groups",
          icon: HiUserGroup,
          roles: ["admin", "research_coordinator"],
        },
        ...(effectiveRole === "student" ? [
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
        ] : []),
        {
          label: "Manuscripts",
          path: "/admin/manuscripts",
          icon: HiDocumentText,
          roles: ["admin", "research_coordinator"],
        },
        {
          label: "Research Documents",
          path: "/research-documents",
          icon: HiDocumentText,
          roles: ["adviser", "research_coordinator", "faculty", "admin"],
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
        ...(hasWorkspace && effectiveRole === "student"
          ? [
              {
                label: "Research Workspace",
                path: "/research/workspace",
                icon: HiBookOpen,
                roles: ["student"],
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
      category: "People & Directory",
      icon: HiUsers,
      items: [
        {
          label: "User Directory",
          path: "/admin/users",
          icon: HiUsers,
          roles: ["admin", "research_coordinator"],
        },
        {
          label: "Students",
          path: "/admin/students",
          icon: HiAcademicCap,
          roles: ["admin", "research_coordinator"],
        },
        {
          label: "Advisers & Faculty",
          path: "/admin/advisers",
          icon: HiAcademicCap,
          roles: ["admin"],
        },
        ...(effectiveRole === "student" ? [
          {
            label: "Faculty Advisers",
            path: "/advisers",
            icon: HiAcademicCap,
            roles: ["student"],
          }
        ] : []),
        {
          label: "Programs & Sections",
          path: "/admin/courses",
          icon: HiSquares2X2,
          roles: ["admin", "research_coordinator"],
        },
      ],
    },
    {
      category: "Advising & Defenses",
      icon: HiAcademicCap,
      items: [
        {
          label: "My Advisees",
          path: "/advisees",
          icon: HiUsers,
          roles: ["adviser", "research_coordinator", "admin", "faculty"],
        },
        {
          label: "Adviser Requests",
          path: "/adviser-requests",
          icon: HiClipboardDocumentList,
          roles: ["adviser", "faculty", "research_coordinator", "admin"],
        },
        {
          label: "Defense Schedules",
          path: "/panelists",
          icon: HiUserGroup,
          roles: ["adviser", "research_coordinator", "admin", "faculty", "panelist"],
        },
      ],
    },
    {
      category: "Academic Schedules",
      icon: HiCalendarDays,
      items: [
        {
          label: "Calendar",
          path: "/calendar",
          icon: HiCalendarDays,
          roles: ["student", "adviser", "panelist", "faculty"],
        },
        {
          label: "Schedule",
          path: "/schedules",
          icon: HiCalendarDays,
          roles: ["student", "adviser", "panelist", "faculty"],
        },
        {
          label: "Scheduling",
          path: "/admin/scheduling",
          icon: HiCalendarDays,
          roles: ["admin", "research_coordinator"],
        },
      ]
    },
    {
      label: "Notifications",
      path: "/notifications",
      icon: HiBell,
      roles: ["student", "adviser", "panelist", "admin", "research_coordinator", "faculty"],
    },
  ];

  const isItemActive = (path) => {
    const currentPath = location.pathname;
    if (path === "/proposals") return currentPath.startsWith("/proposals");
    if (path === "/admin/users") return currentPath.startsWith("/admin/users");
    if (path === "/admin/advisers") return currentPath.startsWith("/admin/advisers");
    if (path === "/admin/courses") return currentPath.startsWith("/admin/courses");
    if (path === "/admin/manuscripts") return currentPath.startsWith("/admin/manuscripts") || currentPath.startsWith("/manuscripts");
    if (path === "/admin/analytics") return currentPath.startsWith("/admin/analytics");
    if (path === "/admin/calendar") return currentPath.startsWith("/admin/calendar") || currentPath.startsWith("/admin/master-calendar");
    if (path === "/calendar") return currentPath === "/calendar";
    return currentPath === path;
  };

  const renderContent = (expanded, isMobile = false) => (
    <div className={`flex flex-col h-full bg-white dark:bg-[#15161e] border border-gray-200/90 dark:border-[#222433] ${isMobile ? 'rounded-r-2xl' : 'rounded-2xl'} shadow-xl shadow-gray-200/50 dark:shadow-black/60 select-none relative`}>
      {/* HEADER SECTION */}
      {expanded ? (
        <div className={`relative flex items-center justify-between shrink-0 h-16 px-3.5 ${isMobile ? 'rounded-tr-2xl' : 'rounded-t-2xl'}`}>
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 min-w-0 overflow-hidden group"
            title="CoreResearch Dashboard"
          >
            <img
              src={logoImg}
              alt="CoreResearch Logo"
              width="32"
              height="32"
              className="w-8 h-8 object-contain shrink-0 drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
            />
            <span className="font-brand font-extrabold text-[14px] tracking-wide uppercase whitespace-nowrap overflow-hidden flex items-center">
              <span className="text-gray-900 dark:text-white">Core</span>
              <span className="text-gray-700 dark:text-gray-300">Research</span>
            </span>
          </Link>

          {/* Toggle Button cleanly positioned on the right inside header */}
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#252837] active:scale-95 transition-all duration-150 cursor-pointer shrink-0 group"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5 transition-colors duration-150" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" shapeRendering="geometricPrecision">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        </div>
      ) : (
        <div className={`relative flex items-center justify-center shrink-0 h-16 px-2 ${isMobile ? 'rounded-tr-2xl' : 'rounded-t-2xl'}`}>
          <button
            onClick={toggleSidebar}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1f212d] transition-all group overflow-hidden"
            title="Open sidebar"
            aria-label="Open sidebar"
          >
            {/* Logo shown by default, hidden on hover */}
            <img
              src={logoImg}
              alt="CoreResearch Logo"
              width="32"
              height="32"
              className="w-8 h-8 object-contain drop-shadow-sm transition-all duration-200 opacity-100 scale-100 group-hover:opacity-0 group-hover:scale-75 absolute"
            />
            {/* Sidebar icon hidden by default, shown on hover */}
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              shapeRendering="geometricPrecision"
              className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-all duration-200 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 absolute"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        </div>
      )}

      {/* CATEGORIZED NAVIGATION */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden whitespace-nowrap no-scrollbar ${isMobile ? 'py-1 space-y-1 px-2' : `py-3 space-y-1.5 ${expanded ? "px-3" : "px-2"}`}`}>
        {navItems.map((nav) => {
          if (nav.category) {
            const visibleItems = nav.items.filter((item) =>
              item.roles.includes(role || "student")
            );
            if (visibleItems.length === 0) return null;

            const isOpen = openDropdowns[nav.category];
            const DropdownIcon = nav.icon;
            
            const isAnyChildActive = visibleItems.some(item => isItemActive(item.path));

            return (
              <div key={nav.category} className="space-y-1">
                <button
                  onClick={() => toggleDropdown(nav.category)}
                  className={`relative flex items-center justify-between w-full rounded-r-lg font-medium transition-all duration-150 border-l-[3px] group ${
                    expanded
                      ? `h-10 px-3 text-[12px]`
                      : "justify-center h-10 w-10 mx-auto"
                  } ${
                    isAnyChildActive && !isOpen
                      ? "bg-blue-50/50 dark:bg-blue-500/5 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30"
                      : "text-gray-600 dark:text-[#a0a5ba] hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1a1c26] border-transparent"
                  }`}
                  title={!expanded ? nav.category : undefined}
                >
                  <div className={`flex items-center flex-1 min-w-0 ${expanded ? "gap-3" : "justify-center"}`}>
                    <DropdownIcon
                      className={`w-5 h-5 shrink-0 transition-colors duration-150 ${
                        isAnyChildActive && !isOpen
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-500 dark:text-[#888ca3] group-hover:text-gray-800 dark:group-hover:text-white"
                      }`}
                    />
                    {expanded && (
                      <span className="whitespace-nowrap truncate">{nav.category}</span>
                    )}
                  </div>
                  {expanded && (
                    isOpen ? (
                      <HiMinus className="w-4 h-4 shrink-0 text-gray-600 dark:text-gray-300 transition-transform duration-200" />
                    ) : (
                      <HiPlus className="w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200" />
                    )
                  )}
                </button>

                {isOpen && expanded && (
                  <div className="pl-4 space-y-1 mt-1">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const active = isItemActive(item.path);

                      return (
                        <Link
                          key={item.label}
                          to={item.path}
                          onClick={isMobile ? onCloseMobile : undefined}
                          className={`relative w-full flex items-center rounded-r-lg font-medium transition-all duration-150 border-l-[3px] ${
                            isMobile ? "h-9 px-3 text-[12px]" : "h-10 px-3 text-[12px]"
                          } gap-3 ${
                            active
                              ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold border-blue-600 dark:border-blue-500"
                              : "text-gray-500 dark:text-[#888ca3] hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1a1c26] border-transparent"
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                              active
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-400 dark:text-[#6a6d85]"
                            }`}
                          />
                          <span className="whitespace-nowrap">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          } else {
            if (!nav.roles.includes(role || "student")) return null;

            const Icon = nav.icon;
            const active = isItemActive(nav.path);

            return (
              <Link
                key={nav.label}
                to={nav.path}
                onClick={isMobile ? onCloseMobile : undefined}
                className={`relative w-full flex items-center rounded-r-lg font-medium transition-all duration-150 border-l-[3px] ${
                  expanded
                    ? `gap-3 ${isMobile ? "h-9 px-3 text-[12px]" : "h-10 px-3 text-[12px]"}`
                    : "justify-center h-10 w-10 mx-auto"
                } ${
                  active
                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold border-blue-600 dark:border-blue-500"
                    : "text-gray-500 dark:text-[#888ca3] hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1a1c26] border-transparent"
                }`}
                title={!expanded ? nav.label : undefined}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors duration-150 ${
                    active
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-500 dark:text-[#888ca3] group-hover:text-gray-800 dark:group-hover:text-white"
                  }`}
                />
                {expanded && (
                  <span className="whitespace-nowrap">{nav.label}</span>
                )}
              </Link>
            );
          }
        })}
      </div>

      {/* BOTTOM SECTION: THEME SWITCH & LOGOUT */}
      <div className={`${isMobile ? 'p-2 pt-1.5' : 'p-3'} border-t border-gray-100 dark:border-[#202230] shrink-0 space-y-1.5 ${expanded ? (isMobile ? 'px-2' : 'px-3') : 'px-2'}`}>
        


        {/* LOGOUT BUTTON */}
        <button
          onClick={handleLogout}
          className={`relative flex items-center text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-150 rounded-xl overflow-hidden ${
            expanded
              ? "gap-2.5 h-9 px-3 w-full"
              : "justify-center h-10 w-10 mx-auto"
          }`}
          title={!expanded ? "Logout" : undefined}
        >
          <HiArrowRightOnRectangle className={`shrink-0 text-red-500 dark:text-red-400 ${expanded ? "w-4 h-4" : "w-5 h-5"}`} />
          {expanded && (
            <span className="whitespace-nowrap">
              Logout
            </span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Container-like Sidebar in Flexbox flow that actively pushes content */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 sticky top-0 h-screen p-3 z-30 select-none whitespace-nowrap ${
          isExpanded ? "w-[275px]" : "w-[80px]"
        }`}
      >
        {renderContent(isExpanded, false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-[260px] h-full z-50 animate-slide-in">
            {renderContent(true, true)}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
