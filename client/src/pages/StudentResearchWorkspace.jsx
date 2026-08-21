// src/pages/StudentResearchWorkspace.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  FolderGit2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import researchWorkspaceService from '../services/researchWorkspace.service';
import researchTaskService from '../services/researchTask.service';
import researchFeedbackService from '../services/researchFeedback.service';
import progressService from '../services/progress.service';
import manuscriptDocumentAdapter from '../services/manuscriptDocumentAdapter';
import titleProposalService from '../services/titleProposal.service';
import groupService from '../services/group.service';
import { ResearchProgressCircle } from '../components/research/ResearchProgressCircle';
import { MilestonesTracker } from '../components/research/MilestonesTracker';
import { TaskCard } from '../components/research/TaskCard';
import { TaskManagementModal } from '../components/research/TaskManagementModal';
import { ResearchFeedbackSection } from '../components/research/ResearchFeedbackSection';

export const StudentResearchWorkspace = () => {
  const { currentUser, userProfile, role } = useAuth();
  const navigate = useNavigate();
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

          // If no workspace yet, check if student has an approved proposal to auto-provision
          if (!targetWorkspace && group) {
            const groupProposals = await titleProposalService.getProposalsByGroup(group.id);
            const approved = groupProposals.find((p) => p.status === 'approved' || p.status === 'submitted');
            if (approved) {
              targetWorkspace = await researchWorkspaceService.getOrCreateWorkspaceForProposal(
                approved,
                userProfile
              );
            }
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

      navigate(editorUrl);
    } catch (err) {
      console.error('Failed to open manuscript document:', err);
      setToast('Failed to open manuscript editor: ' + err.message);
      setOpeningDoc(false);
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
  const overallProgress = progressService.calculateOverallProgress(workspace, tasks);
  const taskProgress = progressService.calculateTaskProgress(tasks);
  const milestones = progressService.getResearchMilestones(workspace, tasks);

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'active') return t.status !== 'completed';
    if (taskFilter === 'completed') return t.status === 'completed';
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
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            No Active Research Workspace Found
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            A research workspace becomes active once your Title Proposal is approved and an adviser is assigned.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/proposals')}
            >
              View Title Proposals
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Top Hero Card: Research Overview + Overall Progress Circle + Open Manuscript CTA */}
          <Card className="p-6 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-900/60 border border-gray-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              {/* Left Details */}
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="emerald">ACTIVE RESEARCH</Badge>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {workspace.department || 'College of Computer Studies'}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-snug">
                  {workspace.title}
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                    <Users className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400">Research Group</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {workspace.groupName} ({workspace.studentName})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                    <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400">Faculty Adviser</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {workspace.adviserName || 'Adviser Assignment in Progress'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center: Dynamic Progress Circle */}
              <div className="shrink-0 p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                <ResearchProgressCircle
                  progress={overallProgress}
                  completedTasks={taskProgress.completed}
                  totalTasks={taskProgress.total}
                  subtitle="Research Completion"
                />
              </div>

              {/* Right: Open Manuscript Button */}
              <div className="flex flex-col gap-2 shrink-0 w-full lg:w-48">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full justify-center shadow-md"
                  disabled={openingDoc}
                  onClick={handleOpenManuscript}
                >
                  <FileEdit className="w-4 h-4 mr-2" />
                  {openingDoc ? 'Opening...' : 'Open Manuscript'}
                </Button>

                <p className="text-[10px] text-center text-gray-400 dark:text-gray-500">
                  Launches real-time collaborative TipTap / Yjs document editor
                </p>
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
              {(workspace.sections || []).map((sec) => (
                <div
                  key={sec.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {sec.name}
                      </span>
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
                    </div>

                    <div className="w-full max-w-xs bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-500"
                        style={{
                          width: `${sec.status === 'completed' ? 100 : sec.progress || 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Section Controls for Adviser / Coordinator */}
                  {(isAdviser || isCoordinator) && (
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
              ))}
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
