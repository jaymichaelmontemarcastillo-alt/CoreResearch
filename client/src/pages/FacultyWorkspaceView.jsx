// src/pages/FacultyWorkspaceView.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast } from '../components/ui/Toast';
import {
  HiBookOpen,
  HiUsers,
  HiCheckCircle,
  HiPencilSquare,
  HiArrowLeft,
  HiCalendar,
  HiExclamationCircle,
  HiPlusCircle,
  HiArchiveBox,
  HiArrowPath,
  HiShieldCheck,
  HiDocumentText,
  HiClock,
} from 'react-icons/hi2';
import manuscriptService from '../services/manuscript.service';
import researchWorkspaceService from '../services/researchWorkspace.service';
import researchTaskService from '../services/researchTask.service';
import researchFeedbackService from '../services/researchFeedback.service';
import progressService from '../services/progress.service';
import manuscriptDocumentAdapter from '../services/manuscriptDocumentAdapter';
import { groupService } from '../services/group.service';
import gradingService from '../services/grading.service';
import { ProposalGradingModal } from '../components/editor/ProposalGradingModal';
import { FinalGradingModal } from '../components/editor/FinalGradingModal';
import { ResearchProgressCircle } from '../components/research/ResearchProgressCircle';
import { MilestonesTracker } from '../components/research/MilestonesTracker';
import { TaskCard } from '../components/research/TaskCard';
import { TaskManagementModal } from '../components/research/TaskManagementModal';
import { ResearchFeedbackSection } from '../components/research/ResearchFeedbackSection';

export const FacultyWorkspaceView = () => {
  const { currentUser, userProfile, role, currentFacultyMode } = useAuth();
  const navigate = useNavigate();
  const { id: workspaceId } = useParams();

  const [workspace, setWorkspace] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingDoc, setOpeningDoc] = useState(false);
  const [toast, setToast] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [proposalEvals, setProposalEvals] = useState([]);
  const [finalEvals, setFinalEvals] = useState([]);
  const [selectedEval, setSelectedEval] = useState(null);
  const [gradingModalType, setGradingModalType] = useState(null);
  const [reviewingRevision, setReviewingRevision] = useState(false);

  const effectiveRole = role === 'faculty' ? currentFacultyMode : role;
  const isAdviser = effectiveRole === 'adviser';
  const isPanelist = effectiveRole === 'panelist';
  const isAdmin = effectiveRole === 'admin' || role === 'admin' || role === 'research_coordinator';
  const isAssignedAdviser = Boolean(
    workspace?.adviserId && currentUser?.uid && workspace.adviserId === currentUser.uid
  );
  const canApprove = isAdviser || isAssignedAdviser || isAdmin;
  const canRequestRevision = isAdviser || isAssignedAdviser || isPanelist || role === 'research_coordinator' || isAdmin;

  const requiresPostDefenseRevisions =
    Boolean(workspace?.postDefenseRevisionRequired) ||
    finalEvals.some(
      (ev) =>
        ev.verdict === 'PASSED_WITH_MINOR_REVISIONS' ||
        ev.verdict === 'PASSED_WITH_MAJOR_REVISIONS' ||
        ev.verdict === 'REDEFENSE'
    );

  const postDefenseStatus = workspace?.postDefenseRevisionStatus || (requiresPostDefenseRevisions ? 'revision_required' : 'none');

  const handleApprovePostDefenseRevisions = async () => {
    if (!workspace?.id) return;
    const confirmed = window.confirm('Are you sure you want to approve this group\'s post-defense revisions and unlock Institutional Repository publication?');
    if (!confirmed) return;

    setReviewingRevision(true);
    try {
      const res = await manuscriptService.reviewPostDefenseRevision(workspace.id, {
        decision: 'approved',
        reviewNotes: 'Post-defense revisions and point-by-point matrix verified and approved.'
      });
      setToast(res.message || 'Post-defense revisions formally approved! Repository publication unlocked.');
      if (res.data) setWorkspace(res.data);
    } catch (err) {
      alert(`Approval error: ${err.response?.data?.message || err.message}`);
    } finally {
      setReviewingRevision(false);
    }
  };

  const handleRequestFurtherRevisions = async () => {
    if (!workspace?.id) return;
    const notes = window.prompt('Enter specific directives or further revisions required from the students:');
    if (!notes || !notes.trim()) return;

    setReviewingRevision(true);
    try {
      const res = await manuscriptService.reviewPostDefenseRevision(workspace.id, {
        decision: 'revision_required',
        reviewNotes: notes.trim()
      });
      setToast(res.message || 'Returned to students for further revisions.');
      if (res.data) setWorkspace(res.data);
    } catch (err) {
      alert(`Review error: ${err.response?.data?.message || err.message}`);
    } finally {
      setReviewingRevision(false);
    }
  };

  useEffect(() => {
    let unsubscribeWs = () => {};
    let unsubscribeTasks = () => {};
    let unsubscribeFb = () => {};
    let unsubscribePEvals = () => {};
    let unsubscribeFEvals = () => {};

    const loadWorkspace = async () => {
      setLoading(true);
      try {
        if (!workspaceId) {
          throw new Error('Workspace ID is missing.');
        }

        let targetWorkspace = null;

        // 1. Try direct fetch by ID (checks if workspaceId is an active workspace document ID)
        try {
          const direct = await researchWorkspaceService.getWorkspaceById(workspaceId);
          if (direct && direct.status !== 'archived' && !direct.isArchived) {
            targetWorkspace = direct;
          }
        } catch (e) {
          console.warn('[FacultyWorkspaceView] Direct getWorkspaceById lookup fallback:', e);
        }

        // 2. If not found or if a Group ID was passed, query adviser's own workspaces (passes Firestore rules 100%)
        if (!targetWorkspace && currentUser?.uid) {
          try {
            const adviserWorkspaces = await researchWorkspaceService.getWorkspacesByAdviser(currentUser.uid);
            targetWorkspace = adviserWorkspaces.find(
              (w) => (w.id === workspaceId || w.groupId === workspaceId) && w.status !== 'archived' && !w.isArchived
            ) || null;
          } catch (e) {
            console.warn('[FacultyWorkspaceView] getWorkspacesByAdviser lookup fallback:', e);
          }
        }

        // 3. Check group doc directly for linked workspaceId
        if (!targetWorkspace) {
          try {
            const grp = await groupService.getGroupById(workspaceId);
            if (grp?.workspaceId) {
              const linkedWs = await researchWorkspaceService.getWorkspaceById(grp.workspaceId);
              if (linkedWs && linkedWs.status !== 'archived' && !linkedWs.isArchived) {
                targetWorkspace = linkedWs;
              }
            }
          } catch (e) {
            console.warn('[FacultyWorkspaceView] Group linked workspaceId lookup fallback:', e);
          }
        }

        // 4. Fallback lookup by student or group with safe catch
        if (!targetWorkspace) {
          try {
            targetWorkspace = await researchWorkspaceService.getWorkspaceByStudentOrGroup('', workspaceId);
          } catch (e) {
            console.warn('[FacultyWorkspaceView] getWorkspaceByStudentOrGroup lookup fallback:', e);
          }
        }
        
        if (targetWorkspace) {
          if (workspaceId !== targetWorkspace.id) {
            navigate(`/faculty/workspace/${targetWorkspace.id}`, { replace: true });
          }
          setWorkspace(targetWorkspace);

          unsubscribeWs = researchWorkspaceService.subscribeWorkspace(
            targetWorkspace.id,
            (updated) => {
              if (updated) setWorkspace(updated);
            }
          );

          unsubscribeTasks = researchTaskService.subscribeWorkspaceTasks(
            targetWorkspace.id,
            (updatedTasks) => setTasks(updatedTasks)
          );

          unsubscribeFb = researchFeedbackService.subscribeWorkspaceFeedback(
            targetWorkspace.id,
            (updatedFb) => setFeedbackList(updatedFb)
          );

          const evalOptions = {
            groupId: targetWorkspace.groupId,
            projectId: targetWorkspace.projectId,
            documentId: targetWorkspace.documentId,
          };
          unsubscribePEvals = gradingService.subscribeProposalEvaluationsByWorkspace(targetWorkspace.id, (evals) => {
             setProposalEvals(evals);
          }, evalOptions);
          unsubscribeFEvals = gradingService.subscribeFinalDefenseEvaluationsByWorkspace(targetWorkspace.id, (evals) => {
             setFinalEvals(evals);
          }, evalOptions);
        } else {
          setToast("Research workspace not found.");
        }
      } catch (err) {
        console.error('[FacultyWorkspaceView] Load failed:', err);
        setToast(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && workspaceId) {
      loadWorkspace();
    }

    return () => {
      unsubscribeWs();
      unsubscribeTasks();
      unsubscribeFb();
      unsubscribePEvals();
      unsubscribeFEvals();
    };
  }, [currentUser, workspaceId]);

  const handleOpenManuscript = async (chapterId) => {
    if (!workspace) return;
    setOpeningDoc(true);
    try {
      const { documentId, editorUrl } = await manuscriptDocumentAdapter.getOrCreateManuscriptDocument(
        workspace,
        { uid: currentUser.uid, fullName: currentUser.displayName, role: effectiveRole } // basic user profile info for tracking
      );
      
      // If a new document was provisioned, link it to the workspace so students and advisers use the SAME document ID
      if (workspace.documentId !== documentId) {
        await researchWorkspaceService.linkDocumentId(workspace.id, documentId);
      }

      const isReviewRole = isAdviser || isPanelist || isAdmin;
      const readModeParam = isReviewRole ? '&mode=read' : '';
      const targetUrl = chapterId
        ? `${editorUrl}?workspaceId=${workspace.id}&chapterId=${chapterId}${readModeParam}`
        : `${editorUrl}?workspaceId=${workspace.id}${readModeParam}`;

      navigate(targetUrl, { state: { from: location.pathname + location.search } });
    } catch (err) {
      setToast('Failed to open manuscript: ' + err.message);
    } finally {
      setOpeningDoc(false);
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    // Only advisers can verify completion. Let's assume the UI restricts it, but we also enforce here.
    if (!isAdviser) {
      setToast('Only advisers can change task status.');
      return;
    }
    try {
      await researchTaskService.updateTask(taskId, { status: newStatus });
    } catch (err) {
      setToast('Failed to update task: ' + err.message);
    }
  };

  const handleTaskReview = async (taskId, decision) => {
    try {
      await researchTaskService.reviewTask(taskId, decision);
      setToast(decision === 'completed' ? 'Task marked as completed.' : 'Task sent back for revision.');
    } catch (err) {
      setToast('Failed to review task: ' + err.message);
    }
  };

  const handleTaskDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await researchTaskService.deleteTask(taskId);
      setToast('Task deleted successfully.');
    } catch (err) {
      setToast('Failed to delete task: ' + err.message);
    }
  };

  const handleTaskCreated = async (taskInput) => {
    try {
      await researchTaskService.createTask(taskInput);
      setToast('Research task assigned successfully.');
      setIsTaskModalOpen(false);
    } catch (err) {
      setToast('Failed to assign task: ' + err.message);
    }
  };

  const handleOpenTaskInEditor = async (task) => {
    if (!workspace) return;
    try {
      const { documentId, editorUrl } = await manuscriptDocumentAdapter.getOrCreateManuscriptDocument(
        workspace,
        { uid: currentUser.uid, fullName: currentUser.displayName, role: effectiveRole }
      );
      if (workspace.documentId !== documentId) {
        await researchWorkspaceService.linkDocumentId(workspace.id, documentId);
      }
      const targetUrl = `${editorUrl}?workspaceId=${workspace.id}&focusTaskId=${task.id}`;
      navigate(targetUrl, { state: { from: location.pathname + location.search } });
    } catch (err) {
      setToast('Failed to open editor: ' + err.message);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'completed') return t.status === 'completed';
    return t.status !== 'completed';
  });

  if (loading) {
    return <div className="py-20 text-center text-gray-500">Loading Faculty Workspace...</div>;
  }

  if (!workspace) {
    return (
      <div className="py-20 text-center text-gray-500">
        <HiExclamationCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900">Workspace Not Found</h2>
        <Button onClick={() => navigate(-1)} className="mt-4" variant="outline">Go Back</Button>
      </div>
    );
  }

  const dynamicSections = progressService.getDynamicSections(workspace, tasks, feedbackList);
  const overallProgress = progressService.calculateWorkspaceProgress(workspace, tasks, feedbackList);
  const taskProgress = progressService.calculateTaskProgress(tasks, feedbackList);
  const milestones = progressService.getResearchMilestones(workspace, tasks, feedbackList);
  const currentFocusArea = progressService.getCurrentFocusArea(workspace, tasks, feedbackList);

  const handleApproveChapter = async (chapterId, chapterName) => {
    if (!canApprove) {
      setToast('Only the assigned adviser, coordinators, or administrators can approve chapters.');
      return;
    }
    const confirmApprove = window.confirm(
      `Are you sure you want to approve ${chapterName}?`
    );
    if (!confirmApprove) return;

    try {
      await researchWorkspaceService.approveChapter(
        workspace.id,
        chapterId,
        currentUser.uid,
        currentUser.displayName || userProfile?.fullName
      );
      setToast(`${chapterName} approved! Research progress updated.`);
    } catch (err) {
      console.error('[FacultyWorkspaceView] approveChapter error:', err);
      setToast('Failed to approve chapter: ' + err.message);
    }
  };

  const handleRequestRevision = async (chapterId, chapterName) => {
    if (!canRequestRevision) {
      setToast('Only the assigned adviser, defense panelists, coordinators, or administrators can request chapter revisions.');
      return;
    }
    const targetSection = (workspace.sections || []).find((s) => s.id === chapterId);
    const wasApproved = targetSection?.status === 'completed';

    const promptMsg = wasApproved
      ? `Flag ${chapterName} for revision?\n\nThis will revert its "Approved" status, deduct research progress, and notify students of required corrections.\n\nEnter revision instructions or defense notes:`
      : `Enter advisory revision instructions / notes for ${chapterName}:`;

    const comment = window.prompt(promptMsg);
    if (!comment || !comment.trim()) return;

    try {
      await researchWorkspaceService.requestRevisionChapter(
        workspace.id,
        chapterId,
        comment.trim(),
        currentUser.uid,
        currentUser.displayName || userProfile?.fullName || (isPanelist ? 'Defense Panelist' : 'Faculty Adviser')
      );
      setToast(
        wasApproved
          ? `${chapterName} reverted to revision required. Research progress updated.`
          : `Revision requested for ${chapterName}.`
      );
    } catch (err) {
      console.error('[FacultyWorkspaceView] requestRevision error:', err);
      setToast('Failed to request revision: ' + err.message);
    }
  };

  const handleArchiveAdvisee = async () => {
    if (!workspace) return;
    const isAssigned = workspace.adviserId === currentUser.uid;
    const isPrivileged = role === 'admin' || role === 'research_coordinator';
    if (!isAssigned && !isPrivileged) {
      setToast('Permission Denied: Only the assigned research adviser can archive this advisee group.');
      return;
    }

    const reason = window.prompt(
      `Archive "${workspace.groupName || workspace.title}" upon completion?\n\nEnter completion reason / milestone (e.g. Final Defense Passed & Manuscript Approved):`,
      'Final Defense Passed & Manuscript Approved'
    );
    if (reason === null) return; // cancelled

    try {
      await groupService.archiveAdviseeGroup(
        workspace.groupId || workspace.id,
        currentUser.uid,
        currentUser.displayName || userProfile?.fullName || 'Faculty Adviser',
        reason.trim() || 'Research completed and signed off.',
        role
      );
      setToast('Advisee group archived successfully upon completion.');
    } catch (err) {
      console.error('[FacultyWorkspaceView] Archive error:', err);
      setToast('Failed to archive advisee group: ' + err.message);
    }
  };

  const handleRestoreAdvisee = async () => {
    if (!workspace) return;
    const isAssigned = workspace.adviserId === currentUser.uid;
    const isPrivileged = role === 'admin' || role === 'research_coordinator';
    if (!isAssigned && !isPrivileged) {
      setToast('Permission Denied: Only the assigned research adviser can restore this advisee group.');
      return;
    }

    if (!window.confirm(`Restore "${workspace.groupName || workspace.title}" back to active advisees?`)) {
      return;
    }

    try {
      await groupService.unarchiveAdviseeGroup(
        workspace.groupId || workspace.id,
        currentUser.uid,
        currentUser.displayName || userProfile?.fullName || 'Faculty Adviser',
        role
      );
      setToast('Advisee group restored to active status.');
    } catch (err) {
      console.error('[FacultyWorkspaceView] Restore error:', err);
      setToast('Failed to restore advisee group: ' + err.message);
    }
  };

  const isArchived = Boolean(workspace?.isArchived || workspace?.status === 'archived');
  const canManageArchive = workspace && (workspace.adviserId === currentUser.uid || role === 'admin' || role === 'research_coordinator');

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} variant="error" onClose={() => setToast('')} />}

      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <HiArrowLeft className="w-4 h-4 mr-1" />
          Back to Advisees
        </button>

        {/* Top-Right Archive / Restore Quick Action */}
        {canManageArchive && (
          <div>
            {!isArchived ? (
              <button
                type="button"
                onClick={handleArchiveAdvisee}
                className="px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                title="Archive advisee group upon completion"
              >
                <HiArchiveBox className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Archive Advisee</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRestoreAdvisee}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                title="Restore advisee group to active list"
              >
                <HiArrowPath className="w-4 h-4 text-gray-500" />
                <span>Restore Advisee</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Archived Advisee Notice Banner */}
      {isArchived && (
        <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <HiArchiveBox className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
            <div>
              <p className="font-bold text-sm">Archived Research Advisee Group</p>
              <p className="text-purple-700 dark:text-purple-300 text-xs mt-0.5">
                {workspace.archiveReason
                  ? `Reason: ${workspace.archiveReason}`
                  : 'This advisee group has completed their research and has been archived.'}
                {workspace.archivedAt && ` • Archived on ${new Date(workspace.archivedAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          {canManageArchive && (
            <button
              type="button"
              onClick={handleRestoreAdvisee}
              className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-200 hover:bg-purple-50 dark:hover:bg-slate-700 font-semibold transition text-xs shrink-0 self-start sm:self-auto"
            >
              Restore to Active
            </button>
          )}
        </div>
      )}

      {/* Header Info */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 flex flex-col md:flex-row gap-6 justify-between items-start">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant={isArchived ? "purple" : "blue"} className="uppercase">
              {isArchived ? "ARCHIVED / COMPLETED" : workspace.status?.replace(/_/g, ' ')}
            </Badge>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1">
              <HiCalendar className="w-3.5 h-3.5" />
              {new Date(workspace.createdAt).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-white leading-tight">
            {workspace.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <HiUsers className="w-4 h-4 text-gray-400" />
              <span>Group: <strong className="text-gray-800 dark:text-gray-200">{workspace.groupName}</strong></span>
            </div>
          </div>
        </div>

        {/* Big Action Button */}
        <div className="shrink-0 w-full md:w-auto">
          <Button
            size="lg"
            variant="primary"
            onClick={handleOpenManuscript}
            disabled={openingDoc}
            className="w-full md:w-auto text-base py-3 px-6 shadow-md"
          >
            {openingDoc ? 'Opening...' : 'Open Manuscript for Review'}
            <HiPencilSquare className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-[10px] text-gray-400 mt-2 text-center md:text-right">
            Read-only mode. Use comments for feedback.
          </p>
        </div>
      </div>

      {/* Defense Ratings Section */}
      {(proposalEvals.length > 0 || finalEvals.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6">
          {proposalEvals.length > 0 && (
            <Card className="p-5 flex flex-col justify-between bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Proposal Defense Ratings</h3>
              </div>
              <div className="space-y-3">
                {proposalEvals.map(ev => (
                  <div key={ev.id} className="p-3 border border-gray-100 dark:border-slate-800 rounded-lg bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{ev.panelistName}</p>
                      <p className="text-xs text-gray-500">Verdict: {ev.verdict.replace(/_/g, ' ')}</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => { setSelectedEval(ev); setGradingModalType('proposal'); }}>
                      View Rubrics
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {finalEvals.length > 0 && (
            <Card className="p-5 flex flex-col justify-between bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Final Defense Ratings</h3>
              </div>
              <div className="space-y-3">
                {finalEvals.map(ev => (
                  <div key={ev.id} className="p-3 border border-gray-100 dark:border-slate-800 rounded-lg bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{ev.panelistName}</p>
                      <p className="text-xs text-gray-500">Verdict: {ev.verdict.replace(/_/g, ' ')}</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => { setSelectedEval(ev); setGradingModalType('final'); }}>
                      View Rubrics
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Full Width Milestones Tracker (Chapters 1–5) */}
      <Card className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
        <MilestonesTracker milestones={milestones} />
      </Card>

      {/* Main Grid */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${isAdmin ? 'items-stretch' : ''}`}>
        
        {/* Left Column: Progress Circle */}
        <div className={`lg:col-span-1 ${isAdmin ? 'flex flex-col' : 'space-y-6'}`}>
          <Card className={`p-6 ${isAdmin ? 'h-full flex flex-col justify-between' : ''}`}>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-6">
                Research Progress
              </h3>
            </div>
            <div className="flex flex-col items-center justify-center flex-1 my-auto py-2">
              <ResearchProgressCircle progress={overallProgress} size={140} />
              <div className="mt-4 text-center">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {currentFocusArea}
                </div>
                <div className="text-xs text-gray-500 mt-1">Current Focus Area</div>
              </div>
            </div>
            {isAdmin && (
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Overall Status:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {overallProgress}% Completed
                </span>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Chapters Review, Tasks & Feedback */}
        <div className={`lg:col-span-2 ${isAdmin ? 'flex flex-col' : 'space-y-6'}`}>
          
          {/* Manuscript Chapters Evaluation & Review */}
          <Card className={`p-6 space-y-4 ${isAdmin ? 'h-full flex flex-col justify-between' : ''}`}>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                  <HiBookOpen className="w-4 h-4 text-blue-600" />
                  Manuscript Chapters Review (Chapters 1–5)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Review submitted chapter drafts, view chapters, or approve to advance progress
                </p>
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">
                {milestones.filter((m) => m.completed).length} / 5 Approved ({overallProgress}%)
              </span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {dynamicSections.map((sec) => {
                const isCompleted = sec.status === 'completed';
                const isSubmitted = sec.status === 'submitted' || sec.status === 'under_review';
                const isRevision = sec.status === 'revision_required';

                return (
                  <div key={sec.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {sec.name}
                        </span>
                        <Badge
                          variant={
                            isCompleted
                              ? 'emerald'
                              : isSubmitted
                              ? 'blue'
                              : isRevision
                              ? 'rose'
                              : sec.status === 'in_progress'
                              ? 'amber'
                              : 'slate'
                          }
                        >
                          {isCompleted
                            ? 'Approved'
                            : isSubmitted
                            ? 'Submitted for Review'
                            : isRevision
                            ? 'Revision Required'
                            : sec.status === 'in_progress'
                            ? 'In Progress'
                            : 'Not Started'}
                        </Badge>
                      </div>

                      {sec.feedbackComment && isRevision && (
                        <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-200/50 dark:border-rose-900/30">
                          <span className="font-semibold">Adviser Notes:</span> {sec.feedbackComment}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        {isCompleted && sec.reviewedAt && (
                          <span>Approved {new Date(sec.reviewedAt).toLocaleDateString()}</span>
                        )}
                        {isSubmitted && sec.submittedAt && (
                          <span>Submitted {new Date(sec.submittedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Evaluation & Revision Actions */}
                    {(isAdviser || isPanelist || role === 'research_coordinator' || isAdmin) && (
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                        {isSubmitted ? (
                          <>
                            {(isAdviser || role === 'research_coordinator' || isAdmin) && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleApproveChapter(sec.id, sec.name)}
                                className="text-xs py-1.5 px-3 h-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                              >
                                Approve Chapter
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleOpenManuscript(sec.id)}
                              className="text-xs py-1.5 px-3 h-auto border border-gray-300 dark:border-slate-700 hover:border-blue-500 font-medium"
                            >
                              View Chapter
                            </Button>
                          </>
                        ) : isCompleted ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <HiCheckCircle className="w-3.5 h-3.5" /> Approved
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenManuscript(sec.id)}
                              className="text-xs py-1 px-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                              title="Open in document editor"
                            >
                              <HiPencilSquare className="w-3.5 h-3.5 mr-1" /> View
                            </Button>
                            {(isAdviser || role === 'research_coordinator' || isAdmin) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRequestRevision(sec.id, sec.name)}
                                className="text-xs py-1 px-2 text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                title="Revert approved chapter and flag revisions needed (deducts progress until resolved)"
                              >
                                Flag Revision
                              </Button>
                            )}
                          </div>
                        ) : isRevision ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-rose-500 italic">
                              Awaiting advisee revisions
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenManuscript(sec.id)}
                              className="text-xs py-1 px-2.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            >
                              <HiPencilSquare className="w-3.5 h-3.5 mr-1" /> View Chapter
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 italic">
                              Drafting in progress
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenManuscript(sec.id)}
                              className="text-xs py-1 px-2 text-gray-400 hover:text-blue-500"
                              title="View draft"
                            >
                              <HiPencilSquare className="w-3.5 h-3.5 mr-1" /> View
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Defense Ratings Summary */}
          {finalEvals.length > 0 && (
            <Card className="p-5 bg-white dark:bg-[#15161e] border border-gray-200/90 dark:border-[#222433] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#222433] pb-2.5">
                <h3 className="text-xs font-bold text-gray-500 dark:text-[#9396a8] uppercase tracking-wider">
                  Final Defense Ratings &amp; Verdicts
                </h3>
              </div>
              <div className="space-y-2">
                {finalEvals.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 border border-gray-100 dark:border-[#222433] rounded-lg bg-gray-50 dark:bg-[#1c1d28] flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{ev.panelistName}</p>
                      <p className="text-xs text-gray-500">Verdict: {ev.verdict.replace(/_/g, ' ')}</p>
                      {ev.revisionDirectives && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 italic">
                          "{ev.revisionDirectives}"
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setSelectedEval(ev);
                        setGradingModalType('final');
                      }}
                    >
                      View Rubrics
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Post-Defense Revision & Matrix Review Card */}
          {requiresPostDefenseRevisions && (
            <Card className="p-5 bg-gradient-to-br from-white to-amber-50/30 dark:from-[#15161e] dark:to-amber-950/10 border border-amber-200/90 dark:border-amber-900/40 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 dark:border-amber-900/40 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                    <HiDocumentText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Post-Defense Revision Review &amp; Clearance
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Verify point-by-point matrix against panel directives before approving repository publication
                    </p>
                  </div>
                </div>

                <div>
                  {postDefenseStatus === 'approved' ? (
                    <Badge variant="emerald" className="py-1 px-3 text-xs flex items-center gap-1.5 font-bold">
                      <HiShieldCheck className="w-4 h-4" /> Revisions Approved
                    </Badge>
                  ) : postDefenseStatus === 'under_review' ? (
                    <Badge variant="blue" className="py-1 px-3 text-xs flex items-center gap-1.5 font-bold">
                      <HiClock className="w-4 h-4" /> Submitted - Verification Needed
                    </Badge>
                  ) : (
                    <Badge variant="amber" className="py-1 px-3 text-xs flex items-center gap-1.5 font-bold">
                      <HiExclamationCircle className="w-4 h-4" /> Awaiting Student Submission
                    </Badge>
                  )}
                </div>
              </div>

              {/* Point-by-point matrix preview */}
              {workspace?.latestPostDefenseRevision?.revisionMatrix?.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <span>Submitted Point-by-Point Revision Matrix:</span>
                    <span className="text-[11px] font-normal text-gray-500">
                      Submitted on {new Date(workspace.latestPostDefenseRevision.submittedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-[#222433]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold">
                        <tr>
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">Panel Directive</th>
                          <th className="p-2.5">Changes Made by Students</th>
                          <th className="p-2.5">Ref</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-[#1a1b26]">
                        {workspace.latestPostDefenseRevision.revisionMatrix.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-bold text-gray-400">{idx + 1}</td>
                            <td className="p-2.5 text-gray-800 dark:text-gray-200">{row.directive}</td>
                            <td className="p-2.5 text-gray-600 dark:text-gray-300">{row.actionTaken}</td>
                            <td className="p-2.5 font-mono text-[11px] text-primary">{row.sectionOrPage || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {workspace.latestPostDefenseRevision.summaryNotes && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 italic pt-1">
                      <strong>Notes from students:</strong> "{workspace.latestPostDefenseRevision.summaryNotes}"
                    </p>
                  )}

                  {workspace.latestPostDefenseRevision.fileName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                      Attached Revised Document: <strong>{workspace.latestPostDefenseRevision.fileName}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  The defense panel has specified revisions. The student group has not yet submitted their revised manuscript and point-by-point revision matrix. Institutional repository publication is locked until approval.
                </div>
              )}

              {/* Faculty Decision & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {postDefenseStatus === 'approved' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <HiCheckCircle className="w-4 h-4" />
                      Approved by {workspace.postDefenseRevisionApprovedByName || 'Faculty'} on {new Date(workspace.postDefenseRevisionApprovedAt).toLocaleDateString()}. Repository publication unlocked.
                    </span>
                  ) : (
                    <span>
                      Verifying and approving these revisions unlocks repository publication for the student research group.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {postDefenseStatus !== 'approved' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRequestFurtherRevisions}
                        disabled={reviewingRevision}
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                      >
                        Request Further Revisions
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleApprovePostDefenseRevisions}
                        isLoading={reviewingRevision}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <HiShieldCheck className="w-4 h-4 mr-1.5" />
                        Approve Post-Defense Revisions
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Tasks Overview (Hidden in Admin view) */}
          {!isAdmin && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actionable Tasks
                </h3>
                
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button
                    onClick={() => setTaskFilter('all')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      taskFilter === 'all' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setTaskFilter('completed')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      taskFilter === 'completed' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Completed
                  </button>
                </div>

                {isAdviser && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setIsTaskModalOpen(true)}
                    className="ml-2"
                  >
                    <HiPlusCircle className="w-3.5 h-3.5 mr-1" /> Assign Task
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {filteredTasks.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-xl">
                    <HiCheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-500">
                      {taskFilter === 'completed' ? 'No completed tasks yet.' : 'All pending tasks have been completed!'}
                    </p>
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isAdviser={isAdviser}
                      onStatusChange={(newStatus) => handleTaskStatusChange(task.id, newStatus)}
                      onReview={handleTaskReview}
                      onDelete={handleTaskDelete}
                      onOpenInEditor={handleOpenTaskInEditor}
                    />
                  ))
                )}
              </div>
            </Card>
          )}

          {/* Feedback Threads (Hidden in Admin view) */}
          {!isAdmin && (
            <ResearchFeedbackSection 
              workspaceId={workspace.id}
              feedbackList={feedbackList}
              currentUser={currentUser}
              userProfile={{ ...userProfile, role: effectiveRole }} // Pass down effectiveRole
            />
          )}
        </div>
      </div>

      {isTaskModalOpen && (
        <TaskManagementModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          workspace={workspace}
          onTaskCreated={handleTaskCreated}
        />
      )}

      {/* Read-Only Modal for Advisers - Proposal */}
      {selectedEval && gradingModalType === 'proposal' && (
        <ProposalGradingModal
          isOpen={!!selectedEval}
          onClose={() => setSelectedEval(null)}
          onSubmit={() => {}}
          defenseType="proposal_defense"
          defenseId={selectedEval.defenseId}
          panelistId={selectedEval.panelistId}
          panelistName={selectedEval.panelistName}
          groupDetails={{
            ...workspace,
            adviser: workspace?.adviserName || workspace?.adviser || '',
            adviserName: workspace?.adviserName || workspace?.adviser || '',
            groupNo: workspace?.groupName || workspace?.groupNo || (workspace?.name || ''),
            title: workspace?.title || workspace?.projectTitle || workspace?.proposalTitle || '',
            proponents: Array.isArray(workspace?.members) && workspace.members.length > 0
              ? workspace.members.map((m) => m.fullName || m.name || m.email).filter(Boolean).join(', ')
              : (workspace?.proponents || ''),
            date: selectedEval?.meta?.date || selectedEval?.date || '',
            time: selectedEval?.meta?.time || selectedEval?.time || '',
            expert: selectedEval?.meta?.expert || selectedEval?.panelistRole || '',
          }}
          existingEval={selectedEval}
          readOnly={true}
        />
      )}

      {/* Read-Only Modal for Advisers - Final */}
      {selectedEval && gradingModalType === 'final' && (
        <FinalGradingModal
          isOpen={!!selectedEval}
          onClose={() => setSelectedEval(null)}
          onSubmit={() => {}}
          defenseType="final_defense"
          defenseId={selectedEval.defenseId}
          panelistId={selectedEval.panelistId}
          panelistName={selectedEval.panelistName}
          groupDetails={{
            ...workspace,
            adviser: workspace?.adviserName || workspace?.adviser || '',
            adviserName: workspace?.adviserName || workspace?.adviser || '',
            groupNo: workspace?.groupName || workspace?.groupNo || (workspace?.name || ''),
            title: workspace?.title || workspace?.projectTitle || workspace?.proposalTitle || '',
            proponents: Array.isArray(workspace?.members) && workspace.members.length > 0
              ? workspace.members.map((m) => m.fullName || m.name || m.email).filter(Boolean).join(', ')
              : (workspace?.proponents || ''),
            date: selectedEval?.meta?.date || selectedEval?.date || '',
            time: selectedEval?.meta?.time || selectedEval?.time || '',
            expert: selectedEval?.meta?.expert || selectedEval?.panelistRole || '',
          }}
          existingEval={selectedEval}
          readOnly={true}
        />
      )}
    </div>
  );
};
