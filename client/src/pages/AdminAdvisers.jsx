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
  HiArrowPath,
  HiUserPlus,
  HiTag,
  HiBriefcase,
  HiExclamationCircle,
} from 'react-icons/hi2';

export const AdminAdvisers = () => {
  const { confirm } = useConfirm();
  const [advisers, setAdvisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');

  // Manage Profile Modal state
  const [selectedAdviser, setSelectedAdviser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    department: '',
    academicRank: 'Assistant Professor',
    maxAdvisees: 5,
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
            maxAdvisees: u.maxAdvisees || 5,
            academicRank: u.academicRank || 'Assistant Professor',
            status: u.status || 'active',
            expertise: u.selectedExpertise || u.specialization || u.expertise || [
              'Software Engineering',
              'Machine Learning',
            ],
          });
        }
      });

      setAdvisers(Array.from(map.values()));
    } catch (err) {
      console.error('[AdminAdvisers] fetch error:', err);
      showToast('Error loading advisers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAdvisers = useMemo(() => {
    return advisers.filter((a) => {
      const matchesDept = departmentFilter === 'all' || a.department === departmentFilter;
      const query = search.trim().toLowerCase();
      const name = (a.fullName || `${a.first_name || ''} ${a.last_name || ''}`).toLowerCase();
      const email = (a.email || '').toLowerCase();
      const rank = (a.academicRank || '').toLowerCase();
      const tags = (a.expertise || []).join(' ').toLowerCase();

      const matchesSearch = !query || name.includes(query) || email.includes(query) || rank.includes(query) || tags.includes(query);
      return matchesDept && matchesSearch;
    });
  }, [advisers, departmentFilter, search]);

  const handleOpenEdit = async (adviser) => {
    setSelectedAdviser(adviser);
    setEditFormData({
      fullName: adviser.fullName || `${adviser.first_name || ''} ${adviser.last_name || ''}`.trim(),
      department: adviser.department || 'Department of Computer Science',
      academicRank: adviser.academicRank || 'Assistant Professor',
      maxAdvisees: adviser.maxAdvisees || 5,
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
      await userService.updateUser(selectedAdviser.uid, {
        fullName: editFormData.fullName,
        department: editFormData.department,
        academicRank: editFormData.academicRank,
        maxAdvisees: Number(editFormData.maxAdvisees),
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

  return (
    <div className="space-y-6">
      {toastMessage && (
        <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage('')} />
      )}

      <PageHeader
        icon={HiAcademicCap}
        title="Adviser Profile & Faculty Panel Management"
        description="Oversee faculty adviser profiles, research specializations, active advisee quotas, workload balances, and assigned student research groups."
        actions={
          <Button variant="outline" size="sm" onClick={fetchAdvisers} isLoading={loading}>
            <HiArrowPath className="w-4 h-4 mr-1.5" /> Refresh Advisers
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#15161e] p-4 rounded-2xl border border-gray-200/80 dark:border-[#222433] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1">
          <HiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search advisers by name, email, rank, or research interest..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <HiFunnel className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-sm bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl px-3 py-2 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Departments</option>
            <option value="Department of Computer Science">Department of Computer Science</option>
            <option value="Department of Information Technology">Department of Information Technology</option>
            <option value="Department of Information Systems">Department of Information Systems</option>
          </select>
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
            description="No faculty members match the current search or department filter."
            action={
              <Button variant="outline" size="sm" onClick={() => { setSearch(''); setDepartmentFilter('all'); }}>
                Reset Filters
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAdvisers.map((adviser) => {
            const isAtCapacity = (adviser.activeAdviseeCount || 0) >= (adviser.maxAdvisees || 5);
            return (
              <Card
                key={adviser.uid}
                className="p-5 flex flex-col justify-between hover:border-gray-300 dark:hover:border-gray-600 transition shadow-xs"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm shrink-0">
                        {adviser.profile_image ? (
                          <img
                            src={adviser.profile_image}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          (adviser.fullName || adviser.first_name || 'A').charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {adviser.fullName || `${adviser.first_name || ''} ${adviser.last_name || ''}`}
                        </h4>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          {adviser.academicRank || 'Assistant Professor'}
                        </p>
                      </div>
                    </div>

                    <Badge variant={adviser.status === 'active' ? 'emerald' : 'orange'}>
                      {adviser.status || 'Active'}
                    </Badge>
                  </div>

                  {/* Department & Email */}
                  <div className="space-y-1 text-xs text-gray-500 dark:text-[#9396a8]">
                    <div className="flex items-center gap-1.5 truncate">
                      <HiBuildingOffice2 className="w-4 h-4 shrink-0 text-gray-400" />
                      <span className="truncate">{adviser.department || 'Computer Studies'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <HiEnvelope className="w-4 h-4 shrink-0 text-gray-400" />
                      <span className="truncate">{adviser.email || 'No email registered'}</span>
                    </div>
                  </div>

                  {/* Workload Progress Bar */}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1c1d28] border border-gray-100 dark:border-[#222433] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Advisee Workload</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {adviser.activeAdviseeCount || 0} / {adviser.maxAdvisees || 5} groups
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isAtCapacity ? 'bg-red-500' : (adviser.activeAdviseeCount || 0) > 3 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (((adviser.activeAdviseeCount || 0) / (adviser.maxAdvisees || 5)) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {isAtCapacity ? 'At maximum advising capacity' : `${(adviser.maxAdvisees || 5) - (adviser.activeAdviseeCount || 0)} advising slots available`}
                    </div>
                  </div>

                  {/* Expertise Tags */}
                  <div>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                      Research Expertise
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-hidden">
                      {adviser.expertise && adviser.expertise.length > 0 ? (
                        adviser.expertise.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-[#1c1d28] text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-[#2b2d3f]"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">No expertise tags listed</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="pt-4 border-t border-gray-100 dark:border-[#222433] mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    ID: {adviser.studentIdOrEmployeeId || adviser.uid?.slice(0, 8)}
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(adviser)}>
                    <HiPencilSquare className="w-4 h-4 mr-1 text-blue-500" /> Manage Profile
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MANAGE ADVISER PROFILE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Manage Adviser Profile & Capacity"
        icon={HiAcademicCap}
        maxWidth="max-w-2xl"
      >
        {selectedAdviser && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
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
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Department</label>
                <select
                  value={editFormData.department}
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  className="w-full text-xs bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-2.5 text-gray-900 dark:text-white"
                >
                  <option value="Department of Computer Science">Department of Computer Science</option>
                  <option value="Department of Information Technology">Department of Information Technology</option>
                  <option value="Department of Information Systems">Department of Information Systems</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Max Advisee Capacity (Groups)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="15"
                  value={editFormData.maxAdvisees}
                  onChange={(e) => setEditFormData({ ...editFormData, maxAdvisees: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Availability Status */}
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
    </div>
  );
};

export default AdminAdvisers;
