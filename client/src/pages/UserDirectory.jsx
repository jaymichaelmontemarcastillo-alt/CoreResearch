// src/pages/UserDirectory.jsx
import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { useConfirm } from "../context/ConfirmContext";
import { HiMagnifyingGlass, HiShieldCheck, HiFunnel, HiArrowPath, HiPencilSquare, HiTrash } from "react-icons/hi2";
import { userService } from "../services/user.service";

export const UserDirectory = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [updatingUid, setUpdatingUid] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await userService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("[UserDirectory] fetch users error:", error);
      setToastMessage("Error fetching users from database.");
    } finally {
      setLoading(false);
    }
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
      setToastMessage("User info updated successfully.");
      setUsers((prev) =>
        prev.map((u) => (u.uid === userToEdit.uid ? { ...u, ...editFormData } : u))
      );
      setEditModalOpen(false);
    } catch (error) {
      alert(`Failed to update user: ${error.message}`);
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
      await userService.deleteUser(u.uid);
      setToastMessage("User deleted successfully.");
      setUsers((prev) => prev.filter((user) => user.uid !== u.uid));
    } catch (error) {
      alert(`Failed to delete user: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (uid, newRole) => {
    setUpdatingUid(uid);
    try {
      await userService.updateUser(uid, { role: newRole });
      setToastMessage(`Role updated to ${newRole.toUpperCase()} successfully.`);
      
      // Update local state instead of full refetch for better UX
      setUsers((prev) => 
        prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
      );
    } catch (error) {
      alert(`Failed to update role: ${error.message}`);
    } finally {
      setUpdatingUid(null);
    }
  };

  const roleVariants = {
    student: "blue",
    adviser: "emerald",
    panelist: "purple",
    research_coordinator: "teal",
    admin: "amber",
  };
  
  const roleDisplayNames = {
    student: "Student",
    adviser: "Adviser",
    panelist: "Panelist",
    research_coordinator: "Research Coordinator",
    admin: "Admin",
  };

  const facultyRoles = ["adviser", "research_coordinator", "panelist"];

  // ── Filtering Logic ──
  const filteredUsers = users.filter((u) => {
    // 1. Tab Filter
    if (selectedTab === "student" && u.role !== "student") return false;
    if (selectedTab === "admin" && u.role !== "admin") return false;
    if (selectedTab === "faculty" && !facultyRoles.includes(u.role)) return false;

    // 2. Search Filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const nameMatch = u.fullName?.toLowerCase().includes(q);
      const emailMatch = u.email?.toLowerCase().includes(q);
      const idMatch = u.studentIdOrEmployeeId?.toLowerCase().includes(q);
      if (!nameMatch && !emailMatch && !idMatch) return false;
    }

    return true;
  });

  const columns = [
    { label: "User Name", className: "w-[180px] min-w-[150px]" },
    { label: "User ID", className: "min-w-[120px]" },
    { label: "Department", className: "min-w-[150px]" },
    { label: "Assign Role", className: "min-w-[150px]" },
    { label: "Action", className: "text-right min-w-[80px]" },
  ];

  return (
    <div className="space-y-6 font-inter">
      <PageHeader
        icon={HiShieldCheck}
        title="User Management"
        description="Manage system users and access roles."
      />

      {toastMessage && (
        <Toast message={toastMessage} variant="success" onClose={() => setToastMessage("")} />
      )}

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-end justify-between gap-4 pb-2">
        <div className="w-full md:max-w-md">
          <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">
            Search
          </label>
          <Input
            placeholder="Search by name, email, or ID number..."
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
            { id: "student", label: "Student" },
            { id: "faculty", label: "Faculty" },
            { id: "admin", label: "Admin" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                selectedTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table */}
      <DataTable columns={columns}>
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
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                  {u.fullName ? u.fullName.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                    {u.fullName || "Unnamed User"}
                  </div>
                  <div className="text-gray-400 dark:text-gray-500 text-[11px]">{u.email}</div>
                </div>
              </TableCell>

              <TableCell className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                {u.studentIdOrEmployeeId || "—"}
              </TableCell>

              <TableCell className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                {u.department || "—"}
              </TableCell>

              <TableCell>
                <div className="w-40">
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
                </div>
              </TableCell>

              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-3">
                  <button className="text-primary hover:text-blue-600 transition-colors" title="Edit" onClick={() => handleEditClick(u)}>
                    <HiPencilSquare className="w-4 h-4" />
                  </button>
                  <button className="text-red-500 hover:text-red-600 transition-colors" title="Delete" onClick={() => handleDeleteClick(u)}>
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </DataTable>

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
