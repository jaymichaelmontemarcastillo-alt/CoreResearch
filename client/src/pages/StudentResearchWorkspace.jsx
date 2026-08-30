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
  const overallProgress = progressService.calculateWorkspaceProgress(workspace, tasks);
  const taskProgress = progressService.calculateTaskProgress(tasks);
  const milestones = progressService.getResearchMilestones(workspace, tasks);

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'active') return t.status !== 'completed';
    if (taskFilter === 'completed') return t.status === 'completed';
    return true;
  });

  const isSectionLocked = (secId) => {
    const phase = workspace?.researchPhase || 'CHAPTERS_1_3';
    if (phase === 'CHAPTERS_1_3' || phase === 'PROPOSAL_DEFENSE') {
      return ['chapter_4', 'chapter_5', 'final_manuscript'].includes(secId);
    }
    if (phase === 'CHAPTERS_4_5') {
      return ['final_manuscript'].includes(secId);
    }
    return false;
  };

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
          <Card className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Left Details (75%) */}
              <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* Category */}
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {workspace.department || 'Computer Studies'}
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white leading-tight line-clamp-3">
                    {workspace.title}
                  </h1>
                </div>

                {/* Metadata */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Research Group
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5 text-sm">
                      <Users className="w-4 h-4 text-gray-400" />
                      {workspace.groupName} <span className="text-gray-500 font-normal">({workspace.studentName})</span>
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Faculty Adviser
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5 text-sm">
                      <UserCheck className="w-4 h-4 text-gray-400" />
                      {workspace.adviserName || 'Adviser Assignment in Progress'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Progress Circle & Actions (25%) */}
              <div className="lg:col-span-4 xl:col-span-3 flex flex-col justify-between items-end w-full">
                {/* Dynamic Progress Circle */}
                <div className="flex-1 flex items-center justify-center lg:justify-end w-full lg:pr-8 py-2">
                  <ResearchProgressCircle
                    progress={overallProgress}
                    size={100}
                    strokeWidth={8}
                    showDetails={false}
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 w-full mt-4 lg:mt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
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
          <Card className="p-5">
            <MilestonesTracker milestones={milestones} />
          </Card>

          {/* Manuscript Sections Progress Table */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Manuscript Chapters &amp; Section Status
                </h3>
                <p className="text-xs text-gray-500">
                  Track individual progress and advisory evaluation across all manuscript sections
                </p>
              </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {(workspace.sections || []).map((sec) => {
                const locked = isSectionLocked(sec.id);
                return (
                  <div
                    key={sec.id}
                    className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${locked ? 'opacity-50' : ''}`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {sec.name}
                        </span>
                        {locked ? (
                          <Badge variant="gray">
                            <Lock className="w-3 h-3 mr-1 inline" /> LOCKED
                          </Badge>
                        ) : (
                          <Badge
                            variant={
                              sec.status === 'completed'
                                ? 'emerald'
                                : sec.status === 'under_review' || sec.status === 'submitted'
                                ? 'blue'
                                : sec.status === 'revision_required'
                                ? 'rose'
                                : 'gray'
                            }
                          >
                            {sec.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        )}
                      </div>

                      <div className="w-full max-w-xs bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-500"
                          style={{
                            width: `${locked ? 0 : (sec.status === 'completed' ? 100 : sec.progress || 0)}%`,
                          }}
                        />
                      </div>
                    </div>

                  {/* Section Controls for Adviser / Coordinator */}
                  {(isAdviser || isCoordinator) && !locked && (
                    <div className="flex items-center gap-2">
                      <select
                        className="text-xs p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300"
                        value={sec.status}
                        onChange={(e) => handleSectionStatusChange(sec.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="revision_required">Revision Required</option>
                        <option value="completed">Completed / Approved</option>
                      </select>
                    </div>
                  )}
                </div>
              )})}
            </div>
          </Card>

          {/* Grid Layout: Assigned Research Tasks (Left) & Advisory Feedback (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Management Panel */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Research Tasks ({tasks.length})
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg bg-gray-100 dark:bg-slate-800 p-0.5 text-xs">
                    <button
                      className={`px-2 py-1 rounded-md font-semibold ${
                        taskFilter === 'all'
                          ? 'bg-white dark:bg-slate-700 text-primary shadow-xs'
                          : 'text-gray-500'
                      }`}
                      onClick={() => setTaskFilter('all')}
                    >
                      All
                    </button>
                    <button
                      className={`px-2 py-1 rounded-md font-semibold ${
                        taskFilter === 'active'
                          ? 'bg-white dark:bg-slate-700 text-primary shadow-xs'
                          : 'text-gray-500'
                      }`}
                      onClick={() => setTaskFilter('active')}
                    >
                      Active
                    </button>
                    <button
                      className={`px-2 py-1 rounded-md font-semibold ${
                        taskFilter === 'completed'
                          ? 'bg-white dark:bg-slate-700 text-primary shadow-xs'
                          : 'text-gray-500'
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
