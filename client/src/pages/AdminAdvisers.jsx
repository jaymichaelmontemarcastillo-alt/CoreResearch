// src/pages/AdminAdvisers.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Toast } from '../components/ui/Toast';
import { useConfirm } from '../context/ConfirmContext';
import userService from '../services/user.service';
import { groupService } from '../services/group.service';
import { researchWorkspaceService } from '../services/researchWorkspace.service';
import api from '../services/api';
import { FacultyDirectoryCard } from '../components/adviser/FacultyDirectoryCard';
import {
  HiUsers,
  HiAcademicCap,
  HiMagnifyingGlass,
  HiEnvelope,
  HiBuildingOffice2,
  HiBookOpen,
  HiUser,
  HiCheckCircle,
  HiPencilSquare,
  HiSparkles,
  HiFunnel,
  HiUserPlus,
  HiTag,
  HiBriefcase,
  HiExclamationCircle,
  HiChevronDown,
} from 'react-icons/hi2';

export const AdminAdvisers = () => {
  const { confirm } = useConfirm();
  const [advisers, setAdvisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');

  // Bulk & all-faculty workload management state
  const [bulkCapacity, setBulkCapacity] = useState(5);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [isWorkloadModalOpen, setIsWorkloadModalOpen] = useState(false);
  const [workloadForm, setWorkloadForm] = useState({});
  const [workloadSearch, setWorkloadSearch] = useState('');
  const [savingWorkloads, setSavingWorkloads] = useState(false);

  // Manage Profile Modal state
  const [selectedAdviser, setSelectedAdviser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    department: '',
    academicRank: 'Assistant Professor',
    status: 'active',
    expertise: [],
  });
  const [newExpertiseTag, setNewExpertiseTag] = useState('');
  const [saving, setSaving] = useState(false);

  // Group assignments state for selected adviser
  const [adviserWorkspaces, setAdviserWorkspaces] = useState([]);

  useEffect(() => {
    fetchAdvisers();
  }, []);

  const showToast = (message, variant = 'success') => {
    setToastMessage(message);
    setToastVariant(variant);
  };

  const fetchAdvisers = async () => {
    setLoading(true);
    try {
      const [adviserUsers, facultyUsers, allWorkspaces] = await Promise.all([
        userService.getUsersByRole('adviser'),
        userService.getUsersByRole('faculty'),
        researchWorkspaceService.getAllWorkspaces().catch(() => []),
      ]);

      // Deduplicate by uid
      const map = new Map();
      [...adviserUsers, ...facultyUsers].forEach((u) => {
        if (!map.has(u.uid)) {
          // Count active advisee groups for this adviser
          const activeGroups = allWorkspaces.filter(
            (ws) => ws.adviserId === u.uid && ws.status !== 'archived'
          );
          map.set(u.uid, {
            ...u,
            activeAdviseeCount: activeGroups.length,
            maxAdvisees: u.maxCapacity || u.maxAdvisees || 5,
            maxCapacity: u.maxCapacity || u.maxAdvisees || 5,
            academicRank: u.academicRank || 'Assistant Professor',
            status: u.status || 'active',
            expertise: u.selectedExpertise || u.specialization || u.expertise || [
              'Software Engineering',
              'Machine Learning',
            ],
          });
        }
      });

      const list = Array.from(map.values());
      setAdvisers(list);
      if (list.length > 0) {
        setBulkCapacity(list[0].maxCapacity || list[0].maxAdvisees || 5);
      }
    } catch (err) {
      console.error('[AdminAdvisers] fetch error:', err);
      showToast('Error loading advisers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAdvisers = useMemo(() => {
    return advisers.filter((a) => {
      const query = search.trim().toLowerCase();
      const name = (a.fullName || `${a.first_name || ''} ${a.last_name || ''}`).toLowerCase();
      const email = (a.email || '').toLowerCase();
      const rank = (a.academicRank || '').toLowerCase();
      const tags = (a.expertise || []).join(' ').toLowerCase();

      return !query || name.includes(query) || email.includes(query) || rank.includes(query) || tags.includes(query);
    });
  }, [advisers, search]);

  const handleOpenEdit = async (adviser) => {
    setSelectedAdviser(adviser);
    setEditFormData({
      fullName: adviser.fullName || `${adviser.first_name || ''} ${adviser.last_name || ''}`.trim(),
      department: adviser.department || 'Department of Computer Science',
      academicRank: adviser.academicRank || 'Assistant Professor',
      status: adviser.status || 'active',
      expertise: Array.isArray(adviser.expertise) ? [...adviser.expertise] : [],
    });

    // Fetch workspaces for this adviser
    try {
      const wsList = await researchWorkspaceService.getWorkspacesByAdviser(adviser.uid);
      setAdviserWorkspaces(wsList);
    } catch (e) {
      setAdviserWorkspaces([]);
    }

    setIsModalOpen(true);
  };

  const handleAddTag = () => {
    if (!newExpertiseTag.trim()) return;
    const tag = newExpertiseTag.trim();
    if (!editFormData.expertise.includes(tag)) {
      setEditFormData({
        ...editFormData,
        expertise: [...editFormData.expertise, tag],
      });
    }
    setNewExpertiseTag('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setEditFormData({
      ...editFormData,
      expertise: editFormData.expertise.filter((t) => t !== tagToRemove),
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!selectedAdviser) return;

    setSaving(true);
    try {
      // Preserve existing capacity of the faculty adviser
      const currentCapacity = selectedAdviser.maxCapacity || selectedAdviser.maxAdvisees || 5;

      await userService.updateUser(selectedAdviser.uid, {
        fullName: editFormData.fullName,
        department: editFormData.department || selectedAdviser.department || 'Department of Computer Science',
        academicRank: editFormData.academicRank,
        maxAdvisees: currentCapacity,
        maxCapacity: currentCapacity,
        status: editFormData.status,
        selectedExpertise: editFormData.expertise,
        expertise: editFormData.expertise,
      });

      showToast(`Adviser profile for "${editFormData.fullName}" updated successfully!`);
      setIsModalOpen(false);
      fetchAdvisers();
    } catch (err) {
      console.error('[AdminAdvisers] save error:', err);
      showToast('Failed to save adviser profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Bulk update all faculty advisee workloads
  const handleApplyBulkCapacity = async () => {
    const newCap = parseInt(bulkCapacity, 10);
    if (isNaN(newCap) || newCap < 1) {
      showToast('Please enter a valid advisee capacity (at least 1 group).', 'warning');
      return;
    }

    if (advisers.length === 0) {
      showToast('No faculty advisers found to update.', 'warning');
      return;
    }

    const confirmed = await confirm({
      title: 'Update All Faculty Advisee Workloads',
      message: `Set the maximum advisee capacity to ${newCap} group${newCap === 1 ? '' : 's'} for all ${advisers.length} faculty members?`,
      confirmText: 'Update All',
      cancelText: 'Cancel',
      variant: 'primary',
    });

    if (!confirmed) return;

    setBulkUpdating(true);
    try {
      await Promise.all(
        advisers.map((a) =>
          userService.updateUser(a.uid, {
            maxCapacity: newCap,
            maxAdvisees: newCap,
          })
        )
      );

      setAdvisers((prev) =>
        prev.map((a) => ({
          ...a,
          maxCapacity: newCap,
          maxAdvisees: newCap,
        }))
      );

      showToast(`Updated advisee workload capacity to ${newCap} groups for all faculty!`, 'success');
    } catch (err) {
      console.error('[AdminAdvisers] bulk update error:', err);
      showToast('Failed to update all faculty workloads. Please try again.', 'error');
    } finally {
      setBulkUpdating(false);
    }
  };

  // Open modal to view and customize each faculty's advisee workload
  const handleOpenWorkloadModal = () => {
    const initialMap = {};
    advisers.forEach((a) => {
      initialMap[a.uid] = a.maxCapacity || a.maxAdvisees || 5;
    });
    setWorkloadForm(initialMap);
    setWorkloadSearch('');
    setIsWorkloadModalOpen(true);
  };

  const handleSetAllInModal = (targetCapacity) => {
    const val = Math.max(1, parseInt(targetCapacity, 10) || 1);
    const updated = {};
    advisers.forEach((a) => {
      updated[a.uid] = val;
    });
    setWorkloadForm(updated);
  };

  const handleSaveAllWorkloads = async (e) => {
    if (e) e.preventDefault();
    setSavingWorkloads(true);
    try {
      const updates = advisers.filter((a) => {
        const newCap = parseInt(workloadForm[a.uid], 10);
        const oldCap = a.maxCapacity || a.maxAdvisees || 5;
        return !isNaN(newCap) && newCap !== oldCap;
      });

      if (updates.length === 0) {
        showToast('No workload changes were made.', 'info');
        setIsWorkloadModalOpen(false);
        return;
      }

      await Promise.all(
        updates.map((a) => {
          const cap = Math.max(1, parseInt(workloadForm[a.uid], 10) || 5);
          return userService.updateUser(a.uid, {
            maxCapacity: cap,
            maxAdvisees: cap,
          });
        })
      );

      setAdvisers((prev) =>
        prev.map((a) => {
          const cap = parseInt(workloadForm[a.uid], 10);
          if (!isNaN(cap)) {
            return { ...a, maxCapacity: cap, maxAdvisees: cap };
          }
          return a;
        })
      );

      showToast(
        `Updated advisee workloads for ${updates.length} faculty member${updates.length === 1 ? '' : 's'}!`,
        'success'
      );
      setIsWorkloadModalOpen(false);
    } catch (err) {
      console.error('[AdminAdvisers] save workloads error:', err);
      showToast('Failed to save faculty workloads.', 'error');
    } finally {
      setSavingWorkloads(false);
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage('')} />
      )}

      <PageHeader
        icon={HiAcademicCap}
        title="Adviser Profile & Faculty Panel Management"
        description="Oversee faculty adviser profiles, research specializations, active advisee quotas, workload balances, and assigned student research groups."
      />

      {/* Search and Workload Controls (Department dropdown removed) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-1">
        <div className="w-full lg:flex-1 lg:max-w-xl">
          <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">
            Search Faculty
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              <HiMagnifyingGlass className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by name, email, rank, or expertise..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all duration-200 rounded-full text-sm pl-10 pr-4 shadow-xs"
            />
          </div>
        </div>

        {/* Admin Edit Faculty Advisee Workload Controls */}
        <div className="flex flex-wrap items-end gap-2.5 w-full lg:w-auto">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">
              Faculty Advisee Workload
            </label>
            <div className="flex items-center gap-2">
              <div className="relative w-28">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={bulkCapacity}
                  onChange={(e) => setBulkCapacity(e.target.value)}
                  className="w-full h-10 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-full text-sm font-semibold text-gray-900 dark:text-[#f3f4f8] pl-3.5 pr-10 text-center shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  title="Advisee capacity (groups)"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-gray-400 pointer-events-none">
                  grp
                </span>
              </div>
              <Button
                variant="primary"
                onClick={handleApplyBulkCapacity}
                isLoading={bulkUpdating}
                className="h-10 rounded-full px-4 text-xs font-semibold shadow-xs whitespace-nowrap"
                title="Apply this capacity to all faculty members"
              >
                Update All Faculty
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenWorkloadModal}
                className="h-10 rounded-full px-4 text-xs font-semibold shadow-xs whitespace-nowrap flex items-center gap-1.5"
                title="Open detailed faculty workload manager"
              >
                <HiPencilSquare className="w-4 h-4 text-gray-500" />
                <span>Manage Workloads</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Advisers Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-sm text-gray-500">Loading adviser profiles...</span>
        </div>
      ) : filteredAdvisers.length === 0 ? (
        <Card className="p-12 text-center">
          <EmptyState
            icon={HiUsers}
            title="No advisers found"
            description="No faculty members match the current search."
            action={
              <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                Reset Search
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAdvisers.map((adviser, index) => (
            <FacultyDirectoryCard
              key={adviser.uid}
              adviser={adviser}
              index={index}
              mode="admin"
              onManageProfile={handleOpenEdit}
              onShowToast={showToast}
            />
          ))}
        </div>
      )}

      {/* MANAGE ADVISER PROFILE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Manage Adviser Profile"
        icon={HiAcademicCap}
        maxWidth="max-w-2xl"
      >
        {selectedAdviser && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                <Input
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Academic Rank</label>
                <select
                  value={editFormData.academicRank}
                  onChange={(e) => setEditFormData({ ...editFormData, academicRank: e.target.value })}
                  className="w-full text-xs bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-2.5 text-gray-900 dark:text-white"
                >
                  <option value="Instructor">Instructor</option>
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Full Professor">Full Professor</option>
                  <option value="Visiting Research Fellow">Visiting Research Fellow</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Mentorship Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full text-xs bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-2.5 text-gray-900 dark:text-white"
                >
                  <option value="active">Active & Accepting Advisees</option>
                  <option value="at_capacity">At Capacity (No New Groups)</option>
                  <option value="on_sabbatical">On Sabbatical / Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Expertise Tags Management */}
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Specialization & Research Expertise Tags
              </label>
              <div className="flex gap-2 mt-1 mb-2">
                <Input
                  placeholder="E.g. Computer Vision, IoT, Deep Learning..."
                  value={newExpertiseTag}
                  onChange={(e) => setNewExpertiseTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button variant="secondary" size="sm" type="button" onClick={handleAddTag}>
                  Add Tag
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-gray-50 dark:bg-[#1c1d28] border border-gray-200/60 dark:border-[#2b2d3f] min-h-12">
                {editFormData.expertise.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500 font-bold ml-1 text-xs"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Assigned Groups & Advisees Section */}
            <div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Currently Assigned Research Groups ({adviserWorkspaces.length}):
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-gray-50 dark:bg-[#1c1d28] border border-gray-100 dark:border-[#222433]">
                {adviserWorkspaces.length > 0 ? (
                  adviserWorkspaces.map((ws) => (
                    <div
                      key={ws.id}
                      className="p-2 rounded-lg bg-white dark:bg-[#15161e] border border-gray-200/50 dark:border-[#2b2d3f] flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">
                          {ws.title || 'Research Manuscript'}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {ws.groupName || 'Research Group'} • Student: {ws.studentName}
                        </div>
                      </div>
                      <Badge variant="blue" className="shrink-0 text-[10px]">
                        {ws.researchPhase || 'Active'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-400 italic text-center py-2">
                    No active research groups currently assigned.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#222433]">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={saving}>
                Save Adviser Profile
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MANAGE ALL FACULTY WORKLOADS MODAL */}
      <Modal
        isOpen={isWorkloadModalOpen}
        onClose={() => setIsWorkloadModalOpen(false)}
        title="Manage Faculty Advisee Workload Limits"
        icon={HiBriefcase}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Configure advisee capacity quotas for all faculty members. You can quickly set a uniform capacity limit for everyone or customize capacity individually per faculty member.
          </p>

          {/* Quick uniform capacity batch bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-900 dark:text-blue-300">
              <HiSparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Set uniform capacity for all faculty:</span>
            </div>
            <div className="flex items-center gap-2">
              {[3, 5, 8, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleSetAllInModal(num)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-[#1c1d28] border border-blue-200 dark:border-[#2b2d3f] text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/40 transition-colors shadow-2xs cursor-pointer"
                >
                  {num} groups
                </button>
              ))}
            </div>
          </div>

          {/* Search inside modal */}
          <div className="relative">
            <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search faculty in workload list..."
              value={workloadSearch}
              onChange={(e) => setWorkloadSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Faculty Workload Table */}
          <div className="max-h-[360px] overflow-y-auto border border-gray-200 dark:border-[#2b2d3f] rounded-xl divide-y divide-gray-100 dark:divide-[#222433]">
            {advisers
              .filter((a) => {
                if (!workloadSearch.trim()) return true;
                const q = workloadSearch.trim().toLowerCase();
                const name = (a.fullName || `${a.first_name || ''} ${a.last_name || ''}`).toLowerCase();
                const rank = (a.academicRank || '').toLowerCase();
                return name.includes(q) || rank.includes(q);
              })
              .map((adviser) => {
                const currentCap = workloadForm[adviser.uid] ?? (adviser.maxCapacity || adviser.maxAdvisees || 5);
                const activeCount = adviser.activeAdviseeCount || 0;
                const isOver = activeCount >= currentCap;

                return (
                  <div
                    key={adviser.uid}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/70 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                        {adviser.fullName || `${adviser.first_name || ''} ${adviser.last_name || ''}`.trim() || 'Faculty Member'}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                        {adviser.academicRank || 'Assistant Professor'} • {adviser.department || 'Computer Studies'}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {/* Active advisee count badge */}
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                          isOver
                            ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-[#1c1d28] dark:text-gray-300'
                        }`}
                      >
                        {activeCount} active group{activeCount === 1 ? '' : 's'}
                      </span>

                      {/* Workload Capacity Input */}
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] text-gray-500 font-medium">Limit:</label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={workloadForm[adviser.uid] ?? 5}
                          onChange={(e) =>
                            setWorkloadForm({
                              ...workloadForm,
                              [adviser.uid]: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-16 text-center text-xs font-semibold py-1 px-1.5 bg-white dark:bg-[#15161e] border border-gray-300 dark:border-[#2b2d3f] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-[11px] text-gray-400">groups</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#222433]">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsWorkloadModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveAllWorkloads} isLoading={savingWorkloads}>
              Save All Workloads
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminAdvisers;
