// src/pages/StudentResearchWorkspace.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast } from '../components/ui/Toast';
import { useConfirm } from '../context/ConfirmContext';
import {
  HiBookOpen,
  HiUserCircle,
  HiUsers,
  HiCheckCircle,
  HiClock,
  HiPencilSquare,
  HiPlusCircle,
  HiExclamationCircle,
  HiPlay,
  HiPaperAirplane,
  HiDocumentText,
  HiTrash,
  HiPlus,
  HiLockClosed,
  HiShieldCheck,
} from 'react-icons/hi2';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import manuscriptService from '../services/manuscript.service';
import researchWorkspaceService from '../services/researchWorkspace.service';
import researchTaskService from '../services/researchTask.service';
import researchFeedbackService from '../services/researchFeedback.service';
import progressService from '../services/progress.service';
import manuscriptDocumentAdapter from '../services/manuscriptDocumentAdapter';
import titleProposalService from '../services/titleProposal.service';
import { adviserRequestService } from '../services/adviserRequest.service';
import groupService from '../services/group.service';
import { documentStore } from '../services/documentStore';
import dataCache from '../services/dataCache';
import gradingService from '../services/grading.service';
import { ProposalGradingModal } from '../components/editor/ProposalGradingModal';
import { FinalGradingModal } from '../components/editor/FinalGradingModal';
import { ResearchProgressCircle } from '../components/research/ResearchProgressCircle';
import { MilestonesTracker } from '../components/research/MilestonesTracker';
import { TaskCard } from '../components/research/TaskCard';
import { TaskManagementModal } from '../components/research/TaskManagementModal';
import { ResearchFeedbackSection } from '../components/research/ResearchFeedbackSection';

export const StudentResearchWorkspace = () => {
  const { currentUser, userProfile, role } = useAuth();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryWorkspaceId = searchParams.get('id') || searchParams.get('workspaceId');

  const [workspace, setWorkspace] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingDoc, setOpeningDoc] = useState(false);
  const [toast, setToast] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all');
  const [proposalEvals, setProposalEvals] = useState([]);
  const [finalEvals, setFinalEvals] = useState([]);
  const [selectedEval, setSelectedEval] = useState(null);
  const [gradingModalType, setGradingModalType] = useState(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const restartInProgressRef = useRef(false);

  // Post-Defense Revision Workflow state
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionMatrix, setRevisionMatrix] = useState([
    { directive: '', actionTaken: '', sectionOrPage: '' }
  ]);
  const [revisionSummary, setRevisionSummary] = useState('');
  const [revisedFile, setRevisedFile] = useState(null);
  const [submittingRevision, setSubmittingRevision] = useState(false);

  const isStudent = role === 'student';
  const isAdviser = role === 'adviser';
  const isCoordinator = role === 'research_coordinator' || role === 'admin';

  const requiresPostDefenseRevisions =
    Boolean(workspace?.postDefenseRevisionRequired) ||
    finalEvals.some(
      (ev) =>
        ev.verdict === 'PASSED_WITH_MINOR_REVISIONS' ||
        ev.verdict === 'PASSED_WITH_MAJOR_REVISIONS' ||
        ev.verdict === 'REDEFENSE'
    );

  const postDefenseStatus = workspace?.postDefenseRevisionStatus || (requiresPostDefenseRevisions ? 'revision_required' : 'none');

  const handleOpenRevisionModal = () => {
    if (workspace?.latestPostDefenseRevision?.revisionMatrix?.length > 0) {
      setRevisionMatrix(workspace.latestPostDefenseRevision.revisionMatrix);
      setRevisionSummary(workspace.latestPostDefenseRevision.summaryNotes || '');
    } else {
      const directivesList = finalEvals
        .filter((ev) => ev.revisionDirectives)
        .map((ev) => ev.revisionDirectives);

      if (directivesList.length > 0) {
        setRevisionMatrix(
          directivesList.map((dir) => ({
            directive: dir,
            actionTaken: '',
            sectionOrPage: ''
          }))
        );
      } else {
        setRevisionMatrix([{ directive: '', actionTaken: '', sectionOrPage: '' }]);
      }
    }
    setRevisionModalOpen(true);
  };

  const handleSubmitRevision = async (e) => {
    e.preventDefault();
    if (!workspace?.id) return;

    const invalid = revisionMatrix.some((row) => !row.directive.trim() || !row.actionTaken.trim());
    if (invalid) {
      alert('Please fill out all directives and corresponding actions taken in the revision matrix.');
      return;
    }

    if (revisedFile && revisedFile.size > 50 * 1024 * 1024) {
      alert('File size exceeds the 50MB limit.');
      return;
    }

    setSubmittingRevision(true);
    try {
      const payload = {
        revisionMatrix: revisionMatrix.map((r) => ({
          directive: r.directive.trim(),
          actionTaken: r.actionTaken.trim(),
          sectionOrPage: r.sectionOrPage.trim()
        })),
        summaryNotes: revisionSummary.trim(),
        fileName: revisedFile?.name || '',
        fileSize: revisedFile?.size || 0
      };

      const res = await manuscriptService.submitPostDefenseRevision(workspace.id, payload);
      setToast(res.message || 'Post-defense revisions & revision matrix submitted for faculty verification!');
      setRevisionModalOpen(false);
      if (res.data) setWorkspace(res.data);
    } catch (err) {
      alert(`Submission error: ${err.response?.data?.message || err.message}`);
    } finally {
      setSubmittingRevision(false);
    }
  };

  // 1. Initial Load
  useEffect(() => {
    // Advisers and faculty manage advisee research from /advisees and should not see the student workspace
    if (!queryWorkspaceId && (role === 'adviser' || role === 'faculty')) {
      navigate('/advisees', { replace: true });
      return;
    }
    // Admins and coordinators manage research from /admin/manuscripts unless inspecting a specific workspace
    if (!queryWorkspaceId && (role === 'admin' || role === 'research_coordinator')) {
      navigate('/admin/manuscripts', { replace: true });
      return;
    }

    let unsubscribeWs = () => {};
    let unsubscribeTasks = () => {};
    let unsubscribeFb = () => {};
    let unsubscribeRequests = () => {};
    let unsubscribePEvals = () => {};
    let unsubscribeFEvals = () => {};

    const loadWorkspace = async () => {
      setLoading(true);
      try {
        let targetWorkspace = null;

        // If direct workspace ID passed in query
        if (queryWorkspaceId) {
          targetWorkspace = await researchWorkspaceService.getWorkspaceById(queryWorkspaceId);
        } else if (isStudent) {
          // Resolve student's group & proposal
          const group = await groupService.getGroupByStudentId(currentUser.uid);
          const leaderUid = group?.memberIds?.[0] || group?.members?.[0]?.uid;
          
          if (group) {
            groupService.syncMemberToGroupProject(group.id, currentUser.uid, userProfile).catch((e) => {
              console.warn('[StudentResearchWorkspace] syncMemberToGroupProject fallback:', e);
            });
          }

          targetWorkspace = await researchWorkspaceService.getWorkspaceByStudentOrGroup(
            currentUser.uid,
            group?.id,
            leaderUid
          );

          // If no workspace found yet, check if group already has title, adviser, or accepted request/proposal
          if (!targetWorkspace && group && group.status !== 'forming' && group.adviserId && group.title) {
            try {
              targetWorkspace = await researchWorkspaceService.getOrCreateWorkspaceForGroup(group, userProfile, leaderUid);
            } catch (e) {
              console.warn('[StudentResearchWorkspace] Auto workspace create fallback:', e);
            }
          }

          // If no active workspace yet, check if matching is finished or redirect to /submit-title
          if (!targetWorkspace) {
            setLoading(false);
            // Check if there are any accepted requests or approved proposals
            try {
              const requests = await adviserRequestService.getRequestsForStudentOrGroup(currentUser.uid, group?.id);
              const accepted = requests.find((r) => r.status === 'accepted' && !r.isArchived);
              if (accepted) {
                const newWs = await researchWorkspaceService.getOrCreateWorkspaceForAdviserRequest(
                  accepted,
                  userProfile
                );
                targetWorkspace = newWs;
              } else {
                // If there is an approved proposal with assigned adviser
                if (group?.id) {
                  const props = await titleProposalService.getProposalsByGroup(group.id, leaderUid);
                  const approvedProp = props.find((p) => p.status === 'approved' && !p.isArchived);
                  if (approvedProp && (approvedProp.adviserId || group.adviserId)) {
                    const newWs = await researchWorkspaceService.getOrCreateWorkspaceForProposal(approvedProp, userProfile);
                    targetWorkspace = newWs;
                  }
                }
              }
            } catch (err) {
              console.warn('[StudentResearchWorkspace] Verification check error:', err);
            }

            if (!targetWorkspace) {
              // The group has NOT completed the matching process!
              // Redirect to submit-title immediately
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('workspace-status-changed', { detail: { hasWorkspace: false } }));
              }
              navigate('/submit-title', { replace: true });
              return;
            }
          }
        }

        if (targetWorkspace) {
          // Ensure current user is in workspace memberIds only if they are a student researcher
          if (isStudent && currentUser?.uid && (!targetWorkspace.memberIds || !targetWorkspace.memberIds.includes(currentUser.uid))) {
            researchWorkspaceService.addMemberToWorkspace(targetWorkspace.id, {
              uid: currentUser.uid,
              fullName: userProfile?.fullName || 'Student Researcher',
              email: userProfile?.email || '',
            }).catch(() => {});
          }
          setWorkspace(targetWorkspace);

          // Auto-sync missing adviser notifications for any submitted chapters
          if (targetWorkspace.adviserId) {
            researchWorkspaceService
              .syncSubmittedChapterNotificationsForAdviser(targetWorkspace.adviserId)
              .catch(() => {});
          }

          // Subscribe to evaluations in real-time across workspaceId, groupId, and projectId
          const evalOptions = {
            groupId: targetWorkspace.groupId || userProfile?.groupId,
            projectId: targetWorkspace.projectId,
            documentId: targetWorkspace.documentId,
          };
          unsubscribePEvals = gradingService.subscribeProposalEvaluationsByWorkspace(targetWorkspace.id, (evals) => {
             setProposalEvals(evals);
          }, evalOptions);
          unsubscribeFEvals = gradingService.subscribeFinalDefenseEvaluationsByWorkspace(targetWorkspace.id, (evals) => {
             setFinalEvals(evals);
          }, evalOptions);


          // Real-time subscriptions
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
        }
      } catch (err) {
        console.error('[StudentResearchWorkspace] Load failed:', err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadWorkspace();
    }

    return () => {
      unsubscribeWs();
      unsubscribeTasks();
      unsubscribeFb();
      unsubscribeRequests();
      unsubscribePEvals();
      unsubscribeFEvals();
    };
  }, [currentUser?.uid, queryWorkspaceId, isStudent, userProfile?.groupId]);

  // 2. Open / Provision Manuscript Document via Adapter
  const handleOpenManuscript = async () => {
    if (!workspace) return;
    setOpeningDoc(true);
    try {
      const { documentId, editorUrl } =
        await manuscriptDocumentAdapter.getOrCreateManuscriptDocument(
          workspace,
          userProfile
        );

      if (workspace.documentId !== documentId) {
        await researchWorkspaceService.linkDocumentId(workspace.id, documentId);
      }

      const targetUrl = isCoordinator
        ? `${editorUrl}?mode=read&workspaceId=${workspace.id}`
        : editorUrl;
      navigate(targetUrl, { state: { from: location.pathname + location.search } });
    } catch (err) {
      console.error('Failed to open manuscript document:', err);
      setToast('Failed to open manuscript editor: ' + err.message);
      setOpeningDoc(false);
    }
  };

  const handleResetWorkspace = async () => {
    if (!workspace || restartInProgressRef.current) return;
    restartInProgressRef.current = true;

    try {
      const isConfirmed = await confirm({
        title: "Restart Research Progress",
        message: "WARNING: This will archive your current workspace, manuscript, tasks, rubrics, and schedules. Your research group members and accounts will stay intact, and you will be prompted to submit a new research title proposal to start fresh. Proceed?",
        confirmText: "Archive and Restart",
        variant: "danger"
      });
      if (!isConfirmed) return;
      if (!currentUser?.uid) throw new Error('You must be signed in to restart research progress.');

      setIsRestarting(true);
      const reason = 'Student restarted research progress';

      // Authoritative backend restart archives all progress (workspace, manuscript, rubrics, tasks, schedules, comments)
      // while keeping group members and accounts intact
      await researchWorkspaceService.restartWorkspace(workspace.id, reason);

      dataCache.invalidate(`workspace_${currentUser.uid}`);
      dataCache.invalidate(`group_${currentUser.uid}`);
      dataCache.invalidate('user_docs');
      dataCache.invalidate('research_groups');
      dataCache.invalidate('proposals');
      dataCache.invalidate('schedules');
      try {
        localStorage.removeItem(`draft_${workspace.id}`);
      } catch (e) {}

      setWorkspace(null);
      setTasks([]);
      setFeedbackList([]);
      setProposalEvals([]);
      setFinalEvals([]);

      setToast('Research progress archived successfully. You can now submit a new title proposal with your group.');
      setTimeout(() => {
        navigate('/submit-title', { replace: true });
      }, 500);
    } catch (err) {
      console.error('Reset workspace error:', err);
      setToast('Failed to restart workspace: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      restartInProgressRef.current = false;
      setIsRestarting(false);
    }
  };

  // 3. Task Management Handlers
  const handleTaskStatusChange = async (taskId, status, note) => {
    try {
      await researchTaskService.updateTaskStatus(taskId, status, note);
      setToast('Task updated successfully.');
    } catch (err) {
      setToast('Error updating task: ' + err.message);
    }
  };

  const handleTaskReview = async (taskId, decision) => {
    try {
      await researchTaskService.reviewTask(taskId, decision);
      setToast(`Task marked as ${decision}.`);
    } catch (err) {
      setToast('Error reviewing task: ' + err.message);
    }
  };

  const handleTaskDelete = async (taskId) => {
    const isConfirmed = await confirm({
      title: "Delete Task",
      message: "Are you sure you want to delete this task?",
      confirmText: "Delete",
      variant: "danger"
    });
    if (!isConfirmed) return;
    try {
      await researchTaskService.deleteTask(taskId);
      setToast('Task deleted successfully.');
    } catch (err) {
      setToast('Error deleting task: ' + err.message);
    }
  };

  const handleTaskCreated = async (taskInput) => {
    try {
      await researchTaskService.createTask(taskInput);
      setToast('Research task assigned successfully.');
    } catch (err) {
      setToast('Failed to assign task: ' + err.message);
    }
  };

  // Open task in editor — navigate with focusTaskId
  const handleOpenTaskInEditor = async (task) => {
    if (!workspace) return;
    setOpeningDoc(true);
    try {
      const { documentId, editorUrl } =
        await manuscriptDocumentAdapter.getOrCreateManuscriptDocument(
          workspace,
          userProfile
        );

      if (workspace.documentId !== documentId) {
        await researchWorkspaceService.linkDocumentId(workspace.id, documentId);
      }

      const targetUrl = `${editorUrl}?workspaceId=${workspace.id}&focusTaskId=${task.id}`;
      navigate(targetUrl, { state: { from: location.pathname + location.search } });
    } catch (err) {
      console.error('Failed to open editor for task:', err);
      setToast('Failed to open editor: ' + err.message);
      setOpeningDoc(false);
    }
  };

  // 4. Feedback Handlers
  const handleAddFeedback = async (feedbackInput) => {
    try {
      await researchFeedbackService.createFeedback(feedbackInput);
      setToast('Feedback posted.');
    } catch (err) {
      setToast('Failed to post feedback: ' + err.message);
    }
  };

  const handleUpdateFeedbackStatus = async (feedbackId, status) => {
    try {
      await researchFeedbackService.updateFeedbackStatus(feedbackId, status);
      setToast(`Feedback status updated to ${status}.`);
    } catch (err) {
      setToast('Failed to update feedback: ' + err.message);
    }
  };

  // 5. Section Status Updater
  const handleSectionStatusChange = async (sectionId, status) => {
    if (!workspace) return;
    try {
      await researchWorkspaceService.updateSectionStatus(workspace.id, sectionId, status);
      setToast('Section status updated.');
    } catch (err) {
      setToast('Failed to update section: ' + err.message);
    }
  };

  // Dynamic progress calculations
  const dynamicSections = progressService.getDynamicSections(workspace, tasks, feedbackList);
  const overallProgress = progressService.calculateWorkspaceProgress(workspace, tasks, feedbackList);
  const taskProgress = progressService.calculateTaskProgress(tasks, feedbackList);
  const milestones = progressService.getResearchMilestones(workspace, tasks, feedbackList);
  const currentFocusArea = progressService.getCurrentFocusArea(workspace, tasks, feedbackList);

  const handleSubmitChapter = async (chapterId, chapterName) => {
    const isConfirmed = await confirm({
      title: "Submit Chapter",
      message: `Are you ready to submit ${chapterName} to your adviser for review?`,
      confirmText: "Submit",
      variant: "primary"
    });
    if (!isConfirmed) return;

    try {
      await researchWorkspaceService.submitChapter(
        workspace.id,
        chapterId,
        currentUser.uid,
        currentUser.displayName || userProfile?.fullName || 'Student'
      );
      setToast(`${chapterName} submitted for adviser review!`);
    } catch (err) {
      console.error('[StudentResearchWorkspace] submitChapter error:', err);
      setToast('Failed to submit chapter: ' + err.message);
    }
  };

  const handleStartChapter = async (chapterId, chapterName) => {
    try {
      await researchWorkspaceService.startChapter(workspace.id, chapterId);
      setToast(`Started working on ${chapterName}.`);
    } catch (err) {
      console.error('[StudentResearchWorkspace] startChapter error:', err);
      setToast('Failed to start chapter: ' + err.message);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const isDone = t.status === 'completed' || t.status === 'resolved';
    if (taskFilter === 'active') return !isDone;
    if (taskFilter === 'completed') return isDone;
    return true;
  });

  return (
    <div className="space-y-6">
      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast('')} />
      )}

      <PageHeader
        icon={HiBookOpen}
        title="Research Manuscript & Progress Workspace"
        description="Comprehensive research management workspace connecting title proposal, adviser guidance, manuscript progress, tasks, and reviews."
      />

      {loading ? (
        <div className="py-16 text-center text-gray-400 dark:text-gray-500">
          Loading research workspace data...
        </div>
      ) : !workspace ? (
        <Card className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto">
            <HiExclamationCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white">
            No Active Research Workspace Found
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            A research workspace becomes active once your Title Proposal is approved and an adviser is assigned.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/proposals')}
            >
              View Title Proposals
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const doc = await manuscriptDocumentAdapter.getOrCreateManuscriptDocument(
                    { id: `ws-${currentUser?.uid}`, title: 'Research Manuscript Draft', groupId: userProfile?.groupId || '' },
                    userProfile
                  );
                  navigate(doc.editorUrl, { state: { from: location.pathname + location.search } });
                } catch (e) {
                  navigate(`/documents/doc-${Date.now()}`, { state: { from: location.pathname + location.search } });
                }
              }}
            >
              <HiPencilSquare className="w-4 h-4 mr-1.5" />
              Open Manuscript Editor
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {/* Top Hero Card: Research Overview + Overall Progress Circle + Open Manuscript CTA */}
          <Card padding={false} className="p-4 sm:p-5 bg-white dark:bg-[#15161e] border border-gray-200/90 dark:border-[#222433] shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left Details (75%) */}
              <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  {/* Category */}
                  <div className="text-[10px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider">
                    {workspace.department || 'Department of Information Technology'}
                  </div>

                  {/* Title */}
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white leading-snug break-words" title={workspace.title}>
                    {workspace.title}
                  </h1>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-0.5">
                      Research Group
                    </span>
                    <span className="font-medium text-gray-900 dark:text-[#f3f4f8] flex items-center gap-1.5 text-xs sm:text-sm">
                      <HiUsers className="w-3.5 h-3.5 text-gray-400 dark:text-[#6b6f84]" />
                      {workspace.groupName} <span className="text-gray-500 dark:text-[#9396a8] font-normal">({workspace.studentName})</span>
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-0.5">
                      Faculty Adviser
                    </span>
                    <span className="font-medium text-gray-900 dark:text-[#f3f4f8] flex items-center gap-1.5 text-xs sm:text-sm">
                      <HiUserCircle className="w-3.5 h-3.5 text-gray-400 dark:text-[#6b6f84]" />
                      {workspace.adviserName || 'Adviser Assignment in Progress'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Progress Circle & Actions (25%) */}
              <div className="lg:col-span-4 xl:col-span-3 flex flex-col justify-between items-center lg:items-end w-full">
                {/* Dynamic Progress Circle */}
                <div className="flex-1 flex flex-col items-center justify-center lg:items-end w-full py-1">
                  <ResearchProgressCircle
                    progress={overallProgress}
                    size={116}
                    strokeWidth={9}
                    showDetails={false}
                  />
                  <div className="text-center lg:text-right mt-1.5">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block tracking-wide">
                      {currentFocusArea}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-[#6b6f84]">
                      Current Focus Area
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 w-full mt-3 lg:mt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-red-500 border-red-500/20 hover:bg-red-500/10 hover:text-red-400 transition-colors py-1 px-3 h-auto"
                    onClick={handleResetWorkspace}
                    disabled={isRestarting}
                  >
                    {isRestarting ? 'Restarting...' : 'Restart'}
                  </Button>
                  
                  <Button
                    variant="primary"
                    size="sm"
                    className="text-xs shadow-xs py-1 px-3.5 h-auto"
                    disabled={openingDoc}
                    onClick={handleOpenManuscript}
                  >
                    <HiPencilSquare className="w-3.5 h-3.5 mr-1.5" />
                    {openingDoc ? 'Opening...' : 'Open'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          
          {/* Defense Ratings Section */}
          {(proposalEvals.length > 0 || finalEvals.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {proposalEvals.length > 0 && (
                <Card className="p-4 sm:p-5 flex flex-col justify-between bg-white dark:bg-[#15161e] border border-gray-200/90 dark:border-[#222433] shadow-xs">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#222433] pb-2.5 mb-3">
                    <h3 className="text-xs font-bold text-gray-500 dark:text-[#9396a8] uppercase tracking-wider">Proposal Defense Ratings</h3>
                  </div>
                  <div className="space-y-3">
                    {proposalEvals.map(ev => (
                      <div key={ev.id} className="p-3 border border-gray-100 dark:border-[#222433] rounded-lg bg-gray-50 dark:bg-[#1c1d28] flex justify-between items-center">
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
                <Card className="p-4 sm:p-5 flex flex-col justify-between bg-white dark:bg-[#15161e] border border-gray-200/90 dark:border-[#222433] shadow-xs">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#222433] pb-2.5 mb-3">
                    <h3 className="text-xs font-bold text-gray-500 dark:text-[#9396a8] uppercase tracking-wider">Final Defense Ratings</h3>
                  </div>
                  <div className="space-y-3">
                    {finalEvals.map(ev => (
                      <div key={ev.id} className="p-3 border border-gray-100 dark:border-[#222433] rounded-lg bg-gray-50 dark:bg-[#1c1d28] flex justify-between items-center">
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

          {/* Post-Defense Manuscript Revision & Matrix Tracker Card */}
          {requiresPostDefenseRevisions && (
            <Card className="p-5 bg-gradient-to-br from-white to-amber-50/40 dark:from-[#15161e] dark:to-amber-950/10 border border-amber-200/90 dark:border-amber-900/40 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 dark:border-amber-900/40 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                    <HiDocumentText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Post-Defense Revision &amp; Matrix Tracker
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Traceable workflow addressing final defense directives before repository publication
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
                      <HiClock className="w-4 h-4" /> Under Faculty Review
                    </Badge>
                  ) : (
                    <Badge variant="amber" className="py-1 px-3 text-xs flex items-center gap-1.5 font-bold">
                      <HiExclamationCircle className="w-4 h-4" /> Revision &amp; Matrix Required
                    </Badge>
                  )}
                </div>
              </div>

              {/* Defense Directives Section */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                  <span>Panel Directives &amp; Required Recommendations:</span>
                </div>
                <div className="space-y-1.5">
                  {finalEvals
                    .filter((ev) => ev.revisionDirectives)
                    .map((ev, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-white/80 dark:bg-[#1c1d28]/80 border border-amber-100 dark:border-amber-900/30 text-xs text-gray-700 dark:text-gray-300 space-y-1"
                      >
                        <span className="font-semibold text-amber-800 dark:text-amber-300">
                          {ev.panelistName} ({ev.verdict.replace(/_/g, ' ')}):
                        </span>
                        <p className="whitespace-pre-line pl-2 text-gray-600 dark:text-gray-400 leading-relaxed">
                          {ev.revisionDirectives}
                        </p>
                      </div>
                    ))}
                  {finalEvals.filter((ev) => ev.revisionDirectives).length === 0 && (
                    <div className="p-3 rounded-lg bg-white dark:bg-[#1c1d28] border border-gray-100 dark:border-slate-800 text-xs text-gray-500 italic">
                      Directives specified during final defense. Address corrections in your point-by-point matrix.
                    </div>
                  )}
                </div>
              </div>

              {/* Latest Submission Summary */}
              {workspace?.latestPostDefenseRevision && (
                <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs space-y-1">
                  <div className="flex justify-between items-center text-blue-900 dark:text-blue-200 font-semibold">
                    <span>Submitted Revision Package ({workspace.latestPostDefenseRevision.revisionMatrix?.length || 0} Matrix Points)</span>
                    <span className="text-[11px] font-normal text-blue-700 dark:text-blue-300">
                      {new Date(workspace.latestPostDefenseRevision.submittedAt).toLocaleString()}
                    </span>
                  </div>
                  {workspace.latestPostDefenseRevision.summaryNotes && (
                    <p className="text-gray-600 dark:text-gray-300 italic">
                      "{workspace.latestPostDefenseRevision.summaryNotes}"
                    </p>
                  )}
                  {workspace.latestPostDefenseRevision.fileName && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Attached Document: <strong>{workspace.latestPostDefenseRevision.fileName}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Status & Repository Publication Gate Message */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  {postDefenseStatus === 'approved' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <HiCheckCircle className="w-4 h-4" />
                      Post-defense revisions formally approved by {workspace.postDefenseRevisionApprovedByName || 'Faculty Panel'}. Publication to digital repository unlocked!
                    </span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                      <HiLockClosed className="w-4 h-4" />
                      Repository publication remains locked until revisions and matrix are verified and approved by faculty.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {postDefenseStatus !== 'approved' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleOpenRevisionModal}
                      className="bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                    >
                      <HiPencilSquare className="w-4 h-4 mr-1.5" />
                      {postDefenseStatus === 'under_review' ? 'Update Revision & Matrix' : 'Submit Revisions & Matrix'}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/repository')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    >
                      <HiBookOpen className="w-4 h-4 mr-1.5" />
                      Publish to Institutional Repository
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}


          {/* Manuscript Chapters */}
          <div className="grid grid-cols-1 gap-4 sm:gap-5 items-stretch">
            <Card padding={false} className="p-4 sm:p-5 flex flex-col justify-between space-y-3 bg-white dark:bg-[#15161e] border border-gray-200/90 dark:border-[#222433] shadow-xs">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#222433] pb-2.5 shrink-0">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 dark:text-[#9396a8] uppercase tracking-wider">
                    Manuscript Chapters
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-gray-400 dark:text-[#6b6f84] mt-0.5">
                    Track individual progress &amp; approvals (1–5)
                  </p>
                </div>
              </div>

              <div className="space-y-2 flex-1 flex flex-col justify-between">
                {(dynamicSections || []).map((sec) => {
                  const isCompleted = sec.status === 'completed';
                  const isSubmitted = sec.status === 'submitted' || sec.status === 'under_review';
                  const isRevision = sec.status === 'revision_required';
                  const isInProgress = sec.status === 'in_progress';
                  const isNotStarted = sec.status === 'not_started' || sec.status === 'pending';

                  return (
                    <div
                      key={sec.id}
                      className="p-2.5 rounded-xl border border-gray-100 dark:border-[#222433] bg-gray-50/50 dark:bg-[#1c1d28]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-gray-200 dark:hover:border-[#2a2d3e] transition"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
                            {sec.name}
                          </span>
                        </div>

                        {/* Feedback comment if revision required */}
                        {sec.feedbackComment && (
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-1.5 rounded border border-rose-200 dark:border-rose-900/50">
                            <strong>Adviser Notes:</strong> {sec.feedbackComment}
                          </p>
                        )}

                        <div className="w-full max-w-[140px] bg-gray-200/80 dark:bg-[#15161e] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{
                              width: `${isCompleted ? 100 : sec.progress || 0}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center shrink-0">
                        {/* Status Badge Column */}
                        <div className="w-[110px] flex justify-end mr-4 shrink-0">
                          <Badge
                            variant={
                              isCompleted
                                ? 'emerald'
                                : isSubmitted
                                ? 'blue'
                                : isRevision
                                ? 'rose'
                                : isInProgress
                                ? 'amber'
                                : 'gray'
                            }
                            size="sm"
                            className="text-[10px] py-0.5 px-2.5 whitespace-nowrap"
                          >
                            {isCompleted
                              ? 'Approved'
                              : isSubmitted
                              ? 'Submitted'
                              : isRevision
                              ? 'Revision'
                              : isInProgress
                              ? 'In Progress'
                              : 'Not Started'}
                          </Badge>
                        </div>
                        
                        {/* Action Buttons Column */}
                        <div className="w-[125px] flex justify-end shrink-0">
                          {isStudent && (
                          <>
                            {isNotStarted && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/60 dark:hover:bg-blue-500/15 transition-all shadow-xs gap-1 py-1 px-2.5 h-auto w-full justify-center whitespace-nowrap"
                                onClick={() => handleStartChapter(sec.id, sec.name)}
                              >
                                <HiPlay className="w-3 h-3 fill-current shrink-0" />
                                Start Working
                              </Button>
                            )}
                            {(isInProgress || isRevision) && (
                              <Button
                                variant="primary"
                                size="sm"
                                className="text-[11px] font-semibold shadow-xs gap-1 py-1 px-2.5 h-auto w-full justify-center whitespace-nowrap"
                                onClick={() => handleSubmitChapter(sec.id, sec.name)}
                              >
                                <HiPaperAirplane className="w-3 h-3 shrink-0" />
                                Submit
                              </Button>
                            )}
                            {isSubmitted && (
                              <span className="text-[10px] text-blue-500 font-medium px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 flex items-center justify-center gap-1 w-full whitespace-nowrap">
                                <HiClock className="w-3 h-3 animate-pulse shrink-0" /> Awaiting Review
                              </span>
                            )}
                            {isCompleted && (
                              <span className="text-[10px] text-emerald-500 font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-center gap-1 w-full whitespace-nowrap">
                                <HiCheckCircle className="w-3 h-3 shrink-0" /> Approved
                              </span>
                            )}
                          </>
                        )}

                        {/* Adviser / Coordinator override controls */}
                        {(isAdviser || isCoordinator) && (
                          <select
                            className="text-[11px] p-1 rounded-md border border-gray-200 dark:border-[#222433] bg-white dark:bg-[#0e0f15] text-gray-700 dark:text-[#f3f4f8]"
                            value={sec.status}
                            onChange={(e) => handleSectionStatusChange(sec.id, e.target.value)}
                          >
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="submitted">Submitted</option>
                            <option value="revision_required">Revision Required</option>
                            <option value="completed">Completed / Approved</option>
                          </select>
                        )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>


        </div>
      )}

      {/* Adviser Task Creation Modal */}
      {isTaskModalOpen && (
        <TaskManagementModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          workspace={workspace}
          onTaskCreated={handleTaskCreated}
        />
      )}

      {/* Read-Only Modal for Students - Proposal */}
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

      {/* Read-Only Modal for Students - Final */}
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

      {/* Student Post-Defense Revision & Matrix Modal */}
      <Modal
        isOpen={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        title="Submit Post-Defense Revisions & Matrix"
        icon={HiDocumentText}
      >
        <form onSubmit={handleSubmitRevision} className="space-y-4">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Address all committee directives from your final defense presentation. Provide a point-by-point matrix detailing the exact adjustments made in the manuscript.
          </p>

          {/* Point-by-point Matrix Rows */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Point-by-Point Revision Matrix
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setRevisionMatrix((prev) => [
                    ...prev,
                    { directive: '', actionTaken: '', sectionOrPage: '' },
                  ])
                }
              >
                <HiPlus className="w-3.5 h-3.5 mr-1" /> Add Row
              </Button>
            </div>

            <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
              {revisionMatrix.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/60 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500">Item #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setRevisionMatrix((prev) => prev.filter((_, i) => i !== idx))
                      }
                      disabled={revisionMatrix.length <= 1}
                      className="text-rose-500 hover:text-rose-700 disabled:opacity-30"
                      title="Remove Row"
                    >
                      <HiTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Input
                    label="Panel Directive / Correction Required"
                    value={row.directive}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRevisionMatrix((prev) => {
                        const copy = [...prev];
                        copy[idx].directive = val;
                        return copy;
                      });
                    }}
                    required
                    placeholder="e.g. Include ANOVA test and significance values in Chapter 3"
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Input
                        label="Action Taken / Changes Made"
                        value={row.actionTaken}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRevisionMatrix((prev) => {
                            const copy = [...prev];
                            copy[idx].actionTaken = val;
                            return copy;
                          });
                        }}
                        required
                        placeholder="e.g. Performed one-way ANOVA with p < 0.05 tabulated in Table 3.4"
                      />
                    </div>
                    <div>
                      <Input
                        label="Section / Page Ref"
                        value={row.sectionOrPage}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRevisionMatrix((prev) => {
                            const copy = [...prev];
                            copy[idx].sectionOrPage = val;
                            return copy;
                          });
                        }}
                        placeholder="e.g. Ch. 3, p. 48"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revised Document File (Up to 50MB) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Revised Manuscript Document (PDF or DOCX, max 50MB)
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 50 * 1024 * 1024) {
                  alert(`File size exceeds 50MB limit.`);
                  e.target.value = '';
                  return;
                }
                setRevisedFile(file);
              }}
              className="block w-full text-xs text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-xs file:font-semibold
                file:bg-primary/10 file:text-primary
                hover:file:bg-primary/20"
            />
          </div>

          <Textarea
            label="Summary of Amendments & Response to Defense Panel"
            rows={2}
            value={revisionSummary}
            onChange={(e) => setRevisionSummary(e.target.value)}
            placeholder="Briefly summarize the revisions implemented across the document..."
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setRevisionModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submittingRevision}>
              Submit Revision &amp; Matrix for Verification
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StudentResearchWorkspace;
