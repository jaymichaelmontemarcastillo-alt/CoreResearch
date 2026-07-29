// src/pages/UserDirectory.jsx
import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { Search, Shield, Filter, RefreshCw } from "lucide-react";

export const UserDirectory = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [updatingUid, setUpdatingUid] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/users", {
        params: { role: selectedRole, search },
      });
      if (response.data && response.data.data) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error("[UserDirectory] fetch users error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedRole]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleRoleChange = async (uid, newRole) => {
    setUpdatingUid(uid);
    try {
      await api.patch(`/users/${uid}/role`, { role: newRole });
      setToastMessage(`Role updated to ${newRole.toUpperCase()} successfully.`);
      await fetchUsers();
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
    admin: "amber",
  };

  const columns = [
    { label: "User" },
    { label: "ID Number" },
    { label: "Department" },
    { label: "Current Role" },
    { label: "Modify Role", className: "text-right" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Shield}
        title="User Directory & RBAC Management"
        description="Manage institutional user accounts, departments, and access roles."
        actions={
          <Button variant="outline" size="sm" onClick={fetchUsers} isLoading={loading}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh List
          </Button>
        }
      />

      {toastMessage && (
        <Toast message={toastMessage} variant="success" onClose={() => setToastMessage("")} />
      )}

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <Input
            placeholder="Search by name, email, or ID number..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="secondary" size="md">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
          {["all", "student", "adviser", "panelist", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                selectedRole === r
                  ? "bg-primary text-white shadow-sm"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </Card>

      {/* Directory Table */}
      <DataTable columns={columns}>
        {loading ? (
          <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-gray-400 dark:text-gray-500">
              Loading users...
            </TableCell>
          </TableRow>
        ) : users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-gray-400 dark:text-gray-500">
              No users matching criteria.
            </TableCell>
          </TableRow>
        ) : (
          users.map((u) => (
            <TableRow key={u.uid}>
              <TableCell className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                  {u.fullName ? u.fullName.charAt(0) : "U"}
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm">{u.fullName}</div>
                  <div className="text-gray-400 dark:text-gray-500 text-[11px]">{u.email}</div>
                </div>
              </TableCell>

              <TableCell className="font-mono text-gray-500 dark:text-gray-400">
                {u.studentIdOrEmployeeId || "N/A"}
              </TableCell>

              <TableCell className="font-medium text-gray-700 dark:text-gray-300">
                {u.department || "General"}
              </TableCell>

              <TableCell>
                <Badge variant={roleVariants[u.role] || "blue"}>
                  {u.role ? u.role.toUpperCase() : "STUDENT"}
                </Badge>
              </TableCell>

              <TableCell className="text-right">
                <div className="w-36 ml-auto">
                  <Select
                    value={u.role}
                    disabled={updatingUid === u.uid}
                    onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                  >
                    <option value="student">Student</option>
                    <option value="adviser">Adviser</option>
                    <option value="panelist">Panelist</option>
                    <option value="admin">Administrator</option>
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
