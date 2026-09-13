// src/pages/StudentResearchWorkspace.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast } from '../components/ui/Toast';
import {
  BookOpen,
  UserCheck,
  Users,
  CheckCircle2,
  Clock,
  FileEdit,
  ExternalLink,
  PlusCircle,
  Calendar,
  AlertCircle,
  Lock,
  Play,
  Send,
} from 'lucide-react';
import researchWorkspaceService from '../services/researchWorkspace.service';
import researchTaskService from '../services/researchTask.service';
import researchFeedbackService from '../services/researchFeedback.service';
import progressService from '../services/progress.service';
import manuscriptDocumentAdapter from '../services/manuscriptDocumentAdapter';
import titleProposalService from '../services/titleProposal.service';
import { adviserRequestService } from '../services/adviserRequest.service';
import groupService from '../services/group.service';
import { ResearchProgressCircle } from '../components/research/ResearchProgressCircle';
import { MilestonesTracker } from '../components/research/MilestonesTracker';
import { TaskCard } from '../components/research/TaskCard';
import { TaskManagementModal } from '../components/research/TaskManagementModal';
import { ResearchFeedbackSection } from '../components/research/ResearchFeedbackSection';

export const StudentResearchWorkspace = () => {
  const { currentUser, userProfile, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryWorkspaceId = searchParams.get('id');

  const [workspace, setWorkspace] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingDoc, setOpeningDoc] = useState(false);
  const [toast, setToast] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all');

  const isStudent = role === 'student';
  const isAdviser = role === 'adviser';
  const isCoordinator = role === 'research_coordinator' || role === 'admin';

  // 1. Initial Load
  useEffect(() => {
    let unsubscribeWs = () => {};
    let unsubscribeTasks = () => {};
    let unsubscribeFb = () => {};
    let unsubscribeRequests = () => {};

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
          targetWorkspace = await researchWorkspaceService.getWorkspaceByStudentOrGroup(
            currentUser.uid,
            group?.id
          );

          // If no workspace yet, subscribe to requests for real-time creation/feedback
          if (!targetWorkspace) {
            setLoading(false); // Done loading initial, waiting on subscriptions
            unsubscribeRequests = adviserRequestService.subscribeToStudentRequests(
              currentUser.uid,
              async (requests) => {
                const accepted = requests.find((r) => r.status === 'accepted');
                const declined = requests.find((r) => r.status === 'declined');
                const pending = requests.find((r) => r.status === 'pending');

                if (accepted && !workspace) {
                  setToast(`Adviser Request Accepted by ${accepted.adviserName}!`);
                  const newWs = await researchWorkspaceService.getOrCreateWorkspaceForAdviserRequest(
                    accepted,
                    userProfile
                  );
                  setWorkspace(newWs);
                  
                  // Now subscribe to the new workspace's inner tasks/feedbacks
                  unsubscribeWs = researchWorkspaceService.subscribeWorkspace(newWs.id, (u) => { if(u) setWorkspace(u); });
                  unsubscribeTasks = researchTaskService.subscribeWorkspaceTasks(newWs.id, (t) => setTasks(t));
                  unsubscribeFb = researchFeedbackService.subscribeWorkspaceFeedback(newWs.id, (f) => setFeedbackList(f));
                  
                  // Unsubscribe from requests since we have a workspace now
                  unsubscribeRequests();
                } else if (declined) {
                  setToast(`Adviser Request Declined by ${declined.adviserName}. You may select another adviser.`);
                  // Clear request after a moment so they can try again
                  setTimeout(() => {
                     adviserRequestService.deleteRequest(declined.id).then(() => {
                       navigate('/submit-title');
                     });
                  }, 2000);
                } else if (!pending && !accepted && !declined) {
                  // No requests at all, go to submit title
                  navigate('/submit-title');
                }
              },
              group?.id
            );
            return; // stop executing the rest of loadWorkspace
          }
        }

        if (targetWorkspace) {
          setWorkspace(targetWorkspace);

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

      navigate(editorUrl, { state: { from: location.pathname + location.search } });
    } catch (err) {
      console.error('Failed to open manuscript document:', err);
      setToast('Failed to open manuscript editor: ' + err.message);
      setOpeningDoc(false);
    }
  };

  const handleResetWorkspace = async () => {
    if (!workspace) return;
    const confirm = window.confirm("WARNING: This will permanently delete your current workspace so you can restart the title submission process. Proceed?");
    if (!confirm) return;

    try {
      // 1. Delete Workspace
      await researchWorkspaceService.deleteWorkspace(workspace.id);
      
      // 2. Fetch Group and clear adviser fields
      const group = await groupService.getGroupByStudentId(currentUser.uid);
      if (group) {
        await groupService.updateGroup(group.id, {
          adviserId: "",
          adviserName: ""
        });
      }

      // 3. Delete any associated adviser requests
      const requests = await adviserRequestService.getRequestsForStudentOrGroup(currentUser.uid, group?.id);
      for (const req of requests) {
        await adviserRequestService.deleteRequest(req.id);
      }

      setToast('Workspace deleted. You can now submit a new title.');
      navigate('/submit-title');
    } catch (err) {
      setToast('Failed to reset workspace: ' + err.message);
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
    if (!window.confirm('Are you sure you want to delete this task?')) return;
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
    const confirmSubmit = window.confirm(
      `Are you ready to submit ${chapterName} to your adviser for review?`
    );
    if (!confirmSubmit) return;

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
        icon={BookOpen}
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
            <AlertCircle className="w-6 h-6" />
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
              <FileEdit className="w-4 h-4 mr-1.5" />
              Open Manuscript Editor
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Top Hero Card: Research Overview + Overall Progress Circle + Open Manuscript CTA */}
          <Card className="p-6 bg-white dark:bg-[#15161e] border border-gray-200/90 dark:border-[#222433] shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Left Details (75%) */}
              <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* Category */}
                  <div className="text-xs font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider">
                    {workspace.department || 'Computer Studies'}
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight line-clamp-3">
                    {workspace.title}
                  </h1>
                </div>

                {/* Metadata */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1">
                      Research Group
                    </span>
                    <span className="font-medium text-gray-900 dark:text-[#f3f4f8] flex items-center gap-1.5 text-sm">
                      <Users className="w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
                      {workspace.groupName} <span className="text-gray-500 dark:text-[#9396a8] font-normal">({workspace.studentName})</span>
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1">
                      Faculty Adviser
                    </span>
                    <span className="font-medium text-gray-900 dark:text-[#f3f4f8] flex items-center gap-1.5 text-sm">
                      <UserCheck className="w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
                      {workspace.adviserName || 'Adviser Assignment in Progress'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Progress Circle & Actions (25%) */}
              <div className="lg:col-span-4 xl:col-span-3 flex flex-col justify-between items-end w-full">
                {/* Dynamic Progress Circle */}
                <div className="flex-1 flex flex-col items-center justify-center lg:items-end w-full lg:pr-8 py-2">
                  <ResearchProgressCircle
                    progress={overallProgress}
                    size={100}
                    strokeWidth={8}
                    showDetails={false}
                  />
                  <div className="text-center lg:text-right mt-2">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block tracking-wide">
                      {currentFocusArea}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-[#6b6f84]">
                      Current Focus Area
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 w-full mt-4 lg:mt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto text-red-500 border-red-500/20 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    onClick={handleResetWorkspace}
                  >
                    Restart
                  </Button>
                  
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full sm:w-auto shadow-sm"
                    disabled={openingDoc}
                    onClick={handleOpenManuscript}
                  >
                    <FileEdit className="w-4 h-4 mr-2" />
                    {openingDoc ? 'Opening...' : 'Open'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Milestones Tracker */}
          <Card className="p-5 bg-white dark:bg-[#15161e] border border-gray-200/90 dark:border-[#222433]">
            <MilestonesTracker milestones={milestones} />
          </Card>

          {/* Manuscript Sections Progress Table */}
          <Card className="p-5 space-y-4 bg-white dark:bg-[#15161e] border border-gray-200/90 dark:border-[#222433]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-[#9396a8] uppercase tracking-wider">
                  Manuscript Chapters (Chapters 1–5)
                </h3>
                <p className="text-xs text-gray-400 dark:text-[#6b6f84] mt-0.5">
                  Track individual progress, submit for advisory review, and monitor approvals across all 5 chapters
                </p>
              </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-[#222433]">
              {(dynamicSections || []).map((sec) => {
                const isCompleted = sec.status === 'completed';
                const isSubmitted = sec.status === 'submitted' || sec.status === 'under_review';
                const isRevision = sec.status === 'revision_required';
                const isInProgress = sec.status === 'in_progress';
                const isNotStarted = sec.status === 'not_started' || sec.status === 'pending';

                return (
                  <div
                    key={sec.id}
                    className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">
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
                              : isInProgress
                              ? 'amber'
                              : 'gray'
                          }
                        >
                          {isCompleted
                            ? 'Approved'
                            : isSubmitted
                            ? 'Submitted (Under Review)'
                            : isRevision
                            ? 'Revision Required'
                            : isInProgress
                            ? 'In Progress'
                            : 'Not Started'}
                        </Badge>
                      </div>

                      {/* Feedback comment if revision required */}
                      {sec.feedbackComment && (
                        <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2 rounded border border-rose-200 dark:border-rose-900/50">
                          <strong>Adviser Notes:</strong> {sec.feedbackComment}
                        </p>
                      )}

                      <div className="w-full max-w-xs bg-gray-100 dark:bg-[#1c1d28] h-1.5 rounded-full overflow-hidden border border-transparent dark:border-[#222433]">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                          style={{
                            width: `${isCompleted ? 100 : sec.progress || 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isStudent && (
                        <>
                          {isNotStarted && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/60 dark:hover:bg-blue-500/15 transition-all shadow-xs gap-1.5"
                              onClick={() => handleStartChapter(sec.id, sec.name)}
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Start Working
                            </Button>
                          )}
                          {(isInProgress || isRevision) && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs font-semibold shadow-xs gap-1.5"
                              onClick={() => handleSubmitChapter(sec.id, sec.name)}
                            >
                              <Send className="w-3.5 h-3.5" />
                              Submit for Review
                            </Button>
                          )}
                          {isSubmitted && (
                            <span className="text-xs text-blue-500 font-medium px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 animate-pulse" /> Awaiting Adviser Review
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-xs text-emerald-500 font-medium px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                            </span>
                          )}
                        </>
                      )}

                      {/* Adviser / Coordinator override controls */}
                      {(isAdviser || isCoordinator) && (
                        <select
                          className="text-xs p-1.5 rounded-lg border border-gray-200 dark:border-[#222433] bg-white dark:bg-[#0e0f15] text-gray-700 dark:text-[#f3f4f8]"
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
                );
              })}
            </div>
          </Card>

          {/* Grid Layout: Assigned Research Tasks (Left) & Advisory Feedback (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Management Panel */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-[#9396a8] uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    Research Tasks ({tasks.length})
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg bg-gray-100 dark:bg-[#1c1d28] p-0.5 text-xs border border-transparent dark:border-[#222433]">
                    <button
                      className={`px-2 py-1 rounded-md font-semibold transition-all ${
                        taskFilter === 'all'
                          ? 'bg-white dark:bg-[#15161e] text-blue-600 dark:text-blue-400 shadow-xs border border-gray-200 dark:border-[#222433]'
                          : 'text-gray-500 dark:text-[#9396a8]'
                      }`}
                      onClick={() => setTaskFilter('all')}
                    >
                      All
                    </button>
                    <button
                      className={`px-2 py-1 rounded-md font-semibold transition-all ${
                        taskFilter === 'active'
                          ? 'bg-white dark:bg-[#15161e] text-blue-600 dark:text-blue-400 shadow-xs border border-gray-200 dark:border-[#222433]'
                          : 'text-gray-500 dark:text-[#9396a8]'
                      }`}
                      onClick={() => setTaskFilter('active')}
                    >
                      Active
                    </button>
                    <button
                      className={`px-2 py-1 rounded-md font-semibold transition-all ${
                        taskFilter === 'completed'
                          ? 'bg-white dark:bg-[#15161e] text-blue-600 dark:text-blue-400 shadow-xs border border-gray-200 dark:border-[#222433]'
                          : 'text-gray-500 dark:text-[#9396a8]'
                      }`}
                      onClick={() => setTaskFilter('completed')}
                    >
                      Done
                    </button>
                  </div>

                  {isAdviser && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setIsTaskModalOpen(true)}
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" /> Assign Task
                    </Button>
                  )}
                </div>
              </div>

              {filteredTasks.length === 0 ? (
                <Card className="p-8 text-center text-xs text-gray-400 dark:text-gray-500 border-dashed">
                  No tasks found under the selected filter.
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      isStudent={isStudent}
                      isAdviser={isAdviser}
                      onStatusChange={handleTaskStatusChange}
                      onReview={handleTaskReview}
                      onDelete={handleTaskDelete}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Research Advisory Feedback Panel */}
            <div>
              <ResearchFeedbackSection
                feedbackList={feedbackList}
                workspace={workspace}
                currentUser={currentUser}
                userProfile={userProfile}
                isStudent={isStudent}
                isAdviser={isAdviser}
                onAddFeedback={handleAddFeedback}
                onUpdateStatus={handleUpdateFeedbackStatus}
              />
            </div>
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
    </div>
  );
};

export default StudentResearchWorkspace;
