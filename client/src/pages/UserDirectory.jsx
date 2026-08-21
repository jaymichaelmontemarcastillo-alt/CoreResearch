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
import { HiMagnifyingGlass, HiShieldCheck, HiFunnel, HiArrowPath } from "react-icons/hi2";
import { userService } from "../services/user.service";

export const UserDirectory = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [updatingUid, setUpdatingUid] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

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
    { label: "User" },
    { label: "ID Number" },
    { label: "Department" },
    { label: "Current Role" },
    { label: "Assign Role", className: "text-right" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={HiShieldCheck}
        title="User Directory & RBAC Management"
        description="Manage institutional user accounts, departments, and access roles."
        actions={
          <Button variant="outline" size="sm" onClick={fetchUsers} isLoading={loading}>
            <HiArrowPath className="w-3.5 h-3.5 mr-1.5" /> Refresh List
          </Button>
        }
      />

      {toastMessage && (
        <Toast message={toastMessage} variant="success" onClose={() => setToastMessage("")} />
      )}

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full flex items-center gap-2">
          <Input
            placeholder="Search by name, email, or ID number..."
            icon={HiMagnifyingGlass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <HiFunnel className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
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
      </Card>

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
          filteredUsers.map((u) => (
            <TableRow key={u.uid}>
              <TableCell className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                  {u.fullName ? u.fullName.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm">
                    {u.fullName || "Unnamed User"}
                  </div>
                  <div className="text-gray-400 dark:text-gray-500 text-[11px]">{u.email}</div>
                </div>
              </TableCell>

              <TableCell className="font-mono text-gray-500 dark:text-gray-400 text-xs">
                {u.studentIdOrEmployeeId || "N/A"}
              </TableCell>

              <TableCell className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                {u.department || "General"}
              </TableCell>

              <TableCell>
                <Badge variant={roleVariants[u.role] || "blue"}>
                  {roleDisplayNames[u.role] ? roleDisplayNames[u.role].toUpperCase() : (u.role || "STUDENT").toUpperCase()}
                </Badge>
              </TableCell>

              <TableCell className="text-right">
                <div className="w-48 ml-auto">
                  <Select
                    value={u.role || "student"}
                    disabled={updatingUid === u.uid}
                    onChange={(e) => handleRoleChange(u.uid, e.target.value)}
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
            </TableRow>
          ))
        )}
      </DataTable>
    </div>
  );
};

export default UserDirectory;
