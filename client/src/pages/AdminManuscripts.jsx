// src/pages/AdminManuscripts.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Toast } from '../components/ui/Toast';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import manuscriptService from '../services/manuscript.service';
import gradingService from '../services/grading.service';
import courseService from '../services/course.service';
import researchWorkspaceService from '../services/researchWorkspace.service';
import manuscriptDocumentAdapter from '../services/manuscriptDocumentAdapter';
import { documentStore } from '../services/documentStore';
import {
  HiDocumentText,
  HiMagnifyingGlass,
  HiFunnel,
  HiArrowPath,
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiStar,
  HiArchiveBox,
  HiArchiveBoxArrowDown,
  HiPencilSquare,
  HiCalculator,
  HiBookOpen,
  HiUserGroup,
  HiAcademicCap,
  HiTag,
  HiSparkles,
  HiTrophy,
  HiEye,
  HiArrowDownTray,
  HiTrash,
  HiCheckBadge,
  HiOutlineDocument,
  HiBuildingLibrary,
  HiUser,
  HiChevronDown,
  HiAdjustmentsHorizontal,
  HiEllipsisVertical
} from 'react-icons/hi2';

export const AdminManuscripts = () => {
  const { userProfile, role } = useAuth();
  const isAdmin = role === 'admin' || userProfile?.role === 'admin' || role === 'research_coordinator' || userProfile?.role === 'research_coordinator' || role === 'coordinator' || userProfile?.role === 'coordinator';
  const isCoordinator = role === 'research_coordinator' || userProfile?.role === 'research_coordinator' || role === 'coordinator' || userProfile?.role === 'coordinator';
  const isAuthorizedManager = isAdmin || isCoordinator;

  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation View / Tab: 'all' | 'publication_review' | 'ranking' | 'archived'
  const tabParam = searchParams.get('tab') || 'all';
  const [selectedTab, setSelectedTab] = useState(tabParam);

  // Sub-filter for Publication Review tab: 'all' | 'pending_publication' | 'approved' | 'rejected'
  const [pubSubFilter, setPubSubFilter] = useState('all');

  // Academic status filter dropdown
  const [academicStatusFilter, setAcademicStatusFilter] = useState('all');

  // Dynamic Programs and Majors from Admin Settings (courseService)
  const [programsList, setProgramsList] = useState([]);
  const [programFilter, setProgramFilter] = useState('all');
  const [majorFilter, setMajorFilter] = useState('all');

  // Data state
  const [manuscripts, setManuscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');

  // Select All Ref for indeterminate state
  const selectAllRef = useRef(null);

  // Modals state
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [gradeModalLoading, setGradeModalLoading] = useState(false);
  const [expandedEvalId, setExpandedEvalId] = useState(null);
  const [paperModalOpen, setPaperModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [bestThesisModalOpen, setBestThesisModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedManuscript, setSelectedManuscript] = useState(null);

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

  // Reject publication form
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Active three-dot action dropdown menu
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Load programs from Admin Settings (single source of truth)
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const courses = await courseService.getAllCourses();
        setProgramsList(courses || []);
      } catch (err) {
        console.warn('[AdminManuscripts] Failed to load programs configuration:', err);
      }
    };
    fetchPrograms();
  }, []);

  // Sync tab with URL
  useEffect(() => {
    if (tabParam !== selectedTab) {
      setSelectedTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab) => {
    setSelectedTab(newTab);
    setSearchParams({ tab: newTab });
    setSelectedIds([]); // Clear selection when switching views
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

  useEffect(() => {
    fetchManuscripts();
  }, []);

  // Compute available majors dynamically based on the selected program
  const availableMajors = useMemo(() => {
    if (programFilter === 'all') {
      const uniqueMap = new Map();
      programsList.forEach((prog) => {
        (prog.specializations || []).forEach((spec) => {
          if (!uniqueMap.has(spec.code)) {
            uniqueMap.set(spec.code, spec);
          }
        });
      });
      return Array.from(uniqueMap.values());
    }

    const currentCourse = programsList.find(
      (p) =>
        p.code?.toUpperCase() === programFilter.toUpperCase() ||
        p.id?.toLowerCase() === programFilter.toLowerCase()
    );
    return currentCourse?.specializations || [];
  }, [programsList, programFilter]);

  // Handle program filter change and reset major filter
  const handleProgramFilterChange = (newProg) => {
    setProgramFilter(newProg);
    setMajorFilter('all');
    setSelectedIds([]);
  };

  // Status mapping and counter badges for tabs
  const counts = useMemo(() => {
    const res = {
      all: 0,
      publicationReview: 0,
      pendingPublication: 0,
      approvedPublication: 0,
      rejectedPublication: 0,
      archived: 0,
      rankedEligible: 0,
    };

    manuscripts.forEach((m) => {
      const isArchived = Boolean(m.isArchived || m.status === 'archived');
      if (!isArchived) {
        res.all++;
        if (m.grade?.score && typeof m.grade.score === 'number' && m.grade.score > 0) {
          res.rankedEligible++;
        }
      } else {
        res.archived++;
      }

      // Publication status counters (separate from academic status)
      const pubStatus = m.publicationStatus || (m.status === 'published' ? 'approved' : (m.status === 'pending_publish' ? 'pending_publication' : null));
      if (pubStatus === 'pending_publication') res.pendingPublication++;
      if (pubStatus === 'approved') res.approvedPublication++;
      if (pubStatus === 'rejected') res.rejectedPublication++;
      if (pubStatus) res.publicationReview++;
    });

    return res;
  }, [manuscripts]);

  // Helper to test if a manuscript matches the program filter
  const matchesProgram = (m, filterProg) => {
    if (filterProg === 'all') return true;
    const target = filterProg.toUpperCase();
    const progCode = (m.program || m.courseId || '').toUpperCase();
    return progCode.includes(target) || target.includes(progCode);
  };

  // Helper to test if a manuscript matches the major filter
  const matchesMajor = (m, filterMaj) => {
    if (filterMaj === 'all') return true;
    const target = filterMaj.toUpperCase();
    const mMajor = (m.major || m.majorCode || m.specialization || '').toUpperCase();
    return mMajor.includes(target) || target.includes(mMajor);
  };

  // Filtered manuscripts according to active tab, program, major, academic status, and search query
  const filteredManuscripts = useMemo(() => {
    return manuscripts.filter((m) => {
      const isArchived = Boolean(m.isArchived || m.status === 'archived');

      // 1. Tab / View Filtering
      if (selectedTab === 'archived') {
        if (!isArchived) return false;
      } else if (selectedTab === 'publication_review') {
        if (isArchived) return false;
        const pubStatus = m.publicationStatus || (m.status === 'published' ? 'approved' : (m.status === 'pending_publish' ? 'pending_publication' : 'pending_publication'));
        if (pubSubFilter !== 'all' && pubStatus !== pubSubFilter) {
          return false;
        }
      } else if (selectedTab === 'all') {
        if (isArchived) return false;
      }

      // 2. Dynamic Program Filter
      if (!matchesProgram(m, programFilter)) return false;

      // 3. Dynamic Major/Specialization Filter
      if (!matchesMajor(m, majorFilter)) return false;

      // 4. Academic Status Filter
      if (academicStatusFilter !== 'all') {
        if (m.status !== academicStatusFilter) return false;
      }

      // 5. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const title = (m.title || m.projectTitle || '').toLowerCase();
        const uploader = (m.uploaderName || m.studentName || '').toLowerCase();
        const adviser = (m.adviserName || '').toLowerCase();
        const authors = Array.isArray(m.authors) ? m.authors.join(' ').toLowerCase() : '';
        const keywords = Array.isArray(m.keywords) ? m.keywords.join(' ').toLowerCase() : '';
        if (
          !title.includes(query) &&
          !uploader.includes(query) &&
          !adviser.includes(query) &&
          !authors.includes(query) &&
          !keywords.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    manuscripts,
    selectedTab,
    pubSubFilter,
    programFilter,
    majorFilter,
    academicStatusFilter,
    searchQuery,
  ]);

  // Top 5 Ranking based on finalized panelist grades (only eligible active manuscripts)
  const top5Manuscripts = useMemo(() => {
    const eligible = manuscripts.filter((m) => {
      // Must be active
      if (m.isArchived || m.status === 'archived') return false;
      // Must have valid finalized panelist score
      if (!m.grade || typeof m.grade.score !== 'number' || m.grade.score <= 0) return false;
      // Match active program and major filters
      if (!matchesProgram(m, programFilter)) return false;
      if (!matchesMajor(m, majorFilter)) return false;
      return true;
    });

    // Authoritative sort: Primary by score descending, secondary by date
    return eligible
      .sort((a, b) => {
        if (b.grade.score !== a.grade.score) {
          return b.grade.score - a.grade.score;
        }
        const timeA = new Date(a.grade.updatedAt || a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.grade.updatedAt || b.updatedAt || b.createdAt || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return (a.title || '').localeCompare(b.title || '');
      })
      .slice(0, 5);
  }, [manuscripts, programFilter, majorFilter]);

  // Handle Indeterminate state on Select All checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedIds.length > 0 && selectedIds.length < filteredManuscripts.length;
    }
  }, [selectedIds, filteredManuscripts]);

  // Selection handlers
  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    if (selectedIds.length === filteredManuscripts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredManuscripts.map((m) => m.id));
    }
  };

  // Open Paper Viewer Modal
  const handleOpenPaper = (m) => {
    setSelectedManuscript(m);
    setPaperModalOpen(true);
  };

  // Open Defense Grade Modal & Synchronize Authoritative Evaluations
  const handleOpenGrade = async (m) => {
    setSelectedManuscript(m);
    setGradeModalOpen(true);
    setExpandedEvalId(null);
    setGradeModalLoading(true);

    try {
      const keys = [m.id, m.workspaceId, m.projectId, m.groupId, m.documentId, m.defenseId].filter(Boolean);
      const { proposalEvaluations, finalEvaluations } = await gradingService.getEvaluationsForEntity(keys);

      const allEvals = finalEvaluations.length > 0 ? finalEvaluations : proposalEvaluations;
      const defenseType = finalEvaluations.length > 0 ? 'final' : 'proposal';

      if (allEvals.length > 0) {
        const avgScore = Math.round(
          allEvals.reduce((sum, ev) => sum + (Number(ev.totalScore) || 0), 0) / allEvals.length
        );
        const letter =
          avgScore >= 95
            ? '1.00 (Excellent)'
            : avgScore >= 90
            ? '1.25 (Very Good)'
            : avgScore >= 85
            ? '1.50 (Good)'
            : avgScore >= 80
            ? '1.75 (Satisfactory)'
            : avgScore >= 75
            ? '2.00 (Passed)'
            : '5.00 (Failed / Re-defense)';
        const remarks =
          allEvals
            .map((e) => e.revisionDirectives || e.remarks || e.verdict)
            .filter(Boolean)
            .join('; ') || 'Defense Completed';

        setSelectedManuscript((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            grade: {
              score: avgScore,
              letter,
              remarks,
              panelistEvaluations: allEvals,
              defenseType,
            },
          };
        });
      }
    } catch (err) {
      console.error('[AdminManuscripts] Error fetching fresh evaluations:', err);
    } finally {
      setGradeModalLoading(false);
    }
  };

  // Open Live Research Workspace (Full Workspace View)
  const handleOpenWorkspace = async (m) => {
    try {
      let targetWsId = m.workspaceId;

      if (!targetWsId && m.sections && m.sections.length > 0) {
        targetWsId = m.id;
      }

      if (!targetWsId && (m.groupId || m.uploadedBy || m.studentId)) {
        const foundWs = await researchWorkspaceService.getWorkspaceByStudentOrGroup(
          m.uploadedBy || m.studentId || '',
          m.groupId
        );
        if (foundWs) targetWsId = foundWs.id;
      }

      if (targetWsId) {
        navigate(`/faculty/workspace/${targetWsId}`, {
          state: { from: location.pathname + location.search },
        });
        return;
      }

      // If no separate workspace document exists, but documentId exists, open in editor directly
      if (m.documentId) {
        const queryParams = new URLSearchParams({ mode: 'read' });
        if (m.workspaceId || m.id) queryParams.set('workspaceId', m.workspaceId || m.id);
        if (m.groupId) queryParams.set('groupId', m.groupId);
        navigate(`/documents/${m.documentId}?${queryParams.toString()}`, {
          state: {
            from: location.pathname + location.search,
            workspaceId: m.workspaceId || m.id,
            groupId: m.groupId,
            projectId: m.projectId,
          },
        });
        return;
      }

      if (m.fileUrl) {
        window.open(m.fileUrl, '_blank');
        return;
      }

      showToast('No active research workspace or document found for this manuscript record.', 'warning');
    } catch (err) {
      console.error('[AdminManuscripts] Error opening workspace:', err);
      showToast('Failed to open research workspace: ' + err.message, 'error');
    }
  };

  // Inspect Full Document in Integrated Editor (Read-Only by default for Admins)
  const handleInspectDocument = async (m, chapterId = '') => {
    try {
      let docId = m.documentId;
      let targetWs = null;

      if (m.workspaceId || (m.sections && m.sections.length > 0)) {
        const wsId = m.workspaceId || m.id;
        targetWs = await researchWorkspaceService.getWorkspaceById(wsId);
      }

      if (!targetWs && (m.groupId || m.uploadedBy || m.studentId)) {
        targetWs = await researchWorkspaceService.getWorkspaceByStudentOrGroup(
          m.uploadedBy || m.studentId || '',
          m.groupId
        );
      }

      if (targetWs) {
        const { documentId } = await manuscriptDocumentAdapter.getOrCreateManuscriptDocument(
          targetWs,
          userProfile
        );
        docId = documentId;
      }

      if (!docId) {
        const allDocs = await documentStore.fetchDocuments(userProfile);
        const match = (allDocs || []).find(
          (d) =>
            (m.groupId && d.groupId === m.groupId) ||
            (d.title && m.title && d.title.toLowerCase() === m.title.toLowerCase())
        );
        if (match && match.id) docId = match.id;
      }

      if (docId) {
        const resolvedWsId = targetWs?.id || m.workspaceId || m.id || '';
        const resolvedGroupId = targetWs?.groupId || m.groupId || '';
        const queryParams = new URLSearchParams({ mode: 'read' });
        if (resolvedWsId) queryParams.set('workspaceId', resolvedWsId);
        if (resolvedGroupId) queryParams.set('groupId', resolvedGroupId);
        if (chapterId) queryParams.set('chapterId', chapterId);

        const targetUrl = `/documents/${docId}?${queryParams.toString()}`;
        navigate(targetUrl, {
          state: {
            from: location.pathname + location.search,
            workspaceId: resolvedWsId,
            groupId: resolvedGroupId,
            projectId: targetWs?.projectId || m.projectId,
          },
        });
        return;
      }

      if (m.fileUrl) {
        window.open(m.fileUrl, '_blank');
        return;
      }

      showToast('No document or attached file found for this manuscript.', 'warning');
    } catch (err) {
      console.error('[AdminManuscripts] handleInspectDocument error:', err);
      showToast('Failed to open document: ' + err.message, 'error');
    }
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

  // Individual Archive / Restore action
  const handleToggleArchive = async (m) => {
    const isNowArchiving = !m.isArchived;
    const confirmed = await confirm({
      title: isNowArchiving ? 'Archive Manuscript' : 'Restore Manuscript',
      message: isNowArchiving
        ? `Are you sure you want to move "${m.title || m.projectTitle}" to the institutional archive? All defense evaluations, grades, revisions, and relationships will be preserved.`
        : `Are you sure you want to restore "${m.title || m.projectTitle}" back to active status?`,
      confirmText: isNowArchiving ? 'Archive' : 'Restore',
      variant: isNowArchiving ? 'danger' : 'primary',
    });
    if (!confirmed) return;

    try {
      await manuscriptService.toggleArchiveManuscript(m.id, isNowArchiving);
      showToast(
        isNowArchiving
          ? `Archived "${m.title || m.projectTitle}".`
          : `Restored "${m.title || m.projectTitle}" to active status.`
      );
      fetchManuscripts();
    } catch (err) {
      showToast('Failed to update archive status.', 'error');
    }
  };

  // Bulk Archive / Restore action
  const handleBulkArchive = async (targetArchiveState) => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const actionLabel = targetArchiveState ? 'Archive' : 'Restore';

    const confirmed = await confirm({
      title: `${actionLabel} Selected Manuscripts`,
      message: `Are you sure you want to ${actionLabel.toLowerCase()} ${count} selected manuscript(s)? All grades, revision history, and relationships are safely preserved.`,
      confirmText: `${actionLabel} (${count})`,
      variant: targetArchiveState ? 'danger' : 'primary',
    });
    if (!confirmed) return;

    try {
      const result = await manuscriptService.bulkArchiveManuscripts(selectedIds, targetArchiveState);
      if (result.failedCount === 0) {
        showToast(`Successfully ${actionLabel.toLowerCase()}d ${result.successCount} manuscript(s).`);
      } else {
        showToast(
          `Updated ${result.successCount} manuscript(s). ${result.failedCount} records failed.`,
          'warning'
        );
      }
      setSelectedIds([]);
      fetchManuscripts();
    } catch (err) {
      showToast(`Bulk ${actionLabel.toLowerCase()} operation failed.`, 'error');
    }
  };

  // Bulk Delete action (Admin only)
  const handleDeleteSelected = async () => {
    if (!isAdmin || selectedIds.length === 0) return;
    const confirmed = await confirm({
      title: 'Delete Manuscripts',
      message: `Are you sure you want to permanently delete ${selectedIds.length} selected manuscript(s)? This action cannot be undone.`,
      confirmText: 'Delete Permanently',
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
    if (!isAdmin) return;
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
      setSelectedIds((prev) => prev.filter((id) => id !== m.id));
      fetchManuscripts();
    } catch (err) {
      showToast('Failed to delete manuscript.', 'error');
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
          ? `Designated "${selectedManuscript.title || selectedManuscript.projectTitle}" as Best Thesis!`
          : 'Best Thesis designation removed.'
      );
      setBestThesisModalOpen(false);
      fetchManuscripts();
    } catch (err) {
      showToast('Failed to update Best Thesis status.', 'error');
    } finally {
      setSubmittingBestThesis(false);
    }
  };

  // Publication Review Actions: Approve
  const handleApprovePublication = async (m) => {
    const confirmed = await confirm({
      title: 'Approve for Repository Publication',
      message: `Approve "${m.title || m.projectTitle}" for release in the institutional Research Repository? This will make the approved research accessible according to repository visibility rules.`,
      confirmText: 'Approve & Publish',
      variant: 'primary',
    });
    if (!confirmed) return;

    try {
      await manuscriptService.approvePublication(m.id, { name: userProfile?.fullName });
      showToast('Manuscript approved and released to Institutional Repository!');
      fetchManuscripts();
    } catch (err) {
      showToast('Failed to approve publication.', 'error');
    }
  };

  // Publication Review Actions: Open Reject Modal
  const handleOpenRejectPublication = (m) => {
    setSelectedManuscript(m);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleSubmitRejectPublication = async (e) => {
    e.preventDefault();
    if (!selectedManuscript || !rejectionReason.trim()) return;
    setSubmittingReject(true);
    try {
      await manuscriptService.rejectPublication(selectedManuscript.id, rejectionReason.trim(), {
        name: userProfile?.fullName,
      });
      showToast('Publication rejected. Review feedback was recorded and authors notified.');
      setRejectModalOpen(false);
      fetchManuscripts();
    } catch (err) {
      showToast('Failed to reject publication.', 'error');
    } finally {
      setSubmittingReject(false);
    }
  };

  // Academic status badge helper
  const getAcademicStatusBadge = (m) => {
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
        return <Badge variant="emerald">Academic Approved</Badge>;
      case 'accepted':
        return <Badge variant="cyan">Accepted</Badge>;
      case 'completed':
        return <Badge variant="emerald">Completed</Badge>;
      default:
        return <Badge variant="gray">{m.status || 'Under Review'}</Badge>;
    }
  };

  // Publication workflow status badge helper
  const getPublicationStatusBadge = (m) => {
    const pubStatus = m.publicationStatus || (m.status === 'published' ? 'approved' : (m.status === 'pending_publish' ? 'pending_publication' : null));
    if (!pubStatus) return null;

    switch (pubStatus) {
      case 'pending_publication':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-600">
            <HiClock className="w-3.5 h-3.5" /> Pending Pub Review
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600">
            <HiCheckCircle className="w-3.5 h-3.5" /> Published in Repo
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-600">
            <HiXCircle className="w-3.5 h-3.5" /> Publication Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage('')} />
      )}

      {/* Clean Filter Navigation Bar */}
      <div className="flex items-center gap-8 border-b border-gray-200/80 dark:border-[#222433] overflow-x-auto scrollbar-none">
        {[
          { id: 'all', label: 'All Manuscripts', count: counts.all },
          {
            id: 'publication_review',
            label: 'Publication Review',
            count: counts.pendingPublication,
          },
          { id: 'ranking', label: 'Top 5 Leaderboard', icon: HiTrophy, count: counts.rankedEligible },
          { id: 'archived', label: 'Institutional Archive', icon: HiArchiveBox, count: counts.archived },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 pb-3.5 pt-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap -mb-px ${
                isActive
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'}`} />}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold leading-none ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-[#1c1d28] text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Floating Controls Row (No outer container - Controls float directly on the page) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 w-full">
        {/* Pill-shaped Search Bar */}
        <div className="relative flex-1 min-w-[280px]">
          <HiMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, author, or program..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#2b2d3f] rounded-full text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs transition-all"
          />
        </div>

        {/* Dropdowns & Filters Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dropdown 1: All Programs - Pill Shaped */}
          <div className="relative">
            <select
              value={programFilter}
              onChange={(e) => handleProgramFilterChange(e.target.value)}
              className="appearance-none pl-4 pr-9 py-2.5 text-xs sm:text-sm bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#2b2d3f] rounded-full text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs cursor-pointer transition-all"
              title="Filter by Program"
            >
              <option value="all">All Programs</option>
              {programsList.map((prog) => (
                <option key={prog.id} value={prog.code}>
                  {prog.code} — {prog.name}
                </option>
              ))}
            </select>
            <HiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Dropdown 2: All Majors / Specializations - Pill Shaped */}
          <div className="relative">
            <select
              value={majorFilter}
              onChange={(e) => setMajorFilter(e.target.value)}
              className="appearance-none pl-4 pr-9 py-2.5 text-xs sm:text-sm bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#2b2d3f] rounded-full text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs cursor-pointer transition-all"
              title="Filter by Major or Specialization"
            >
              <option value="all">
                {programFilter === 'all' ? 'All Majors / Specializations' : `All ${programFilter} Majors`}
              </option>
              {availableMajors.map((maj) => (
                <option key={maj.id || maj.code} value={maj.code}>
                  {maj.code} — {maj.name}
                </option>
              ))}
            </select>
            <HiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Dropdown 3: All Academic Statuses - Pill Shaped */}
          {selectedTab !== 'archived' && (
            <div className="relative">
              <select
                value={academicStatusFilter}
                onChange={(e) => setAcademicStatusFilter(e.target.value)}
                className="appearance-none pl-4 pr-9 py-2.5 text-xs sm:text-sm bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#2b2d3f] rounded-full text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs cursor-pointer transition-all"
              >
                <option value="all">All Academic Statuses</option>
                <option value="new_upload">New Upload</option>
                <option value="under_review">Under Review</option>
                <option value="ongoing_revision">Ongoing Revision</option>
                <option value="approved">Academic Approved</option>
                <option value="accepted">Accepted</option>
                <option value="published">Published</option>
              </select>
              <HiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Filters Button - EXCLUDED from rounded pill styling */}
          <button
            type="button"
            onClick={() => {
              if (programFilter !== 'all' || majorFilter !== 'all' || academicStatusFilter !== 'all' || searchQuery) {
                setProgramFilter('all');
                setMajorFilter('all');
                setAcademicStatusFilter('all');
                setSearchQuery('');
                setSelectedIds([]);
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#2b2d3f] rounded-xl text-gray-700 dark:text-gray-200 shadow-xs hover:bg-gray-50 dark:hover:bg-[#1c1d28] transition-colors"
          >
            <HiAdjustmentsHorizontal className="w-4 h-4 text-gray-500" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Publication Review Sub-filter Pills (When on publication_review tab) */}
      {selectedTab === 'publication_review' && (
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
            Publication Review Stage:
          </span>
          {[
            { id: 'all', label: 'All Submissions' },
            { id: 'pending_publication', label: `Pending Review (${counts.pendingPublication})` },
            { id: 'approved', label: `Approved in Repo (${counts.approvedPublication})` },
            { id: 'rejected', label: `Publication Rejected (${counts.rejectedPublication})` },
          ].map((sub) => (
            <button
              key={sub.id}
              onClick={() => setPubSubFilter(sub.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                pubSubFilter === sub.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] text-gray-600 dark:text-[#9396a8] hover:bg-gray-50'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* Floating / Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && isAuthorizedManager && (
        <div className="sticky top-4 z-20 bg-blue-900/90 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-blue-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
            <HiCheckCircle className="w-5 h-5 text-blue-300" />
            <span>
              {selectedIds.length} manuscript{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedTab === 'archived' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleBulkArchive(false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <HiArchiveBoxArrowDown className="w-4 h-4 mr-1.5" /> Bulk Restore ({selectedIds.length})
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleBulkArchive(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <HiArchiveBox className="w-4 h-4 mr-1.5" /> Bulk Archive ({selectedIds.length})
              </Button>
            )}

            {isAdmin && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteSelected}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <HiTrash className="w-4 h-4 mr-1.5" /> Delete Selected ({selectedIds.length})
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* VIEW: TOP 5 RANKING LEADERBOARD */}
      {selectedTab === 'ranking' ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30">
            <div className="flex items-center gap-2.5">
              <HiTrophy className="w-6 h-6 text-amber-500" />
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {programFilter === 'all'
                    ? 'Top 5 Overall Research Manuscripts'
                    : majorFilter === 'all'
                    ? `Top 5 for ${programFilter}`
                    : `Top 5 for ${programFilter} — ${majorFilter}`}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Determined strictly by finalized panelist defense evaluations. The official Best Thesis honors are conferred separately by the Research Coordinator.
                </p>
              </div>
            </div>
          </div>

          {top5Manuscripts.length === 0 ? (
            <Card className="p-12 text-center">
              <EmptyState
                icon={HiTrophy}
                title="No Eligible Finalized Grades Found"
                description={`No manuscripts in ${
                  programFilter === 'all' ? 'the university' : programFilter
                } currently have finalized panelist defense evaluations recorded. Panelists must submit their defense rubrics to appear in the Top 5 rankings.`}
                action={
                  <Button variant="outline" size="sm" onClick={() => handleProgramFilterChange('all')}>
                    Show All Programs
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {top5Manuscripts.map((m, index) => {
                const rank = index + 1;
                return (
                  <Card
                    key={m.id}
                    className={`p-5 transition-all hover:shadow-md ${
                      rank === 1
                        ? 'border-amber-400 dark:border-amber-500/60 bg-gradient-to-r from-amber-50/50 dark:from-amber-950/20 to-transparent ring-1 ring-amber-400/30'
                        : rank === 2
                        ? 'border-slate-300 dark:border-slate-600 bg-gradient-to-r from-slate-50/50 dark:from-slate-900/20 to-transparent'
                        : rank === 3
                        ? 'border-amber-700/30 dark:border-amber-800/40'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Rank Badge & Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Rank Badge */}
                        <div
                          className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 font-extrabold shadow-sm ${
                            rank === 1
                              ? 'bg-amber-500 text-white ring-4 ring-amber-500/20'
                              : rank === 2
                              ? 'bg-slate-400 text-white ring-4 ring-slate-400/20'
                              : rank === 3
                              ? 'bg-amber-700 text-white ring-4 ring-amber-700/20'
                              : 'bg-gray-100 dark:bg-[#1c1d28] text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <span className="text-xs uppercase tracking-tighter">Rank</span>
                          <span className="text-lg leading-none">#{rank}</span>
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                              {m.program || 'BSIT'}
                            </span>
                            {m.major && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1c1d28] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                {m.major}
                              </span>
                            )}
                            {m.isBestThesis && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-300 dark:border-amber-600 animate-pulse">
                                <HiSparkles className="w-3.5 h-3.5 text-amber-600" /> Best Thesis Awardee
                              </span>
                            )}
                          </div>

                          <h4 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                            {m.title || m.projectTitle}
                          </h4>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-[#9396a8]">
                            <span>
                              Authors:{' '}
                              <strong className="text-gray-800 dark:text-gray-200 font-semibold">
                                {Array.isArray(m.authors) ? m.authors.join(', ') : m.uploaderName || 'Student Group'}
                              </strong>
                            </span>
                            <span>
                              Adviser:{' '}
                              <strong className="text-gray-800 dark:text-gray-200 font-semibold">
                                {m.adviserName || 'Assigned Adviser'}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Defense Grade & Action Buttons */}
                      <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                        <div className="text-right p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            Defense Grade
                          </div>
                          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                            {m.grade.score} <span className="text-xs font-normal text-gray-400">/ 100</span>
                          </div>
                          <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                            {m.grade.letter}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenPaper(m)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <HiBookOpen className="w-3.5 h-3.5 mr-1" /> View Paper
                          </Button>

                          {isAuthorizedManager && (
                            <Button
                              variant={m.isBestThesis ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => handleOpenBestThesis(m)}
                              className={
                                m.isBestThesis
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                  : 'border-amber-400 text-amber-700 dark:text-amber-400 hover:bg-amber-50'
                              }
                              title="Award or update Best Thesis honors (Coordinator/Admin)"
                            >
                              <HiStar className="w-3.5 h-3.5 mr-1" />
                              {m.isBestThesis ? 'Best Thesis ★' : 'Award BEST'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW: REGULAR MANUSCRIPT LIST (ALL, PUBLICATION REVIEW, ARCHIVED) */
        <div className="space-y-4">
          {/* Header Row: Showing X of Y manuscripts */}
          <div className="flex items-center justify-between">
            {selectedIds.length > 0 && isAuthorizedManager ? (
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-600 dark:text-gray-300">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  checked={selectedIds.length === filteredManuscripts.length}
                  onChange={toggleAllSelection}
                />
                <span>Select All ({filteredManuscripts.length})</span>
              </label>
            ) : <div />}
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Showing {filteredManuscripts.length} of {manuscripts.length} manuscripts
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-xs sm:text-sm text-gray-500">Loading manuscripts...</span>
            </div>
          ) : filteredManuscripts.length === 0 ? (
            <Card className="p-12 text-center">
              <EmptyState
                icon={HiDocumentText}
                title="No Manuscripts Match Your Filter Criteria"
                description="Try adjusting your Program, Major, search keywords, or switching filter tabs."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProgramFilter('all');
                      setMajorFilter('all');
                      setAcademicStatusFilter('all');
                      setSearchQuery('');
                      setSelectedIds([]);
                    }}
                  >
                    Reset Filters
                  </Button>
                }
              />
            </Card>
          ) : (
            filteredManuscripts.map((m, index) => {
              const iconThemes = [
                { bg: 'bg-[#eff6ff] dark:bg-blue-950/30', text: 'text-[#3b82f6] dark:text-blue-400' },
                { bg: 'bg-[#f5f3ff] dark:bg-purple-950/30', text: 'text-[#8b5cf6] dark:text-purple-400' },
                { bg: 'bg-[#fffbeb] dark:bg-amber-950/30', text: 'text-[#f59e0b] dark:text-amber-400' },
              ];
              const theme = iconThemes[index % iconThemes.length];
              const isPub = m.publicationStatus === 'approved' || m.status === 'published' || m.status === 'completed';
              const isEval =
                m.status === 'under_review' ||
                m.status === 'revisions_requested' ||
                m.status === 'revisions_required' ||
                m.status === 'ongoing_revision' ||
                m.publicationStatus === 'pending_publication';
              const isRepoPub = m.publicationStatus === 'approved' || m.status === 'published';

              return (
                <div
                  key={m.id}
                  className={`bg-white dark:bg-[#15161e] border rounded-2xl p-5 shadow-xs transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                    m.isBestThesis
                      ? 'border-amber-300 dark:border-amber-500/40'
                      : 'border-gray-100 dark:border-[#222433] hover:border-gray-200 dark:hover:border-gray-700'
                  }`}
                >
                  {/* Left: Document Icon & Details */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${theme.bg} ${theme.text} flex items-center justify-center shrink-0`}
                    >
                      <HiOutlineDocument className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.8]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-white text-[15px] sm:text-base leading-snug line-clamp-2">
                        {m.title || m.projectTitle}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-2 flex-wrap">
                        <HiAcademicCap className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-medium text-gray-600 dark:text-gray-300">
                          {m.program || 'BSIT'}
                        </span>
                        <span>·</span>
                        <span className="truncate">
                          {Array.isArray(m.authors)
                            ? m.authors.join(', ')
                            : m.uploaderName || 'Student Group'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <HiUser className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>
                          Adviser:{' '}
                          <span className="text-gray-700 dark:text-gray-300">
                            {m.adviserName || 'Michael Admin Castillo'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Vertical Divider 1 */}
                  <div className="hidden lg:block w-px h-14 bg-gray-100 dark:bg-[#222433] shrink-0 self-center" />

                  {/* Middle Column 1: Status & Publication Info */}
                  <div className="w-48 shrink-0 flex flex-col justify-center gap-1.5">
                    <div>
                      {isPub ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ecfdf5] text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-300 w-fit">
                          <span className="w-2 h-2 rounded-full bg-[#059669]" />
                          Published
                        </span>
                      ) : isEval ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#fffbeb] text-[#d97706] dark:bg-amber-950/40 dark:text-amber-300 w-fit">
                          <span className="w-2 h-2 rounded-full bg-[#d97706]" />
                          For Evaluation
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#eff6ff] text-[#2563eb] dark:bg-blue-950/40 dark:text-blue-300 w-fit">
                          <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
                          In Progress
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {isRepoPub ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <HiBuildingLibrary className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>Published in repository</span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">Not published</div>
                      )}
                      <div className="text-xs text-gray-400 font-normal">
                        {m.versionNumber || 'v1.0'}
                      </div>
                    </div>
                  </div>

                  {/* Vertical Divider 2 */}
                  <div className="hidden lg:block w-px h-14 bg-gray-100 dark:bg-[#222433] shrink-0 self-center" />

                  {/* Middle Column 2: Defense Grade */}
                  <div
                    onClick={() => handleOpenGrade(m)}
                    className="w-32 shrink-0 flex flex-col justify-center cursor-pointer group/grade p-1.5 -ml-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1f202e] transition-colors"
                    title="View official panelist defense evaluations & rubrics"
                  >
                    {m.grade && m.grade.score ? (
                      <div>
                        <div className="flex items-baseline">
                          <span className="text-xl font-bold text-[#16a34a] group-hover/grade:underline">{m.grade.score}</span>
                          <span className="text-xs text-gray-400 font-normal ml-0.5">/100</span>
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-normal flex items-center gap-1">
                          <span>Defense Grade</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xl font-normal text-gray-400 leading-none">—</div>
                        <div className="text-[11px] text-gray-400 mt-1.5 font-normal">
                          Pending Evaluation
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions (View Paper button + 3-dot dropdown menu) */}
                  <div className="flex items-center gap-3 shrink-0 relative">
                    <button
                      type="button"
                      onClick={() => handleOpenPaper(m)}
                      className="px-6 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      View Paper
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === m.id ? null : m.id);
                        }}
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-[#2b2d3f] hover:bg-gray-50 dark:hover:bg-[#1c1d28] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                        title="More actions"
                      >
                        <HiEllipsisVertical className="w-5 h-5 text-gray-400" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === m.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#181924] rounded-xl shadow-xl border border-gray-100 dark:border-[#2b2d3f] py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Defense Grade */}
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              handleOpenGrade(m);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#222433] text-left transition-colors"
                          >
                            <HiCalculator className="w-4 h-4 text-emerald-500" />
                            <span>
                              {m.grade?.score
                                ? `Defense Grade (${m.grade.score}/100)`
                                : 'Defense Evaluation'}
                            </span>
                          </button>

                          {/* Inspect / AI Analysis */}
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              handleInspectDocument(m);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#222433] text-left transition-colors"
                          >
                            <HiEye className="w-4 h-4 text-blue-500" />
                            <span>Inspect Document & AI</span>
                          </button>

                          {/* Research Workspace */}
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              handleOpenWorkspace(m);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#222433] text-left transition-colors"
                          >
                            <HiBookOpen className="w-4 h-4 text-indigo-500" />
                            <span>Open Workspace</span>
                          </button>

                          {/* Manager Options */}
                          {isAuthorizedManager && (
                            <>
                              <div className="my-1 border-t border-gray-100 dark:border-[#222433]" />

                              {/* Best Thesis toggle */}
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleOpenBestThesis(m);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-left transition-colors"
                              >
                                <HiStar className="w-4 h-4 text-amber-500" />
                                <span>
                                  {m.isBestThesis
                                    ? 'Manage Best Thesis Award'
                                    : 'Designate Best Thesis'}
                                </span>
                              </button>

                              {/* Publication Review Options */}
                              {(m.publicationStatus === 'pending_publication' ||
                                selectedTab === 'publication_review') && (
                                <>
                                  {m.publicationStatus !== 'approved' && (
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        handleApprovePublication(m);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-left transition-colors"
                                    >
                                      <HiCheckCircle className="w-4 h-4 text-purple-600" />
                                      <span>Approve Publication</span>
                                    </button>
                                  )}
                                  {m.publicationStatus !== 'rejected' && (
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        handleOpenRejectPublication(m);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-left transition-colors"
                                    >
                                      <HiXCircle className="w-4 h-4 text-rose-500" />
                                      <span>Reject Publication</span>
                                    </button>
                                  )}
                                </>
                              )}

                              {/* Archive / Restore */}
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleToggleArchive(m);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#222433] text-left transition-colors"
                              >
                                {m.isArchived ? (
                                  <>
                                    <HiArchiveBoxArrowDown className="w-4 h-4 text-blue-500" />
                                    <span>Restore Manuscript</span>
                                  </>
                                ) : (
                                  <>
                                    <HiArchiveBox className="w-4 h-4 text-gray-500" />
                                    <span>Move to Archive</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}

                          {/* Admin Only: Edit & Delete */}
                          {isAdmin && (
                            <>
                              <div className="my-1 border-t border-gray-100 dark:border-[#222433]" />
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleOpenEdit(m);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#222433] text-left transition-colors"
                              >
                                <HiPencilSquare className="w-4 h-4 text-gray-500" />
                                <span>Edit Details</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleDeleteSingle(m);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-left transition-colors"
                              >
                                <HiTrash className="w-4 h-4 text-rose-500" />
                                <span>Delete Manuscript</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL 1: VIEW MANUSCRIPT PAPER & CHAPTERS */}
      <Modal
        isOpen={paperModalOpen}
        onClose={() => setPaperModalOpen(false)}
        title="Manuscript Paper & Chapter Overview"
        icon={HiBookOpen}
        maxWidth="max-w-3xl"
      >
        {selectedManuscript && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#1c1d28] border border-gray-200/80 dark:border-[#222433] space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {getAcademicStatusBadge(selectedManuscript)}
                {getPublicationStatusBadge(selectedManuscript)}
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-200/80 dark:bg-[#282a3c] text-gray-700 dark:text-[#9396a8]">
                  {selectedManuscript.versionNumber || 'v1.0'}
                </span>
                <span className="text-xs text-gray-400">
                  {selectedManuscript.program || 'BSIT'} {selectedManuscript.major ? `• ${selectedManuscript.major}` : ''} {selectedManuscript.section ? `(${selectedManuscript.section})` : ''}
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
                Research Collaboration & Live Inspection:
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenWorkspace(selectedManuscript)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-xs"
                  title="Open live collaboration workspace with tasks and feedback"
                >
                  <HiEye className="w-3.5 h-3.5 mr-1" /> Open in Full Workspace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleInspectDocument(selectedManuscript)}
                  className="text-xs bg-white dark:bg-[#1a1b26] text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold"
                  title="Open manuscript content in document editor (Read-Only inspection)"
                >
                  <HiDocumentText className="w-3.5 h-3.5 mr-1" /> Read Full Paper (Editor)
                </Button>
                {selectedManuscript.fileUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedManuscript.fileUrl, '_blank')}
                    className="text-xs"
                    title="View uploaded PDF or attached manuscript file"
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

            {/* Manuscript Chapters Outline */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Manuscript Chapters Progress
                </h3>
                <span className="text-[11px] text-gray-400">Standard LSPU 5-Chapter Thesis Structure</span>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'chapter_1', num: 'Chapter 1', title: 'The Problem and Its Background (Objectives & Scope)' },
                  { id: 'chapter_2', num: 'Chapter 2', title: 'Review of Related Literature and Studies' },
                  { id: 'chapter_3', num: 'Chapter 3', title: 'Research Methodology and Technical Design' },
                  { id: 'chapter_4', num: 'Chapter 4', title: 'Results, Analysis, and Discussion' },
                  { id: 'chapter_5', num: 'Chapter 5', title: 'Summary, Conclusions, and Recommendations' },
                ].map((ch, idx) => {
                  const sectionData = selectedManuscript.sections?.find((s) => s.order === idx + 1 || s.id === ch.id || s.id === `ch${idx + 1}`);
                  const isDone = sectionData?.status === 'completed' || selectedManuscript.status === 'approved' || selectedManuscript.status === 'accepted';
                  return (
                    <div
                      key={ch.id}
                      className="p-3 rounded-xl border border-gray-100 dark:border-[#222433] bg-gray-50/70 dark:bg-[#1c1d28]/70 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-xs font-bold text-gray-900 dark:text-white">
                          {ch.num}: {ch.title}
                        </div>
                        {sectionData?.feedbackComment && (
                          <div className="text-[11px] text-rose-500 dark:text-rose-400">
                            Notes: {sectionData.feedbackComment}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={isDone ? 'emerald' : sectionData?.status === 'revision_required' ? 'rose' : 'blue'} size="sm">
                          {isDone ? 'Approved' : sectionData?.status === 'revision_required' ? 'Revision' : 'In Progress'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleInspectDocument(selectedManuscript, ch.id)}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2 py-1 font-semibold flex items-center gap-1"
                          title={`Inspect ${ch.num} in document editor`}
                        >
                          <HiEye className="w-3 h-3" /> Inspect
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-[#222433]">
              <Button variant="primary" size="sm" onClick={() => setPaperModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: OFFICIAL PANELIST DEFENSE EVALUATION & GRADES */}
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

            {gradeModalLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2.5">
                <HiArrowPath className="w-7 h-7 text-blue-500 animate-spin" />
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Fetching authoritative panelist evaluations...</span>
              </div>
            ) : selectedManuscript.grade && selectedManuscript.grade.score ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      {selectedManuscript.grade.defenseType === 'proposal'
                        ? 'Authoritative Proposal Defense Grade'
                        : 'Authoritative Final Defense Grade'}
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

                <div className="space-y-3">
                  <div className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Panelist Evaluations ({selectedManuscript.grade.panelistEvaluations?.length || 1})
                  </div>

                  {Array.isArray(selectedManuscript.grade.panelistEvaluations) &&
                  selectedManuscript.grade.panelistEvaluations.length > 0 ? (
                    selectedManuscript.grade.panelistEvaluations.map((ev, idx) => {
                      const evalKey = ev.id || `eval_${idx}`;
                      const isExpanded = expandedEvalId === evalKey;
                      const isProposal =
                        ev.rubricType === 'proposal' ||
                        (!ev.scores?.functionality && (ev.scores?.format || ev.subTotals?.oral === 30 || selectedManuscript.grade.defenseType === 'proposal'));

                      return (
                        <div
                          key={evalKey}
                          className="p-3.5 rounded-xl border border-gray-200/80 dark:border-[#222433] bg-white dark:bg-[#181924] space-y-2.5 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <HiAcademicCap className="w-4 h-4 text-blue-500" />
                              <span className="font-semibold text-xs text-gray-900 dark:text-white">
                                {ev.panelistName || 'Defense Panelist'}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                ({isProposal ? 'Proposal' : 'Final Defense'})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {ev.scores && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedEvalId(isExpanded ? null : evalKey)}
                                  className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                                >
                                  {isExpanded ? 'Hide Criteria' : 'View Criteria'}
                                </button>
                              )}
                              <Badge
                                variant={
                                  ev.verdict === 'APPROVED' || ev.verdict === 'PASSED'
                                    ? 'emerald'
                                    : ev.verdict === 'APPROVED_WITH_REVISIONS' ||
                                      ev.verdict === 'PASSED_WITH_MINOR_REVISIONS' ||
                                      ev.verdict === 'PASSED_WITH_MAJOR_REVISIONS'
                                    ? 'amber'
                                    : 'rose'
                                }
                                size="sm"
                              >
                                {ev.verdict ? String(ev.verdict).replace(/_/g, ' ') : 'PASSED'}
                              </Badge>
                            </div>
                          </div>

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
                                  {ev.subTotals.oral ?? '-'}/{isProposal ? '30' : '20'}
                                </div>
                              </div>
                              <div className="p-2 rounded-lg bg-gray-50 dark:bg-[#1c1d28]">
                                <div className="text-[10px] text-gray-400">Project / System</div>
                                <div className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                  {ev.subTotals.project ?? '-'}/{isProposal ? '40' : '50'}
                                </div>
                              </div>
                            </div>
                          )}

                          {ev.revisionDirectives && (
                            <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                              <span className="font-bold">Revision Directives: </span>
                              {ev.revisionDirectives}
                            </div>
                          )}

                          {ev.remarks && !ev.revisionDirectives && (
                            <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#1c1d28] p-2.5 rounded-lg border border-gray-100 dark:border-[#222433] italic">
                              "{ev.remarks}"
                            </p>
                          )}

                          {/* Expandable Criteria Breakdown */}
                          {isExpanded && ev.scores && (
                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-[#222433] space-y-1.5 text-[11px]">
                              <div className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                                Detailed Criteria Breakdown:
                              </div>
                              {isProposal ? (
                                <div className="grid grid-cols-2 gap-1.5 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#1c1d28] p-2.5 rounded-lg">
                                  <div>Format: <strong className="text-gray-900 dark:text-white">{ev.scores.format}/7</strong></div>
                                  <div>Problems: <strong className="text-gray-900 dark:text-white">{ev.scores.researchProblems}/8</strong></div>
                                  <div>Literature: <strong className="text-gray-900 dark:text-white">{ev.scores.relatedLiterature}/7</strong></div>
                                  <div>Methodology: <strong className="text-gray-900 dark:text-white">{ev.scores.methodology}/8</strong></div>
                                  <div>Presentation: <strong className="text-gray-900 dark:text-white">{ev.scores.presentation}/15</strong></div>
                                  <div>Defense: <strong className="text-gray-900 dark:text-white">{ev.scores.defense}/15</strong></div>
                                  <div>Innovation: <strong className="text-gray-900 dark:text-white">{ev.scores.innovation}/15</strong></div>
                                  <div>Application: <strong className="text-gray-900 dark:text-white">{ev.scores.application}/15</strong></div>
                                  <div>Impact: <strong className="text-gray-900 dark:text-white">{ev.scores.impact}/10</strong></div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-1.5 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#1c1d28] p-2.5 rounded-lg">
                                  <div>Format: <strong className="text-gray-900 dark:text-white">{ev.scores.format}/5</strong></div>
                                  <div>Problems: <strong className="text-gray-900 dark:text-white">{ev.scores.researchProblems}/5</strong></div>
                                  <div>Literature: <strong className="text-gray-900 dark:text-white">{ev.scores.relatedLiterature}/5</strong></div>
                                  <div>Methodology: <strong className="text-gray-900 dark:text-white">{ev.scores.methodology}/5</strong></div>
                                  <div>Background: <strong className="text-gray-900 dark:text-white">{ev.scores.technicalBackground}/5</strong></div>
                                  <div>Conclusions: <strong className="text-gray-900 dark:text-white">{ev.scores.summaryConclusions}/5</strong></div>
                                  <div>Presentation: <strong className="text-gray-900 dark:text-white">{ev.scores.presentation}/10</strong></div>
                                  <div>Defense: <strong className="text-gray-900 dark:text-white">{ev.scores.defense}/10</strong></div>
                                  <div>Functionality: <strong className="text-gray-900 dark:text-white">{ev.scores.functionality}/15</strong></div>
                                  <div>Usability: <strong className="text-gray-900 dark:text-white">{ev.scores.usability}/20</strong></div>
                                  <div>Reliability: <strong className="text-gray-900 dark:text-white">{ev.scores.reliability}/15</strong></div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3.5 rounded-xl border border-gray-100 dark:border-[#222433] bg-gray-50 dark:bg-[#1c1d28] text-xs text-gray-600 dark:text-gray-300">
                      Evaluated during defense. Score recorded: {selectedManuscript.grade.score}/100.
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
                  Panelists have not graded this manuscript's defense yet. Once panel members complete and finalize their defense rubrics, the authoritative scores will automatically populate here.
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

      {/* MODAL 3: EDIT MANUSCRIPT DETAILS */}
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
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Manuscript Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-2.5 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Authors (comma-separated)</label>
              <input
                type="text"
                value={editAuthors}
                onChange={(e) => setEditAuthors(e.target.value)}
                className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-2.5 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Abstract</label>
              <textarea
                rows={4}
                value={editAbstract}
                onChange={(e) => setEditAbstract(e.target.value)}
                className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-2.5 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Keywords (comma-separated)</label>
              <input
                type="text"
                value={editKeywords}
                onChange={(e) => setEditKeywords(e.target.value)}
                className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-2.5 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Academic Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-2.5 text-gray-900 dark:text-white"
              >
                <option value="new_upload">New Upload</option>
                <option value="under_review">Under Review</option>
                <option value="ongoing_revision">Ongoing Revision</option>
                <option value="approved">Academic Approved</option>
                <option value="accepted">Accepted</option>
              </select>
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

      {/* MODAL 4: BEST THESIS SELECTION MODAL (Requirement 9) */}
      <Modal
        isOpen={bestThesisModalOpen}
        onClose={() => setBestThesisModalOpen(false)}
        title="Best Thesis Designation"
        icon={HiTrophy}
        maxWidth="max-w-md"
      >
        {selectedManuscript && (
          <form onSubmit={handleSubmitBestThesis} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold text-sm">
                {selectedManuscript.isBestThesis ? 'Remove Best Thesis Designation' : 'Award Official Best Thesis Distinction'}
              </div>
              <p className="leading-relaxed">
                {selectedManuscript.isBestThesis
                  ? 'This will remove the official Best Thesis honors and badge from this manuscript. Its panelist defense grades and ranking will remain completely unaffected.'
                  : 'Designate this manuscript for highest university research honors. This decision is coordinator-directed and independent of grade ranking.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1c1d28] border border-gray-100 dark:border-[#222433] text-xs space-y-1">
              <div className="font-semibold text-gray-900 dark:text-white">
                {selectedManuscript.title || selectedManuscript.projectTitle}
              </div>
              <div className="text-gray-500">
                Program: {selectedManuscript.program || 'BSIT'} {selectedManuscript.major ? `• ${selectedManuscript.major}` : ''}
              </div>
              {selectedManuscript.grade?.score && (
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Final Defense Grade: {selectedManuscript.grade.score}/100
                </div>
              )}
            </div>

            {!selectedManuscript.isBestThesis && (
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Award Citation & Recognition Notes
                </label>
                <textarea
                  rows={3}
                  value={bestThesisNotes}
                  onChange={(e) => setBestThesisNotes(e.target.value)}
                  placeholder="E.g. Awarded Best Thesis for exceptional innovation, technical design, and empirical rigor."
                  className="w-full text-xs bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 mt-1"
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
                className={selectedManuscript.isBestThesis ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}
              >
                {selectedManuscript.isBestThesis ? 'Remove Designation' : 'Confirm Best Thesis'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 5: REJECT PUBLICATION MODAL (Requirement 7.3) */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Repository Publication"
        icon={HiXCircle}
        maxWidth="max-w-md"
      >
        {selectedManuscript && (
          <form onSubmit={handleSubmitRejectPublication} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-900 dark:text-rose-200 space-y-1">
              <div className="font-bold text-sm">Provide Rejection Reason & Feedback</div>
              <p className="leading-relaxed">
                The manuscript will remain unpublished in the Institutional Repository. Your constructive feedback will be saved to the review record and delivered to the authors. Academic grades and defense records are preserved.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Reason for Rejection / Camera-Ready Revision Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Specify required corrections (e.g., Abstract needs IEEE formatting, references must be updated, or camera-ready PDF file quality is insufficient)..."
                className="w-full text-xs bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-xl p-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#222433]">
              <Button variant="outline" size="sm" type="button" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                type="submit"
                isLoading={submittingReject}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Confirm Rejection
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AdminManuscripts;
