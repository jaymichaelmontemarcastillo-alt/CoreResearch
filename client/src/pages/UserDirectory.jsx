import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, Shield, User, Filter, RefreshCw, CheckCircle2 } from 'lucide-react';

export const UserDirectory = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [updatingUid, setUpdatingUid] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users', {
        params: { role: selectedRole, search }
      });
      if (response.data && response.data.data) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('[UserDirectory] fetch users error:', error);
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
      setTimeout(() => setToastMessage(''), 3000);
      await fetchUsers();
    } catch (error) {
      alert(`Failed to update role: ${error.message}`);
    } finally {
      setUpdatingUid(null);
    }
  };

  const roleVariants = {
    student: 'blue',
    adviser: 'emerald',
    panelist: 'purple',
    admin: 'amber'
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-400" /> User Directory & RBAC Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage institutional user accounts, departments, and access roles.</p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchUsers} isLoading={loading}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh List
        </Button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {toastMessage}
        </div>
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
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {['all', 'student', 'adviser', 'panelist', 'admin'].map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                selectedRole === r
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </Card>

      {/* Directory Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">ID Number</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Current Role</th>
                <th className="py-3.5 px-4 text-right">Modify Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs">
                        {u.fullName ? u.fullName.charAt(0) : 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{u.fullName}</div>
                        <div className="text-slate-500 text-[11px]">{u.email}</div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {u.studentIdOrEmployeeId || 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-300">
                      {u.department || 'General'}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant={roleVariants[u.role] || 'blue'}>
                        {u.role ? u.role.toUpperCase() : 'STUDENT'}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <select
                        value={u.role}
                        disabled={updatingUid === u.uid}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                        className="glass-input rounded-lg py-1 px-2 text-xs font-semibold border border-slate-700 bg-slate-900 cursor-pointer"
                      >
                        <option value="student">Student</option>
                        <option value="adviser">Adviser</option>
                        <option value="panelist">Panelist</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
