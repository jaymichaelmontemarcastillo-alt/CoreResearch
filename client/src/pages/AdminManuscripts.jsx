// src/pages/AdminManuscripts.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Toast } from '../components/ui/Toast';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import manuscriptService from '../services/manuscript.service';
import {
  HiDocumentText,
  HiMagnifyingGlass,
  HiFunnel,
  HiArrowPath,
  HiCheckCircle,
  HiExclamationCircle,
  HiClock,
  HiStar,
  HiArchiveBox,
  HiArchiveBoxArrowDown,
  HiPencilSquare,
  HiChatBubbleBottomCenterText,
  HiCalculator,
  HiArrowTopRightOnSquare,
  HiBookOpen,
  HiUserGroup,
  HiAcademicCap,
  HiArrowUpTray,
  HiTag,
  HiPaperAirplane,
  HiSparkles,
  HiCheckBadge,
  HiDocumentCheck,
  HiTrophy,
  HiEye,
  HiArrowDownTray,
  HiTrash
} from 'react-icons/hi2';

export const AdminManuscripts = () => {
  const { userProfile, role } = useAuth();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') || 'all';
  const [selectedTab, setSelectedTab] = useState(tabParam);

  const [manuscripts, setManuscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);

  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');

  // Modals state
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [paperModalOpen, setPaperModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [bestThesisModalOpen, setBestThesisModalOpen] = useState(false);
  const [selectedManuscript, setSelectedManuscript] = useState(null);

  // Feedback form
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSection, setFeedbackSection] = useState('General');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Grade form (Rubric scores)
  const [presentationScore, setPresentationScore] = useState(18);
  const [methodologyScore, setMethodologyScore] = useState(26);
  const [resultsScore, setResultsScore] = useState(26);
  const [manuscriptScore, setManuscriptScore] = useState(18);
  const [gradeRemarks, setGradeRemarks] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState(false);

  // Edit form
  const [editTitle, setEditTitle] = useState('');
  const [editAuthors, setEditAuthors] = useState('');
  const [editAbstract, setEditAbstract] = useState('');
  const [editKeywords, setEditKeywords] = useState('');
  const [editStatus, setEditStatus] = useState('under_review');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Best thesis form
  const [bestThesisNotes, setBestThesisNotes] = useState('');
  const [submittingBestThesis, setSubmittingBestThesis] = useState(false);

  useEffect(() => {
    fetchManuscripts();
  }, []);

  useEffect(() => {
    if (tabParam !== selectedTab) {
      setSelectedTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab) => {
    setSelectedTab(newTab);
    setSearchParams({ tab: newTab });
    setSelectedIds([]); // Clear selection on tab change
  };

  const showToast = (message, variant = 'success') => {
    setToastMessage(message);
    setToastVariant(variant);
  };

  const fetchManuscripts = async () => {
    setLoading(true);
    try {
      const data = await manuscriptService.getAllAdminManuscripts();
      setManuscripts(data);
    } catch (err) {
      console.error('[AdminManuscripts] fetch error:', err);
      showToast('Error loading manuscripts. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Status mapping and counters
  const counts = useMemo(() => {
    const res = {
      all: 0,
      new_upload: 0,
      ongoing_revision: 0,
      approved: 0,
      accepted: 0,
      pending_publish: 0,
      best_thesis: 0,
      archived: 0,
    };
    manuscripts.forEach((m) => {
      if (!m.isArchived) res.all++;
      if (m.isArchived || m.status === 'archived') res.archived++;
      if (m.isBestThesis) res.best_thesis++;

      if (!m.isArchived) {
        if (m.status === 'new_upload') res.new_upload++;
        if (m.status === 'ongoing_revision' || m.status === 'revisions_requested' || m.status === 'revisions_required') {
          res.ongoing_revision++;
        }
        if (m.status === 'approved') res.approved++;
        if (m.status === 'accepted') res.accepted++;
        if (m.status === 'pending_publish') res.pending_publish++;
      }
    });
    return res;
  }, [manuscripts]);

  // Filtered manuscripts
  const filteredManuscripts = useMemo(() => {
    return manuscripts.filter((m) => {
      // Tab filter
      let matchesTab = true;
      if (selectedTab === 'new_upload') {
        matchesTab = !m.isArchived && m.status === 'new_upload';
      } else if (selectedTab === 'ongoing_revision') {
        matchesTab = !m.isArchived && (m.status === 'ongoing_revision' || m.status === 'revisions_requested' || m.status === 'revisions_required');
      } else if (selectedTab === 'approved') {
        matchesTab = !m.isArchived && m.status === 'approved';
      } else if (selectedTab === 'accepted') {
        matchesTab = !m.isArchived && m.status === 'accepted';
      } else if (selectedTab === 'pending_publish') {
        matchesTab = !m.isArchived && m.status === 'pending_publish';
      } else if (selectedTab === 'best_thesis') {
        matchesTab = Boolean(m.isBestThesis);
      } else if (selectedTab === 'archived') {
        matchesTab = Boolean(m.isArchived || m.status === 'archived');
      } else {
        // 'all' excludes archived unless specifically looking at archive
        matchesTab = !m.isArchived && m.status !== 'archived';
      }

      // Department filter
      const matchesDept = deptFilter === 'all' || m.department === deptFilter;

      // Search query
      const query = searchQuery.trim().toLowerCase();
      const title = (m.title || m.projectTitle || '').toLowerCase();
      const uploader = (m.uploaderName || m.studentName || '').toLowerCase();
      const adviser = (m.adviserName || '').toLowerCase();
      const authors = Array.isArray(m.authors) ? m.authors.join(' ').toLowerCase() : '';
      const matchesSearch = !query || title.includes(query) || uploader.includes(query) || adviser.includes(query) || authors.includes(query);

      return matchesTab && matchesDept && matchesSearch;
    });
  }, [manuscripts, selectedTab, deptFilter, searchQuery]);

  // Open Feedback Modal
  const handleOpenFeedback = (m) => {
    setSelectedManuscript(m);
    setFeedbackText('');
    setFeedbackSection('General');
    setFeedbackModalOpen(true);
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim() || !selectedManuscript) return;
    setSubmittingFeedback(true);
    try {
      await manuscriptService.addFeedback(selectedManuscript.id, feedbackText, feedbackSection);
      showToast('Feedback comment added to manuscript successfully!');
      setFeedbackModalOpen(false);
      fetchManuscripts();
    } catch (err) {
      showToast('Failed to add feedback comment.', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Open Paper Viewer Modal
  const handleOpenPaper = (m) => {
    setSelectedManuscript(m);
    setPaperModalOpen(true);
  };

  // Open Defense Grade Modal
  const handleOpenGrade = (m) => {
    setSelectedManuscript(m);
    setGradeModalOpen(true);
  };

  // Open Live Research Workspace
  const handleOpenWorkspace = (m) => {
    const wsId = m.workspaceId || m.id;
    navigate(`/workspace?workspaceId=${wsId}`);
  };

  // Open Edit Modal
  const handleOpenEdit = (m) => {
    setSelectedManuscript(m);
    setEditTitle(m.title || m.projectTitle || '');
    setEditAuthors(Array.isArray(m.authors) ? m.authors.join(', ') : m.authors || '');
    setEditAbstract(m.abstract || '');
    setEditKeywords(Array.isArray(m.keywords) ? m.keywords.join(', ') : m.keywords || '');
    setEditStatus(m.status || 'under_review');
    setEditModalOpen(true);
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!selectedManuscript) return;
    setSubmittingEdit(true);
    try {
      const authorsArr = editAuthors
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      const keywordsArr = editKeywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      await manuscriptService.adminUpdateManuscript(selectedManuscript.id, {
        title: editTitle,
        projectTitle: editTitle,
        authors: authorsArr,
        abstract: editAbstract,
        keywords: keywordsArr,
        status: editStatus,
      });

      showToast('Manuscript details updated successfully!');
      setEditModalOpen(false);
      fetchManuscripts();
    } catch (err) {
      showToast('Failed to update manuscript.', 'error');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Archive / Restore
  const handleToggleArchive = async (m) => {
    const isNowArchiving = !m.isArchived;
    const confirmed = await confirm({
      title: isNowArchiving ? 'Archive Manuscript' : 'Restore Manuscript',
      message: isNowArchiving
        ? `Are you sure you want to move "${m.title || m.projectTitle}" to the institutional archive?`
        : `Are you sure you want to restore "${m.title || m.projectTitle}" back to active status?`,
      confirmText: isNowArchiving ? 'Archive' : 'Restore',
      variant: isNowArchiving ? 'danger' : 'primary',
    });
    if (!confirmed) return;

    try {
      await manuscriptService.toggleArchiveManuscript(m.id, isNowArchiving);
      showToast(isNowArchiving ? 'Manuscript moved to archive.' : 'Manuscript restored from archive.');
      fetchManuscripts();
    } catch (err) {
      showToast('Failed to update archive status.', 'error');
    }
  };

  // Best Thesis Modal
  const handleOpenBestThesis = (m) => {
    setSelectedManuscript(m);
    setBestThesisNotes(m.bestThesisNotes || '');
    setBestThesisModalOpen(true);
  };

  const handleSubmitBestThesis = async (e) => {
    e.preventDefault();
    if (!selectedManuscript) return;
    setSubmittingBestThesis(true);
    try {
      const nextBest = !selectedManuscript.isBestThesis;
      await manuscriptService.toggleBestThesis(selectedManuscript.id, nextBest, bestThesisNotes);
      showToast(
        nextBest
          ? `Selected "${selectedManuscript.title || selectedManuscript.projectTitle}" as Best Thesis!`
          : 'Best Thesis recognition removed.'
      );
      setBestThesisModalOpen(false);
      fetchManuscripts();
    } catch (err) {
      showToast('Failed to update Best Thesis status.', 'error');
    } finally {
      setSubmittingBestThesis(false);
    }
  };

  // Publish to Institutional Repository
  const handlePublishToRepository = async (m) => {
    const confirmed = await confirm({
      title: 'Publish to Institutional Repository',
      message: `Do you want to release "${m.title || m.projectTitle}" to the public Institutional Repository?`,
      confirmText: 'Publish Now',
      variant: 'primary',
    });
    if (!confirmed) return;

    try {
      await manuscriptService.publishToRepository(m.id);
      showToast('Manuscript successfully published to Institutional Repository!');
      fetchManuscripts();
    } catch (err) {
      showToast('Failed to publish to repository.', 'error');
    }
  };

  // Delete Manuscripts
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await confirm({
      title: 'Delete Manuscripts',
      message: `Are you sure you want to permanently delete ${selectedIds.length} selected manuscript(s)? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await manuscriptService.deleteAdminManuscripts(selectedIds);
      showToast(`Deleted ${selectedIds.length} manuscript(s) successfully.`);
      setSelectedIds([]);
      fetchManuscripts();
    } catch (err) {
      showToast('Failed to delete manuscripts.', 'error');
    }
  };

  const handleDeleteSingle = async (m) => {
    const confirmed = await confirm({
      title: 'Delete Manuscript',
      message: `Are you sure you want to permanently delete "${m.title || m.projectTitle}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await manuscriptService.deleteAdminManuscripts([m.id]);
      showToast('Manuscript deleted successfully.');
      setSelectedIds(selectedIds.filter(id => id !== m.id));
      fetchManuscripts();
    } catch (err) {
      showToast('Failed to delete manuscript.', 'error');
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    if (selectedIds.length === filteredManuscripts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredManuscripts.map(m => m.id));
    }
  };

  const getStatusBadge = (m) => {
    if (m.isArchived || m.status === 'archived') {
      return <Badge variant="gray">Archived</Badge>;
    }
    switch (m.status) {
      case 'new_upload':
        return <Badge variant="blue">New Upload</Badge>;
      case 'ongoing_revision':
      case 'revisions_requested':
      case 'revisions_required':
        return <Badge variant="orange">Ongoing Revision</Badge>;
      case 'approved':
        return <Badge variant="emerald">Approved</Badge>;
      case 'accepted':
        return <Badge variant="cyan">Accepted</Badge>;
      case 'pending_publish':
        return <Badge variant="purple">Pending Publish</Badge>;
      case 'published':
        return <Badge variant="emerald">Published in Repo</Badge>;
      default:
        return <Badge variant="gray">{m.status || 'Under Review'}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage('')} />
      )}

      {/* Page Header */}
      <PageHeader
        icon={HiDocumentText}
        title="Admin Manuscript Management & Workflow Hub"
        description="Comprehensive supervision of student research manuscripts: track new uploads, monitor ongoing revisions, approve camera-ready copies, award Best Thesis, edit defense grades, and archive records."
        actions={
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
                <HiTrash className="w-4 h-4 mr-1.5" /> Delete Selected ({selectedIds.length})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchManuscripts} isLoading={loading}>
              <HiArrowPath className="w-4 h-4 mr-1.5" /> Refresh List
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleTabChange('best_thesis')}
              className="bg-amber-500 hover:bg-amber-600 focus:ring-amber-500/20 text-white"
            >
              <HiTrophy className="w-4 h-4 mr-1.5" /> Best Thesis Showcase
            </Button>
          </div>
        }
      />

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <button
          onClick={() => handleTabChange('all')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedTab === 'all'
              ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-500 dark:border-blue-500/40 ring-1 ring-blue-500'
              : 'bg-white dark:bg-[#15161e] border-gray-200/80 dark:border-[#222433] hover:border-gray-300 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#9396a8]">All</span>
            <HiBookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{counts.all}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Active records</div>
        </button>

        <button
          onClick={() => handleTabChange('new_upload')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedTab === 'new_upload'
              ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-500 dark:border-blue-500/40 ring-1 ring-blue-500'
              : 'bg-white dark:bg-[#15161e] border-gray-200/80 dark:border-[#222433] hover:border-gray-300 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">New Uploads</span>
            <HiArrowUpTray className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{counts.new_upload}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Awaiting initial review</div>
        </button>

        <button
          onClick={() => handleTabChange('ongoing_revision')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedTab === 'ongoing_revision'
              ? 'bg-orange-50/80 dark:bg-orange-900/20 border-orange-500 dark:border-orange-500/40 ring-1 ring-orange-500'
              : 'bg-white dark:bg-[#15161e] border-gray-200/80 dark:border-[#222433] hover:border-gray-300 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">Revisions</span>
            <HiClock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{counts.ongoing_revision}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Ongoing author edits</div>
        </button>

        <button
          onClick={() => handleTabChange('approved')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedTab === 'approved'
              ? 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-500 dark:border-emerald-500/40 ring-1 ring-emerald-500'
              : 'bg-white dark:bg-[#15161e] border-gray-200/80 dark:border-[#222433] hover:border-gray-300 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Approved</span>
            <HiCheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{counts.approved}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Panel approved</div>
        </button>

        <button
          onClick={() => handleTabChange('accepted')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedTab === 'accepted'
              ? 'bg-cyan-50/80 dark:bg-cyan-900/20 border-cyan-500 dark:border-cyan-500/40 ring-1 ring-cyan-500'
              : 'bg-white dark:bg-[#15161e] border-gray-200/80 dark:border-[#222433] hover:border-gray-300 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Accepted</span>
            <HiCheckBadge className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{counts.accepted}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Graduation cleared</div>
        </button>

        <button
          onClick={() => handleTabChange('pending_publish')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedTab === 'pending_publish'
              ? 'bg-purple-50/80 dark:bg-purple-900/20 border-purple-500 dark:border-purple-500/40 ring-1 ring-purple-500'
              : 'bg-white dark:bg-[#15161e] border-gray-200/80 dark:border-[#222433] hover:border-gray-300 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">Pending Pub</span>
            <HiDocumentCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{counts.pending_publish}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Camera-ready check</div>
        </button>

        <button
          onClick={() => handleTabChange('archived')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedTab === 'archived'
              ? 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-500 ring-1 ring-gray-400'
              : 'bg-white dark:bg-[#15161e] border-gray-200/80 dark:border-[#222433] hover:border-gray-300 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Archived</span>
            <HiArchiveBox className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{counts.archived}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Historical records</div>
        </button>
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-white dark:bg-[#15161e] p-4 rounded-2xl border border-gray-200/80 dark:border-[#222433] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <HiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search manuscripts by title, uploader, authors, or adviser..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2">
          <HiFunnel className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-sm bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl px-3 py-2 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Information Systems">Information Systems</option>
          </select>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-gray-200/80 dark:border-[#222433]">
        {[
          { id: 'all', label: 'All Manuscripts', count: counts.all },
          { id: 'new_upload', label: 'New Uploads & Comments', count: counts.new_upload },
          { id: 'ongoing_revision', label: 'Ongoing Revision', count: counts.ongoing_revision },
          { id: 'approved', label: 'Approved Manuscripts', count: counts.approved },
          { id: 'accepted', label: 'Accepted Students', count: counts.accepted },
          { id: 'pending_publish', label: 'Pending Publish', count: counts.pending_publish },
          { id: 'best_thesis', label: 'Best Thesis Nominees', count: counts.best_thesis, icon: HiStar },
          { id: 'archived', label: 'Archived Manuscripts', count: counts.archived },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg font-medium text-xs whitespace-nowrap transition-colors border-b-2 ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-[#9396a8] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1c1d28]'
              }`}
            >
              {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-500' : 'text-amber-500'}`} />}
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-[#1c1d28] text-gray-600 dark:text-[#9396a8]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Manuscripts List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-sm text-gray-500">Loading manuscripts...</span>
        </div>
      ) : filteredManuscripts.length === 0 ? (
        <Card className="p-12 text-center">
          <EmptyState
            icon={HiDocumentText}
            title={`No manuscripts in "${selectedTab.replace('_', ' ')}"`}
            description="No manuscript entries match the current filter or search criteria."
            action={
              <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setDeptFilter('all'); }}>
                Reset Filters
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <input 
              type="checkbox" 
              className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 mr-3 cursor-pointer"
              checked={selectedIds.length > 0 && selectedIds.length === filteredManuscripts.length}
              onChange={toggleAllSelection}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Select All</span>
          </div>

          {filteredManuscripts.map((m) => (
            <Card
              key={m.id}
              className={`p-5 transition-all hover:border-gray-300 dark:hover:border-gray-600 ${
                m.isBestThesis
                  ? 'border-amber-300 dark:border-amber-500/40 bg-gradient-to-r from-amber-50/30 dark:from-amber-950/10 to-transparent'
                  : ''
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="pt-1">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                    checked={selectedIds.includes(m.id)}
                    onChange={() => toggleSelection(m.id)}
                  />
                </div>
                {/* Left: Metadata */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(m)}
                    {m.isBestThesis && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 animate-pulse">
                        <HiTrophy className="w-3.5 h-3.5" /> Best Thesis Awardee
                      </span>
                    )}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-[#1c1d28] text-gray-600 dark:text-[#9396a8]">
                      {m.versionNumber || 'v1.0'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {m.department || 'Computer Studies'} • {m.program || 'BSIT'} {m.section ? `(${m.section})` : ''}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-snug">
                    {m.title || m.projectTitle}
                  </h3>

                  {m.abstract && (
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-[#9396a8] line-clamp-2 leading-relaxed">
                      {m.abstract}
                    </p>
                  )}

                  {m.bestThesisNotes && m.isBestThesis && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <HiSparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold">Best Thesis Citation:</strong> {m.bestThesisNotes}
                      </div>
                    </div>
                  )}

                  {/* Authors, Adviser & Grade Info */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-gray-500 dark:text-[#9396a8]">
                    <div className="flex items-center gap-1.5">
                      <HiAcademicCap className="w-4 h-4 text-gray-400" />
                      <span>
                        Authors:{' '}
                        <strong className="font-semibold text-gray-800 dark:text-gray-200">
                          {Array.isArray(m.authors) ? m.authors.join(', ') : m.uploaderName || 'Student Group'}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <HiUserGroup className="w-4 h-4 text-gray-400" />
                      <span>
                        Adviser:{' '}
                        <strong className="font-semibold text-gray-800 dark:text-gray-200">
                          {m.adviserName || 'Assigned Adviser'}
                        </strong>
                      </span>
                    </div>

                    {m.grade && m.grade.score ? (
                      <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 px-2.5 py-1 rounded-lg">
                        <HiCalculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>
                          Defense Grade:{' '}
                          <strong className="font-bold text-emerald-700 dark:text-emerald-300">
                            {m.grade.score}/100
                          </strong>{' '}
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">({m.grade.letter})</span>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#1c1d28] px-2.5 py-1 rounded-lg text-gray-500 dark:text-gray-400">
                        <HiClock className="w-4 h-4 text-amber-500" />
                        <span>
                          Defense Grade:{' '}
                          <strong className="font-medium text-amber-600 dark:text-amber-400">Pending Evaluation</strong>
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <HiChatBubbleBottomCenterText className="w-4 h-4 text-gray-400" />
                      <span>{m.commentsCount || (m.comments ? m.comments.length : 0)} comments</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions Hub */}
                <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 items-end justify-start">
                  <div className="flex items-center gap-2">
                    {/* View Paper Button */}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenPaper(m)}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                      title="Read manuscript paper, chapters, and abstract"
                    >
                      <HiBookOpen className="w-4 h-4 mr-1.5" />
                      View Paper
                    </Button>

                    {/* Defense Grade Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenGrade(m)}
                      title="View panelist defense evaluations and rubric scores"
                      className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    >
                      <HiCalculator className="w-4 h-4 mr-1 text-emerald-500" />
                      {m.grade?.score ? `Defense Grade (${m.grade.score}/100)` : 'Defense Grade'}
                    </Button>

                    {/* Comments Button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenFeedback(m)}
                      title="Give comments & review notes"
                    >
                      <HiChatBubbleBottomCenterText className="w-4 h-4 mr-1 text-blue-500" />
                      Comments ({m.comments?.length || m.commentsCount || 0})
                    </Button>

                    {/* Edit Details */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(m)}
                      title="Edit manuscript metadata"
                    >
                      <HiPencilSquare className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle Best Thesis */}
                    <Button
                      variant={m.isBestThesis ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => handleOpenBestThesis(m)}
                      className={
                        m.isBestThesis
                          ? 'bg-amber-500 hover:bg-amber-600 border-none text-white'
                          : 'border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                      }
                      title="Select as Best Thesis"
                    >
                      <HiStar className="w-4 h-4 mr-1" />
                      {m.isBestThesis ? 'Best Thesis ★' : 'Select Best'}
                    </Button>

                    {/* Pending publish action */}
                    {m.status === 'pending_publish' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handlePublishToRepository(m)}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <HiArrowTopRightOnSquare className="w-4 h-4 mr-1" />
                        Publish
                      </Button>
                    )}

                    {/* Archive / Restore Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleArchive(m)}
                      className={m.isArchived ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}
                      title={m.isArchived ? 'Restore from archive' : 'Archive manuscript'}
                    >
                      {m.isArchived ? (
                        <HiArchiveBoxArrowDown className="w-4 h-4" />
                      ) : (
                        <HiArchiveBox className="w-4 h-4" />
                      )}
                    </Button>

                    {/* Delete Single Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSingle(m)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete Manuscript"
                    >
                      <HiTrash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 1. GIVE COMMENTS / FEEDBACK MODAL */}
      <Modal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        title="Manuscript Comments & Review Feedback"
        icon={HiChatBubbleBottomCenterText}
        maxWidth="max-w-2xl"
      >
        {selectedManuscript && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1c1d28] border border-gray-100 dark:border-[#222433]">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Manuscript</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                {selectedManuscript.title || selectedManuscript.projectTitle}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Version: {selectedManuscript.versionNumber} • Uploader: {selectedManuscript.uploaderName || 'Student Group'}
              </div>
            </div>

            {/* Comment Thread List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Previous Comments & Notes:</div>
              {selectedManuscript.comments && selectedManuscript.comments.length > 0 ? (
                selectedManuscript.comments.map((c, idx) => (
                  <div
                    key={c.id || idx}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-[#1c1d28]/70 border border-gray-100 dark:border-[#222433] space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-gray-900 dark:text-white">{c.authorName || 'Reviewer'}</strong>
                        <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {c.authorRole || 'adviser'}
                        </span>
                      </div>
                      <span className="text-gray-400 text-[11px]">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                    {c.section && (
                      <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                        Section: {c.section}
                      </div>
                    )}
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      {c.text || c.comment}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-gray-400 italic bg-gray-50 dark:bg-[#1c1d28] rounded-xl">
                  No comments recorded yet. Post the first review feedback below.
                </div>
              )}
            </div>

            {/* Post New Comment Form */}
            <form onSubmit={handleSubmitFeedback} className="space-y-3 pt-2 border-t border-gray-100 dark:border-[#222433]">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 shrink-0">Section / Chapter:</label>
                <select
                  value={feedbackSection}
                  onChange={(e) => setFeedbackSection(e.target.value)}
                  className="text-xs bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-white"
                >
                  <option value="General">General Manuscript</option>
                  <option value="Abstract & Keywords">Abstract & Keywords</option>
                  <option value="Chapter 1 - Introduction">Chapter 1 - Introduction</option>
                  <option value="Chapter 2 - Literature Review">Chapter 2 - Literature Review</option>
                  <option value="Chapter 3 - Methodology">Chapter 3 - Methodology</option>
                  <option value="Chapter 4 - Results & Discussion">Chapter 4 - Results & Discussion</option>
                  <option value="Chapter 5 - Conclusion & Recommendations">Chapter 5 - Conclusion & Recommendations</option>
                </select>
              </div>

              <div>
                <textarea
                  rows={3}
                  placeholder="Type constructive comments, revision requirements, or thesis recommendations..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  required
                  className="w-full text-xs bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setFeedbackModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={submittingFeedback}>
                  <HiPaperAirplane className="w-3.5 h-3.5 mr-1" /> Post Comment
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* 2. OFFICIAL PANELIST DEFENSE EVALUATION & GRADES MODAL */}
      <Modal
        isOpen={gradeModalOpen}
        onClose={() => setGradeModalOpen(false)}
        title="Official Panelist Defense Evaluations"
        icon={HiCalculator}
        maxWidth="max-w-2xl"
      >
        {selectedManuscript && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#1c1d28] border border-gray-100 dark:border-[#222433]">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Research Project</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                {selectedManuscript.title || selectedManuscript.projectTitle}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span>Authors: <strong>{Array.isArray(selectedManuscript.authors) ? selectedManuscript.authors.join(', ') : selectedManuscript.uploaderName || 'Student Group'}</strong></span>
                <span>Adviser: <strong>{selectedManuscript.adviserName || 'Assigned Adviser'}</strong></span>
              </div>
            </div>

            {selectedManuscript.grade && selectedManuscript.grade.score ? (
              <div className="space-y-4">
                {/* Official Score Summary Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Official Defense Grade
                    </div>
                    <div className="text-base font-extrabold text-emerald-900 dark:text-emerald-200 mt-0.5">
                      {selectedManuscript.grade.letter}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {selectedManuscript.grade.remarks}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {selectedManuscript.grade.score}
                    </span>
                    <span className="text-sm font-medium text-gray-400">/100</span>
                  </div>
                </div>

                {/* Individual Panelist Evaluations */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Panelist Evaluations ({selectedManuscript.grade.panelistEvaluations?.length || 1})
                  </div>

                  {Array.isArray(selectedManuscript.grade.panelistEvaluations) &&
                  selectedManuscript.grade.panelistEvaluations.length > 0 ? (
                    selectedManuscript.grade.panelistEvaluations.map((ev, idx) => (
                      <div
                        key={ev.id || idx}
                        className="p-3.5 rounded-xl border border-gray-200/80 dark:border-[#222433] bg-white dark:bg-[#181924] space-y-2.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <HiAcademicCap className="w-4 h-4 text-blue-500" />
                            <span className="font-semibold text-xs text-gray-900 dark:text-white">
                              {ev.panelistName || 'Defense Panelist'}
                            </span>
                          </div>
                          <Badge variant="emerald" size="sm">
                            {ev.verdict ? String(ev.verdict).replace(/_/g, ' ') : 'PASSED'}
                          </Badge>
                        </div>

                        {/* Subtotal rubrics breakdown */}
                        {ev.subTotals && (
                          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                            <div className="p-2 rounded-lg bg-gray-50 dark:bg-[#1c1d28]">
                              <div className="text-[10px] text-gray-400">Manuscript</div>
                              <div className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                {ev.subTotals.manuscript ?? '-'}/30
                              </div>
                            </div>
                            <div className="p-2 rounded-lg bg-gray-50 dark:bg-[#1c1d28]">
                              <div className="text-[10px] text-gray-400">Oral Defense</div>
                              <div className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                {ev.subTotals.oral ?? '-'}/20
                              </div>
                            </div>
                            <div className="p-2 rounded-lg bg-gray-50 dark:bg-[#1c1d28]">
                              <div className="text-[10px] text-gray-400">Project / System</div>
                              <div className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                {ev.subTotals.project ?? '-'}/50
                              </div>
                            </div>
                          </div>
                        )}

                        {ev.remarks && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#1c1d28] p-2.5 rounded-lg border border-gray-100 dark:border-[#222433] italic">
                            "{ev.remarks}"
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-3.5 rounded-xl border border-gray-100 dark:border-[#222433] bg-gray-50 dark:bg-[#1c1d28] text-xs text-gray-600 dark:text-gray-300">
                      Evaluated during defense. Grade recorded: {selectedManuscript.grade.score}/100.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2 bg-gray-50 dark:bg-[#1c1d28] rounded-xl border border-gray-100 dark:border-[#222433]">
                <HiClock className="w-8 h-8 text-amber-500 mx-auto" />
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  No Defense Evaluations Submitted Yet
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  Panelists have not graded this manuscript's proposal or final oral defense yet. Once panel members submit their rubric scores, the authoritative defense grades will appear here.
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-[#222433]">
              <Button variant="outline" size="sm" onClick={() => setGradeModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 2b. VIEW MANUSCRIPT PAPER & CHAPTERS MODAL (Admin Full Paper Access) */}
      <Modal
        isOpen={paperModalOpen}
        onClose={() => setPaperModalOpen(false)}
        title="Manuscript Paper & Chapter Overview"
        icon={HiBookOpen}
        maxWidth="max-w-3xl"
      >
        {selectedManuscript && (
          <div className="space-y-4">
            {/* Header info card */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#1c1d28] border border-gray-200/80 dark:border-[#222433] space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(selectedManuscript)}
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-200/80 dark:bg-[#282a3c] text-gray-700 dark:text-[#9396a8]">
                  {selectedManuscript.versionNumber || 'v1.0'}
                </span>
                <span className="text-xs text-gray-400">
                  {selectedManuscript.department || 'Computer Studies'} • {selectedManuscript.program || 'BSIT'} {selectedManuscript.section ? `(${selectedManuscript.section})` : ''}
                </span>
              </div>

              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                {selectedManuscript.title || selectedManuscript.projectTitle}
              </h2>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-600 dark:text-gray-300 pt-1">
                <div>
                  Authors: <strong>{Array.isArray(selectedManuscript.authors) ? selectedManuscript.authors.join(', ') : selectedManuscript.uploaderName || 'Student Group'}</strong>
                </div>
                <div>
                  Adviser: <strong>{selectedManuscript.adviserName || 'Assigned Adviser'}</strong>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/30">
              <div className="text-xs text-blue-900 dark:text-blue-300 font-medium">
                Admin Paper Inspection & Real-time Collaboration:
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenWorkspace(selectedManuscript)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  <HiEye className="w-3.5 h-3.5 mr-1" /> Open in Full Workspace
                </Button>
                {selectedManuscript.fileUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedManuscript.fileUrl, '_blank')}
                    className="text-xs"
                  >
                    <HiArrowDownTray className="w-3.5 h-3.5 mr-1" /> View Attached File
                  </Button>
                )}
              </div>
            </div>

            {/* Abstract */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Abstract
              </h3>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#1c1d28] p-3.5 rounded-xl border border-gray-200/80 dark:border-[#222433] leading-relaxed">
                {selectedManuscript.abstract || 'No abstract text submitted for this manuscript record yet.'}
              </p>
            </div>

            {/* Keywords */}
            {selectedManuscript.keywords && selectedManuscript.keywords.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Keywords & Domain Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(selectedManuscript.keywords)
                    ? selectedManuscript.keywords
                    : String(selectedManuscript.keywords).split(/[,;]+/)
                  ).map((kw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#1c1d28] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#2b2d3f]"
                    >
                      <HiTag className="w-3 h-3 text-blue-500" />
                      {String(kw).trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Manuscript Chapters Outline & Approvals */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Manuscript Chapters Progress
                </h3>
                <span className="text-[11px] text-gray-400">Standard LSPU 5-Chapter Thesis Structure</span>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'ch1', num: 'Chapter 1', title: 'The Problem and Its Background (Objectives & Scope)' },
                  { id: 'ch2', num: 'Chapter 2', title: 'Review of Related Literature and Studies' },
                  { id: 'ch3', num: 'Chapter 3', title: 'Research Methodology and Technical Design' },
                  { id: 'ch4', num: 'Chapter 4', title: 'Results, Analysis, and Discussion' },
                  { id: 'ch5', num: 'Chapter 5', title: 'Summary, Conclusions, and Recommendations' },
                ].map((ch, idx) => {
                  const sectionData = selectedManuscript.sections?.find((s) => s.order === idx + 1 || s.id === `chapter_${idx + 1}`);
                  const isDone = sectionData?.status === 'completed' || selectedManuscript.status === 'approved' || selectedManuscript.status === 'accepted';
                  return (
                    <div
                      key={ch.id}
                      className="p-3 rounded-xl border border-gray-100 dark:border-[#222433] bg-gray-50/70 dark:bg-[#1c1d28]/70 flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-gray-900 dark:text-white">
                          {ch.num}: {ch.title}
                        </div>
                        {sectionData?.feedbackComment && (
                          <div className="text-[11px] text-rose-500 dark:text-rose-400">
                            Notes: {sectionData.feedbackComment}
                          </div>
                        )}
                      </div>
                      <Badge variant={isDone ? 'emerald' : sectionData?.status === 'revision_required' ? 'rose' : 'blue'} size="sm">
                        {isDone ? 'Approved' : sectionData?.status === 'revision_required' ? 'Revision' : 'In Progress'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-[#222433]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenFeedback(selectedManuscript)}
                className="text-xs"
              >
                <HiChatBubbleBottomCenterText className="w-3.5 h-3.5 mr-1 text-blue-500" />
                Add Review Comments
              </Button>
              <Button variant="primary" size="sm" onClick={() => setPaperModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 3. EDIT MANUSCRIPT DETAILS MODAL */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Manuscript Information"
        icon={HiPencilSquare}
        maxWidth="max-w-xl"
      >
        {selectedManuscript && (
          <form onSubmit={handleSubmitEdit} className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Manuscript Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Authors (comma-separated)
              </label>
              <Input
                value={editAuthors}
                onChange={(e) => setEditAuthors(e.target.value)}
                placeholder="Alex Rivera, Maria Santos"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Workflow Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full text-xs bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-2.5 text-gray-900 dark:text-white"
              >
                <option value="new_upload">New Upload</option>
                <option value="under_review">Under Review</option>
                <option value="ongoing_revision">Ongoing Revision</option>
                <option value="approved">Approved</option>
                <option value="accepted">Accepted</option>
                <option value="pending_publish">Pending Publish</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Abstract</label>
              <textarea
                rows={3}
                value={editAbstract}
                onChange={(e) => setEditAbstract(e.target.value)}
                className="w-full text-xs bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Keywords (comma-separated)</label>
              <Input
                value={editKeywords}
                onChange={(e) => setEditKeywords(e.target.value)}
                placeholder="IoT, Agriculture, Precision Sensing"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#222433]">
              <Button variant="outline" size="sm" type="button" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={submittingEdit}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* 4. BEST THESIS SELECTION MODAL */}
      <Modal
        isOpen={bestThesisModalOpen}
        onClose={() => setBestThesisModalOpen(false)}
        title="Best Thesis Designation & Award"
        icon={HiTrophy}
        maxWidth="max-w-md"
      >
        {selectedManuscript && (
          <form onSubmit={handleSubmitBestThesis} className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-semibold text-sm">
                {selectedManuscript.isBestThesis ? 'Remove Best Thesis Designation' : 'Award Best Thesis Honors'}
              </div>
              <p>
                {selectedManuscript.isBestThesis
                  ? 'This will remove the Best Thesis distinction and showcase tag from this manuscript.'
                  : 'Designate this manuscript for special university research honors and highlight in the repository showcase.'}
              </p>
            </div>

            {!selectedManuscript.isBestThesis && (
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Award Citation & Recognition Notes
                </label>
                <textarea
                  rows={3}
                  value={bestThesisNotes}
                  onChange={(e) => setBestThesisNotes(e.target.value)}
                  placeholder="E.g. Awarded Best Thesis 2026 for outstanding practical implementation and academic rigor."
                  className="w-full text-xs bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#222433]">
              <Button variant="outline" size="sm" type="button" onClick={() => setBestThesisModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={submittingBestThesis}
                className={selectedManuscript.isBestThesis ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}
              >
                {selectedManuscript.isBestThesis ? 'Remove Award' : 'Confirm Best Thesis'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AdminManuscripts;
