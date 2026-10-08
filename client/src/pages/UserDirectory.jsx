// src/pages/UserDirectory.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { Avatar } from "../components/ui/Avatar";
import { useConfirm } from "../context/ConfirmContext";
import { useAuth } from "../context/AuthContext";
import {
  HiMagnifyingGlass,
  HiShieldCheck,
  HiFunnel,
  HiArrowPath,
  HiPencilSquare,
  HiTrash,
  HiCheck,
  HiXMark,
  HiClock,
} from "react-icons/hi2";
import { userService } from "../services/user.service";
import { groupService } from "../services/group.service";
import { researchWorkspaceService } from "../services/researchWorkspace.service";

export const UserDirectory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "pending" ? "pending" : "all";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [updatingUid, setUpdatingUid] = useState(null);
  const [actionLoadingUid, setActionLoadingUid] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    studentIdOrEmployeeId: "",
    department: "",
    email: "",
    role: "student",
  });
  const [saving, setSaving] = useState(false);
  const { confirm } = useConfirm();
  const { currentUser } = useAuth();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await userService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("[UserDirectory] fetch users error:", error);
      showToast("Error fetching users from database.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "pending") {
      setSelectedTab("pending");
    }
  }, [searchParams]);

  const showToast = (message, variant = "success") => {
    setToastMessage(message);
    setToastVariant(variant);
  };

  const handleEditClick = (u) => {
    setUserToEdit(u);
    setEditFormData({
      fullName: u.fullName || "",
      studentIdOrEmployeeId: u.studentIdOrEmployeeId || "",
      department: u.department || "",
      email: u.email || "",
      role: u.role || "student",
    });
    setEditModalOpen(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    const confirmed = await confirm({
      title: "Confirm Save",
      message: "Are you sure you want to save these changes?",
      confirmText: "Save",
      variant: "primary",
    });

    if (!confirmed) return;

    setSaving(true);
    try {
      await userService.updateUser(userToEdit.uid, editFormData);
      showToast("User info updated successfully.");
      setUsers((prev) =>
        prev.map((u) => (u.uid === userToEdit.uid ? { ...u, ...editFormData } : u))
      );
      setEditModalOpen(false);
    } catch (error) {
      showToast(`Failed to update user: ${error.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = async (u) => {
    const confirmed = await confirm({
      title: "Confirm Delete",
      message: `Are you sure you want to permanently delete ${u.fullName || u.email}? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      if (u.role === 'student') {
        try {
          const group = await groupService.getGroupByStudentId(u.uid);
          if (group) {
            if (group.memberIds && group.memberIds.length === 1 && group.memberIds[0] === u.uid) {
              // Delete the workspace/progress if they are the only member
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
          console.warn("[UserDirectory] Failed to process group deletion logic before deleting user", e);
        }
      }

      await userService.deleteUser(u.uid);
      showToast("User deleted successfully.");
      setUsers((prev) => prev.filter((user) => user.uid !== u.uid));
    } catch (error) {
      showToast(`Failed to delete user: ${error.message}`, "error");
    }
  };

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

  // ── Admin Approve Pending User ──
  const handleApproveUser = async (u) => {
    const confirmed = await confirm({
      title: "Approve User Registration",
      message: `Are you sure you want to approve registration for ${u.fullName || u.email} (${u.studentIdOrEmployeeId})? This will grant them access to the Dashboard.`,
      confirmText: "Approve",
      variant: "primary",
    });

    if (!confirmed) return;

    setActionLoadingUid(u.uid);
    try {
      await userService.approveUser(u.uid, currentUser?.uid || "admin");
      showToast(`User ${u.fullName || u.email} approved successfully.`);
      setUsers((prev) =>
        prev.map((user) =>
          user.uid === u.uid
            ? { ...user, status: "approved", is_approved: true }
            : user
        )
      );
    } catch (err) {
      showToast(`Failed to approve student: ${err.message}`, "error");
    } finally {
      setActionLoadingUid(null);
    }
  };

  // ── Admin Reject Pending User ──
  const handleRejectUser = async (u) => {
    const confirmed = await confirm({
      title: "Reject User Registration",
      message: `Are you sure you want to reject the registration of ${u.fullName || u.email}? They will not be able to log in to CoreResearch.`,
      confirmText: "Reject",
      variant: "danger",
    });

    if (!confirmed) return;

    setActionLoadingUid(u.uid);
    try {
      await userService.rejectUser(u.uid, currentUser?.uid || "admin");
      showToast(`User registration rejected for ${u.fullName || u.email}.`);
      setUsers((prev) =>
        prev.map((user) =>
          user.uid === u.uid
            ? { ...user, status: "rejected", is_approved: false }
            : user
        )
      );
    } catch (err) {
      showToast(`Failed to reject student: ${err.message}`, "error");
    } finally {
      setActionLoadingUid(null);
    }
  };

  const facultyRoles = ["adviser", "research_coordinator", "panelist"];

  // Pending users calculation
  const pendingUsers = users.filter(
    (u) => (u.status === "pending" || u.is_approved === false)
  );

  // ── Filtering Logic ──
  const filteredUsers = users.filter((u) => {
    // 1. Tab Filter
    if (selectedTab === "pending") {
      if (u.status !== "pending" && u.is_approved !== false) {
        return false;
      }
    } else if (selectedTab === "student") {
      if (u.role !== "student") return false;
    } else if (selectedTab === "admin") {
      if (u.role !== "admin") return false;
    } else if (selectedTab === "faculty") {
      if (!facultyRoles.includes(u.role)) return false;
    }

    // 2. Search Filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const nameMatch = u.fullName?.toLowerCase().includes(q);
      const emailMatch = u.email?.toLowerCase().includes(q);
      const idMatch = u.studentIdOrEmployeeId?.toLowerCase().includes(q);
      const programMatch = u.programCode?.toLowerCase().includes(q) || u.program?.toLowerCase().includes(q);
      const majorMatch = u.majorCode?.toLowerCase().includes(q) || u.programSpecialization?.toLowerCase().includes(q);
      const sectionMatch = u.sectionName?.toLowerCase().includes(q);
      if (!nameMatch && !emailMatch && !idMatch && !programMatch && !majorMatch && !sectionMatch) {
        return false;
      }
    }

    return true;
  });

  const isPendingView = selectedTab === "pending";

  const standardColumns = [
    { label: "User Name", className: "w-[180px] min-w-[150px]" },
    { label: "User ID", className: "min-w-[120px]" },
    { label: "Department", className: "min-w-[150px]" },
    { label: "Assign Role", className: "min-w-[150px]" },
    { label: "Action", className: "text-right min-w-[80px]" },
  ];

  const pendingColumns = [
    { label: "Student ID", className: "min-w-[120px]" },
    { label: "Name", className: "min-w-[160px]" },
    { label: "Gmail / Email", className: "min-w-[180px]" },
    { label: "Program", className: "min-w-[100px]" },
    { label: "Major", className: "min-w-[100px]" },
    { label: "Section", className: "min-w-[80px]" },
    { label: "Status", className: "min-w-[100px]" },
    { label: "Actions", className: "text-right min-w-[160px]" },
  ];

  return (
    <div className="space-y-6 font-inter">
      <PageHeader
        icon={HiShieldCheck}
        title="User Management"
        description="Manage system users, access roles, and approve new student registrations."
      />

      {toastMessage && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          onClose={() => setToastMessage("")}
        />
      )}

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-end justify-between gap-4 pb-2">
        <div className="w-full md:max-w-md">
          <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">
            Search
          </label>
          <Input
            placeholder="Search by name, email, student ID, program, or section..."
            icon={HiMagnifyingGlass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 h-10">
          <div className="hidden md:flex h-10 items-center px-1">
            <HiFunnel className="w-4 h-4 text-gray-300 dark:text-[#6b6f84]" />
          </div>
          {[
            { id: "all", label: "All" },
            {
              id: "pending",
              label: "Pending",
              badge: pendingUsers.length > 0 ? pendingUsers.length : null,
            },
            { id: "student", label: "Student" },
            { id: "faculty", label: "Faculty" },
            { id: "admin", label: "Admin" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedTab(tab.id);
                if (tab.id === "pending") {
                  setSearchParams({ tab: "pending" });
                } else {
                  setSearchParams({});
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                selectedTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500 text-white font-bold animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table */}
      {isPendingView ? (
        // ── PENDING STUDENT REGISTRATIONS TABLE ──
        <DataTable columns={pendingColumns}>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-gray-400 dark:text-gray-500">
                Loading pending registrations...
              </TableCell>
            </TableRow>
          ) : filteredUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-12 text-center text-gray-400 dark:text-gray-500 space-y-2">
                <div className="text-base font-bold text-gray-700 dark:text-gray-300">
                  No Pending Registrations
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  There are currently no new student registrations awaiting approval.
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredUsers.map((u) => (
              <TableRow key={u.uid}>
                {/* Student ID */}
                <TableCell className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  {u.studentIdOrEmployeeId || "—"}
                </TableCell>

                {/* Name */}
                <TableCell className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                  {u.fullName || `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Unnamed"}
                </TableCell>

                {/* Gmail / Email */}
                <TableCell className="text-xs text-gray-500 dark:text-gray-400">
                  {u.email}
                </TableCell>

                {/* Program */}
                <TableCell className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {u.programCode || (u.program?.includes("Information Technology") ? "BSIT" : u.program) || "BSIT"}
                </TableCell>

                {/* Major */}
                <TableCell className="text-xs text-gray-600 dark:text-gray-300">
                  {u.majorCode || (u.programSpecialization?.includes("WMAD") ? "WMAD" : u.programSpecialization?.includes("AMG") ? "AMG" : u.programSpecialization?.includes("SMP") ? "SMP" : u.programSpecialization) || "N/A"}
                </TableCell>

                {/* Section */}
                <TableCell className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  {u.sectionName || "—"}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge variant="amber" className="capitalize">
                    Pending
                  </Badge>
                </TableCell>

                {/* Actions: Approve / Reject */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="xs"
                      variant="primary"
                      disabled={actionLoadingUid === u.uid}
                      onClick={() => handleApproveUser(u)}
                      className="!px-3 !py-1 text-xs"
                    >
                      {actionLoadingUid === u.uid ? "Approving..." : "Approve"}
                    </Button>
                    <Button
                      size="xs"
                      variant="danger"
                      disabled={actionLoadingUid === u.uid}
                      onClick={() => handleRejectUser(u)}
                      className="!px-3 !py-1 text-xs"
                    >
                      {actionLoadingUid === u.uid ? "Rejecting..." : "Reject"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </DataTable>
      ) : (
        // ── STANDARD USER DIRECTORY TABLE ──
        <DataTable columns={standardColumns}>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-gray-400 dark:text-gray-500">
                Loading users from database...
              </TableCell>
            </TableRow>
          ) : filteredUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-gray-400 dark:text-gray-500">
                No users matching criteria.
              </TableCell>
            </TableRow>
          ) : (
            filteredUsers.map((u, index) => (
              <TableRow key={u.uid || u.id || index}>
                <TableCell className="flex items-center gap-3">
                  <Avatar 
                    src={u.profile_image || u.photoURL} 
                    name={u.fullName || "User"} 
                    size="sm" 
                  />
                  <div>
                    <div className="font-medium text-gray-700 dark:text-gray-300 text-sm flex items-center gap-2">
                      <span>{u.fullName || "Unnamed User"}</span>
                      {u.role === "student" && (u.status === "pending" || u.is_approved === false) && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="text-gray-400 dark:text-gray-500 text-[11px]">{u.email}</div>
                  </div>
                </TableCell>

                <TableCell className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                  {u.studentIdOrEmployeeId || "—"}
                </TableCell>

                <TableCell className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                  {u.department || (u.programCode ? `${u.programCode} • Section ${u.sectionName || ""}` : "—")}
                </TableCell>

                <TableCell>
                  <div className="w-40">
                    {u.role === 'student' ? (
                      <div className="font-medium text-gray-700 dark:text-gray-300 text-sm text-center py-1.5 px-3 border border-transparent">
                        Student
                      </div>
                    ) : (
                      <Select
                        value={u.role || "student"}
                        disabled={updatingUid === u.uid}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                        className="rounded-full !py-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm text-center"
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
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      className="text-primary hover:text-blue-600 transition-colors"
                      title="Edit"
                      onClick={() => handleEditClick(u)}
                    >
                      <HiPencilSquare className="w-4 h-4" />
                    </button>
                    <button
                      className="text-red-500 hover:text-red-600 transition-colors"
                      title="Delete"
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
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit User Info"
        noHeaderBorder={true}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleEditSave} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">User Name</label>
            <Input
              value={editFormData.fullName}
              onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
              className="shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">User ID</label>
            <Input
              value={editFormData.studentIdOrEmployeeId}
              onChange={(e) => setEditFormData({ ...editFormData, studentIdOrEmployeeId: e.target.value })}
              className="shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">Department</label>
            <Input
              value={editFormData.department}
              onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
              className="shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">Email</label>
            <Input
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              className="shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">User Role</label>
            <Select
              value={editFormData.role}
              onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
              className="shadow-sm font-medium text-gray-700 dark:text-gray-300 text-sm"
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
          
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserDirectory;
