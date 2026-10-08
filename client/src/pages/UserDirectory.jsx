// src/pages/UserDirectory.jsx
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { Avatar } from "../components/ui/Avatar";
import { Pagination } from "../components/ui/Pagination";
import { useConfirm } from "../context/ConfirmContext";
import { useAuth } from "../context/AuthContext";
import {
  HiMagnifyingGlass,
  HiShieldCheck,
  HiPencilSquare,
  HiTrash,
  HiAcademicCap,
  HiUserGroup,
  HiFunnel,
  HiXMark,
} from "react-icons/hi2";
import { userService } from "../services/user.service";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";
import { studentService } from "../services/student.service";
import { groupService } from "../services/group.service";
import { researchWorkspaceService } from "../services/researchWorkspace.service";

export const UserDirectory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Redirect legacy pending or rejected query params to the dedicated User Requests page
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "pending" || tabParam === "rejected") {
      navigate(`/admin/user-requests?tab=${tabParam}`, { replace: true });
    }
  }, [searchParams, navigate]);

  // Tab State: only active role tabs (Students, Faculty, Admin). Default is "student".
  const initialTab = ["faculty", "admin"].includes(searchParams.get("tab"))
    ? searchParams.get("tab")
    : "student";

  const [selectedTab, setSelectedTab] = useState(initialTab);

  // Data & Pagination State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  // Academic Configuration State
  const [courses, setCourses] = useState([]);
  const [allSectionsByCourse, setAllSectionsByCourse] = useState({});

  // Student Academic Filter State (BSIT -> WMAD, SMP, AMG | BSCS -> IS)
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");

  // Action State
  const [updatingUid, setUpdatingUid] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");

  // Manage Profile Modal State
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [manageForm, setManageForm] = useState({
    fullName: "",
    studentIdOrEmployeeId: "",
    email: "",
    role: "student",
    courseId: "bsit",
    specializationId: "wmad",
    sectionId: "",
    enrollmentStatus: "enrolled",
  });
  const [studentSections, setStudentSections] = useState([]);
  const [studentResearchInfo, setStudentResearchInfo] = useState({
    group: null,
    workspace: null,
    loading: false,
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const { confirm } = useConfirm();
  const searchTimeoutRef = useRef(null);

  // ---------------------------------------------------------------------------
  // 1. Initial Academic Config Fetch
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadAcademicConfig = async () => {
      try {
        const coursesData = await courseService.getAllCourses();
        setCourses(coursesData);
        const sectionMap = {};
        await Promise.all(
          coursesData.map(async (c) => {
            try {
              const secs = await sectionService.getSectionsByCourseId(c.id);
              sectionMap[c.id] = secs;
            } catch {
              sectionMap[c.id] = [];
            }
          })
        );
        setAllSectionsByCourse(sectionMap);
      } catch (err) {
        console.warn("[UserDirectory] Failed to load academic config:", err);
      }
    };

    loadAcademicConfig();
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Paginated Data Retrieval (Active/Approved Accounts Only)
  // ---------------------------------------------------------------------------
  const fetchActiveUsers = async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    try {
      const isStudentTab = selectedTab === "student";
      const result = await userService.getPaginatedUsers({
        page: targetPage,
        limit: targetLimit,
        role: selectedTab, // "student" | "faculty" | "admin"
        status: "approved", // Only active/approved accounts in User Directory
        search: search.trim(),
        program: isStudentTab ? selectedProgram : undefined,
        specialization: isStudentTab ? selectedSpecialization : undefined,
      });

      setUsers(result.users);
      setTotalUsers(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("[UserDirectory] fetchActiveUsers error:", error);
      showToast("Error loading active user accounts.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveUsers(page, limit);
  }, [page, limit, selectedTab, selectedProgram, selectedSpecialization]);

  const handleProgramFilterChange = (prog) => {
    setSelectedProgram(prog);
    // Auto-adjust or clear specialization if it's incompatible with new program selection
    if (prog === "BSIT" && selectedSpecialization === "IS") {
      setSelectedSpecialization("");
    } else if (prog === "BSCS" && ["WMAD", "SMP", "AMG"].includes(selectedSpecialization)) {
      setSelectedSpecialization("");
    }
    setPage(1);
  };

  const handleSpecializationFilterChange = (spec) => {
    setSelectedSpecialization(spec);
    // Align program if a specific major is selected while program is still "All"
    if (spec === "IS" && selectedProgram === "") {
      setSelectedProgram("BSCS");
    } else if (["WMAD", "SMP", "AMG"].includes(spec) && selectedProgram === "") {
      setSelectedProgram("BSIT");
    }
    setPage(1);
  };

  const handleClearFilters = () => {
    setSelectedProgram("");
    setSelectedSpecialization("");
    setSearch("");
    setPage(1);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchActiveUsers(1, limit);
    }, 300);
  };

  const showToast = (message, variant = "success") => {
    setToastMessage(message);
    setToastVariant(variant);
  };

  // ---------------------------------------------------------------------------
  // 3. User Actions (Role update, delete)
  // ---------------------------------------------------------------------------
  const handleRoleChange = async (uid, newRole) => {
    setUpdatingUid(uid);
    try {
      await userService.updateUser(uid, { role: newRole });
      showToast(`Role updated to ${newRole.toUpperCase()} successfully.`);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
      );
    } catch (error) {
      showToast(`Failed to update role: ${error.message}`, "error");
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleDeleteClick = async (u) => {
    const confirmed = await confirm({
      title: "Confirm Delete",
      message: `Are you sure you want to permanently delete account for ${u.fullName || u.email}? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      if (u.role === "student") {
        try {
          const group = await groupService.getGroupByStudentId(u.uid);
          if (group) {
            if (group.memberIds && group.memberIds.length === 1 && group.memberIds[0] === u.uid) {
              const ws = await researchWorkspaceService.getWorkspaceByStudentOrGroup(u.uid).catch(() => null);
              if (ws) {
                await researchWorkspaceService.deleteWorkspace(ws.id).catch(() => {});
              }
              await groupService.deleteGroup(group.id);
            } else {
              await groupService.removeMemberFromGroup(group.id, u.uid);
            }
          }
        } catch (e) {
          console.warn("[UserDirectory] Group cleanup warning:", e);
        }
      }

      await userService.deleteUser(u.uid);
      showToast("User account deleted successfully.");
      fetchActiveUsers(page, limit);
    } catch (error) {
      showToast(`Failed to delete user: ${error.message}`, "error");
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Integrated Profile & Academic Management Modal
  // ---------------------------------------------------------------------------
  const handleOpenManageModal = async (u) => {
    setSelectedUser(u);

    let cId = u.courseId;
    if (!cId || !courses.some((c) => c.id === cId)) {
      if (u.programCode?.toUpperCase() === "BSCS" || u.program?.includes("Computer Science")) {
        cId = "bscs";
      } else {
        cId = "bsit";
      }
    }

    let sId = u.specializationId;
    if (!sId) {
      const text = (u.majorCode || u.programSpecialization || u.major || "").toUpperCase();
      if (text.includes("WMAD")) sId = "wmad";
      else if (text.includes("AMG")) sId = "amg";
      else if (text.includes("SMP")) sId = "smp";
      else if (text.includes("IS")) sId = "is";
    }

    let secId = u.sectionId;
    const secName = u.sectionName || u.section || "A";
    if (!secId || secId === secName) {
      secId = `${cId}-sec-${secName.toLowerCase()}`;
    }

    setManageForm({
      fullName: u.fullName || "",
      studentIdOrEmployeeId: u.studentIdOrEmployeeId || "",
      email: u.email || "",
      role: u.role || "student",
      courseId: cId || "bsit",
      specializationId: sId || "wmad",
      sectionId: secId || "",
      enrollmentStatus: u.enrollmentStatus || "enrolled",
    });

    if (cId) {
      const existingSecs = allSectionsByCourse[cId];
      if (existingSecs && existingSecs.length > 0) {
        setStudentSections(existingSecs);
      } else {
        setStudentSections([
          { id: `${cId}-sec-a`, name: "A" },
          { id: `${cId}-sec-b`, name: "B" },
          { id: `${cId}-sec-c`, name: "C" },
        ]);
      }
    } else {
      setStudentSections([]);
    }

    setStudentResearchInfo({ group: null, workspace: null, loading: u.role === "student" });
    setManageModalOpen(true);

    if (u.role === "student") {
      try {
        const [grp, ws] = await Promise.all([
          groupService.getGroupByStudentId(u.uid).catch(() => null),
          researchWorkspaceService.getWorkspaceByStudentOrGroup(u.uid).catch(() => null),
        ]);
        setStudentResearchInfo({ group: grp, workspace: ws, loading: false });
      } catch {
        setStudentResearchInfo({ group: null, workspace: null, loading: false });
      }
    }
  };

  const handleSaveManageModal = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSavingProfile(true);

    try {
      const courseObj = courses.find((c) => c.id === manageForm.courseId);
      const specObj = courseObj?.specializations?.find(
        (s) => s.id === manageForm.specializationId
      );
      const secObj = (allSectionsByCourse[manageForm.courseId] || []).find(
        (s) => s.id === manageForm.sectionId
      );
      const secName =
        secObj?.name ||
        (manageForm.sectionId?.match(/-sec-([a-z0-9])$/i)?.[1]?.toUpperCase()) ||
        manageForm.sectionId ||
        "A";

      const programName =
        courseObj?.name ||
        (manageForm.courseId === "bscs"
          ? "Bachelor of Science in Computer Science"
          : "Bachelor of Science in Information Technology");
      const progCode =
        courseObj?.code || (manageForm.courseId === "bscs" ? "BSCS" : "BSIT");
      const majorName = specObj
        ? `${specObj.name} (${specObj.code})`
        : specObj?.name || "";
      const majCode = specObj?.code || manageForm.specializationId?.toUpperCase() || "";

      const isStudent = manageForm.role === "student";

      const academicPayload = isStudent
        ? {
            courseId: manageForm.courseId,
            program_id: manageForm.courseId,
            program: programName,
            programCode: progCode,
            specializationId: manageForm.specializationId,
            majorCode: majCode,
            programSpecialization: majorName,
            major: majorName,
            sectionId: manageForm.sectionId,
            sectionName: secName,
            section: secName,
            enrollmentStatus: manageForm.enrollmentStatus,
          }
        : {};

      const profilePayload = {
        fullName: manageForm.fullName.trim(),
        studentIdOrEmployeeId: manageForm.studentIdOrEmployeeId.trim(),
        studentId: manageForm.studentIdOrEmployeeId.trim(),
        role: manageForm.role,
        role_id: manageForm.role,
        ...academicPayload,
      };

      if (isStudent) {
        await studentService.updateStudentAcademicInfo(selectedUser.uid, academicPayload);
      }
      await userService.updateUser(selectedUser.uid, profilePayload);

      showToast(`Profile for "${manageForm.fullName}" updated successfully!`);
      setManageModalOpen(false);
      fetchActiveUsers(page, limit);
    } catch (err) {
      console.error("[UserDirectory] profile save error:", err);
      showToast(err.message || "Failed to save user profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Column Definitions by Active Role Tab
  // ---------------------------------------------------------------------------
  const studentColumns = [
    { label: "Student Name", className: "w-[240px] min-w-[200px]" },
    { label: "Student ID", className: "min-w-[130px]" },
    { label: "Program", className: "min-w-[100px]" },
    { label: "Specialization", className: "min-w-[130px]" },
    { label: "Section", className: "min-w-[100px]" },
    { label: "Actions", className: "text-right min-w-[120px]" },
  ];

  const facultyAdminColumns = [
    { label: "Name", className: "w-[300px] min-w-[220px]" },
    { label: "Email", className: "min-w-[240px]" },
    { label: "Actions", className: "text-right min-w-[120px]" },
  ];

  const activeColumns = selectedTab === "student" ? studentColumns : facultyAdminColumns;

  const getProgramDisplay = (u) => {
    if (u.programCode) return u.programCode;
    if (u.program?.includes("Computer Science")) return "BSCS";
    if (u.program?.includes("Information Technology")) return "BSIT";
    return "BSIT";
  };

  const getSpecializationDisplay = (u) => {
    if (u.majorCode) return u.majorCode;
    const specStr = (u.programSpecialization || u.major || "").toUpperCase();
    if (specStr.includes("WMAD")) return "WMAD";
    if (specStr.includes("AMG")) return "AMG";
    if (specStr.includes("SMP")) return "SMP";
    if (specStr.includes("IS")) return "IS";
    return "—";
  };

  const getSectionDisplay = (u) => {
    if (u.sectionName) {
      const clean = u.sectionName.trim();
      return clean.length <= 2 ? `Section ${clean.toUpperCase()}` : clean;
    }
    if (u.sectionId) {
      const match = u.sectionId.match(/-sec-([a-z0-9])$/i);
      if (match) return `Section ${match[1].toUpperCase()}`;
    }
    return "Section A";
  };

  return (
    <div className="space-y-6 font-inter">
      <PageHeader
        icon={HiShieldCheck}
        title="User Directory"
        description="Active institutional accounts organized by role."
      />

      {toastMessage && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          onClose={() => setToastMessage("")}
        />
      )}

      {/* Filter & Role Tabs Bar */}
      <div className="flex flex-col md:flex-row items-end justify-between gap-4 pb-2">
        <div className="w-full md:max-w-md">
          <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">
            Search
          </label>
          <Input
            placeholder={
              selectedTab === "student"
                ? "Search by student name, email, ID, program, or section..."
                : "Search by name, email, or role..."
            }
            icon={HiMagnifyingGlass}
            value={search}
            onChange={handleSearchChange}
            className="shadow-sm"
          />
        </div>

        {/* Role Tabs: Students, Faculty, Admin (NO "All" tab) */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 h-10">
          {[
            { id: "student", label: "Students" },
            { id: "faculty", label: "Faculty" },
            { id: "admin", label: "Admin" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedTab(tab.id);
                setPage(1);
                setSearchParams({ tab: tab.id });
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                selectedTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Student Academic Filters (Program: BSIT/BSCS -> Specialization: WMAD/SMP/AMG/IS) */}
      {selectedTab === "student" && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50/80 dark:bg-[#12131c] border border-gray-200/80 dark:border-[#222433] rounded-2xl text-xs shadow-xs">
          <div className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-gray-300 mr-1">
            <HiFunnel className="w-4 h-4 text-primary" />
            <span>Academic Filters:</span>
          </div>

          {/* Program Filter: All, BSIT, BSCS */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider">
              Program:
            </span>
            <select
              value={selectedProgram}
              onChange={(e) => handleProgramFilterChange(e.target.value)}
              className="h-9 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#2b2d3f] rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 px-3 py-1 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer shadow-xs"
            >
              <option value="">All Programs</option>
              <option value="BSIT">BSIT (Information Technology)</option>
              <option value="BSCS">BSCS (Computer Science)</option>
            </select>
          </div>

          {/* Specialization Filter: BSIT -> WMAD, SMP, AMG | BSCS -> IS */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider">
              Specialization:
            </span>
            <select
              value={selectedSpecialization}
              onChange={(e) => handleSpecializationFilterChange(e.target.value)}
              className="h-9 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#2b2d3f] rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 px-3 py-1 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer shadow-xs"
            >
              <option value="">All Specializations</option>
              {selectedProgram === "BSIT" ? (
                <>
                  <option value="WMAD">WMAD - Web & Mobile Apps</option>
                  <option value="SMP">SMP - Service Management Program</option>
                  <option value="AMG">AMG - Animation & Motion Graphics</option>
                </>
              ) : selectedProgram === "BSCS" ? (
                <>
                  <option value="IS">IS - Intelligent Systems</option>
                </>
              ) : (
                <>
                  <optgroup label="BSIT Specializations">
                    <option value="WMAD">WMAD - Web & Mobile Apps</option>
                    <option value="SMP">SMP - Service Management</option>
                    <option value="AMG">AMG - Animation & Motion Graphics</option>
                  </optgroup>
                  <optgroup label="BSCS Specializations">
                    <option value="IS">IS - Intelligent Systems</option>
                  </optgroup>
                </>
              )}
            </select>
          </div>

          {/* Clear Filters Button */}
          {(selectedProgram || selectedSpecialization) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <HiXMark className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          )}
        </div>
      )}

      {/* Role-Specific Active Accounts Table */}
      <DataTable columns={activeColumns} className="shadow-sm">
        {loading ? (
          <TableRow>
            <TableCell colSpan={activeColumns.length} className="py-12 text-center text-gray-400 dark:text-gray-500">
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm">Loading active accounts...</span>
              </div>
            </TableCell>
          </TableRow>
        ) : users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={activeColumns.length} className="py-16 text-center text-gray-400 dark:text-gray-500 space-y-2">
              <div className="text-base font-bold text-gray-700 dark:text-gray-300">
                No active accounts found
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {search
                  ? "No accounts match your search filter."
                  : `There are currently no active ${selectedTab} accounts in the directory.`}
              </div>
            </TableCell>
          </TableRow>
        ) : (
          users.map((u, index) => (
            <TableRow key={u.uid || u.id || index}>
              {/* 1. Name & Email */}
              <TableCell className="w-[260px] min-w-[200px]">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={u.profile_image || u.photoURL}
                    name={u.fullName || "User"}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                      {u.fullName || "Unnamed User"}
                    </div>
                    <div className="text-gray-400 dark:text-gray-500 text-[11px] truncate">
                      {u.email}
                    </div>
                  </div>
                </div>
              </TableCell>

              {/* Student View Specific Columns */}
              {selectedTab === "student" ? (
                <>
                  {/* Student ID */}
                  <TableCell className="font-semibold text-gray-700 dark:text-gray-300 text-xs">
                    {u.studentIdOrEmployeeId || "—"}
                  </TableCell>

                  {/* Program */}
                  <TableCell className="font-semibold text-gray-700 dark:text-gray-300 text-xs">
                    {getProgramDisplay(u)}
                  </TableCell>

                  {/* Specialization */}
                  <TableCell className="font-semibold text-gray-700 dark:text-gray-300 text-xs">
                    {getSpecializationDisplay(u)}
                  </TableCell>

                  {/* Section */}
                  <TableCell className="font-semibold text-gray-700 dark:text-gray-300 text-xs">
                    {getSectionDisplay(u)}
                  </TableCell>
                </>
              ) : (
                /* Faculty & Admin Views: Streamlined to Name, Email, and Actions */
                <TableCell className="text-gray-600 dark:text-gray-300 text-xs">
                  {u.email}
                </TableCell>
              )}

              {/* Actions */}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => handleOpenManageModal(u)}
                    title={selectedTab === "student" ? "Manage Student Profile" : "Edit Account"}
                    className="!px-2.5 !py-1 text-xs"
                  >
                    <HiPencilSquare className="w-3.5 h-3.5 mr-1 text-blue-500" />
                    Manage
                  </Button>

                  <button
                    className="text-red-400 hover:text-red-600 transition-colors p-1"
                    title="Delete Account"
                    onClick={() => handleDeleteClick(u)}
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </DataTable>

      {/* Pagination Controls */}
      <Pagination
        page={page}
        totalPages={totalPages}
        total={totalUsers}
        limit={limit}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
      />

      {/* Profile Management Modal */}
      <Modal
        isOpen={manageModalOpen}
        onClose={() => setManageModalOpen(false)}
        title={selectedUser?.role === "student" ? "Manage Student Profile" : "Edit Account Details"}
        icon={HiAcademicCap}
        maxWidth="max-w-xl"
      >
        {selectedUser && (
          <form onSubmit={handleSaveManageModal} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Full Name
                </label>
                <Input
                  value={manageForm.fullName}
                  onChange={(e) => setManageForm({ ...manageForm, fullName: e.target.value })}
                  className="shadow-sm text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  {manageForm.role === "student" ? "Student ID Number" : "Employee ID Number"}
                </label>
                <Input
                  value={manageForm.studentIdOrEmployeeId}
                  onChange={(e) => setManageForm({ ...manageForm, studentIdOrEmployeeId: e.target.value })}
                  className="shadow-sm text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={manageForm.email}
                  disabled={true}
                  className="shadow-sm text-xs bg-gray-100 dark:bg-[#1f202e] opacity-75 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  System Role
                </label>
                <Select
                  value={manageForm.role}
                  onChange={(e) => setManageForm({ ...manageForm, role: e.target.value })}
                  className="text-xs"
                >
                  <option value="student">Student</option>
                  <optgroup label="Faculty Roles">
                    <option value="adviser">Adviser</option>
                    <option value="research_coordinator">Research Coordinator</option>
                    <option value="panelist">Panelist</option>
                  </optgroup>
                  <optgroup label="System Roles">
                    <option value="admin">Administrator</option>
                  </optgroup>
                </Select>
              </div>

              {manageForm.role === "student" && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      Degree Program
                    </label>
                    <select
                      value={manageForm.courseId}
                      onChange={(e) => {
                        const cId = e.target.value;
                        setManageForm({
                          ...manageForm,
                          courseId: cId,
                          specializationId: "",
                          sectionId: "",
                        });
                        setStudentSections(allSectionsByCourse[cId] || []);
                      }}
                      className="w-full text-xs bg-white dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-2.5 text-gray-900 dark:text-white"
                    >
                      <option value="">No Program Assigned</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      Specialization
                    </label>
                    <select
                      value={manageForm.specializationId}
                      onChange={(e) => setManageForm({ ...manageForm, specializationId: e.target.value })}
                      className="w-full text-xs bg-white dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-2.5 text-gray-900 dark:text-white"
                      disabled={!manageForm.courseId}
                    >
                      <option value="">None / General</option>
                      {(courses.find((c) => c.id === manageForm.courseId)?.specializations || []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      Section Assignment
                    </label>
                    <select
                      value={manageForm.sectionId}
                      onChange={(e) => setManageForm({ ...manageForm, sectionId: e.target.value })}
                      className="w-full text-xs bg-white dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-2.5 text-gray-900 dark:text-white"
                      disabled={!manageForm.courseId}
                    >
                      <option value="">No Section Assigned</option>
                      {studentSections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      Enrollment Status
                    </label>
                    <select
                      value={manageForm.enrollmentStatus}
                      onChange={(e) => setManageForm({ ...manageForm, enrollmentStatus: e.target.value })}
                      className="w-full text-xs bg-white dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-2.5 text-gray-900 dark:text-white"
                    >
                      <option value="enrolled">Enrolled - Regular</option>
                      <option value="irregular">Enrolled - Irregular</option>
                      <option value="leave">Leave of Absence</option>
                      <option value="graduated">Graduated</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Research Group Info for Students */}
            {manageForm.role === "student" && (
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#1c1d28] border border-gray-100 dark:border-[#222433] space-y-2 mt-2">
                <div className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <HiUserGroup className="w-3.5 h-3.5 text-blue-500" />
                  Research Project & Group Affiliation
                </div>
                {studentResearchInfo.loading ? (
                  <div className="text-xs text-gray-400">Loading research records...</div>
                ) : studentResearchInfo.workspace || studentResearchInfo.group ? (
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-gray-500">Thesis Title: </span>
                      <strong className="text-gray-900 dark:text-white">
                        {studentResearchInfo.workspace?.title || "Title Proposal in Progress"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-500">Group Name: </span>
                      <strong className="text-gray-900 dark:text-white">
                        {studentResearchInfo.group?.name || studentResearchInfo.workspace?.groupName || "Research Group"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-500">Assigned Adviser: </span>
                      <strong className="text-gray-900 dark:text-white">
                        {studentResearchInfo.workspace?.adviserName || studentResearchInfo.group?.adviserName || "Not Assigned"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-500">Research Phase: </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {studentResearchInfo.workspace?.researchPhase || "Proposal Stage"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic">
                    Student is not currently enrolled in an active research group or manuscript workspace.
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-[#222433]">
              <Button variant="outline" size="sm" type="button" onClick={() => setManageModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={savingProfile}>
                Save Profile Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default UserDirectory;
