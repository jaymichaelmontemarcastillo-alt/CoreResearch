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
  BookOpen,
  Users,
  CheckCircle2,
  FileEdit,
  ArrowLeft,
  Calendar,
  AlertCircle,
  PlusCircle
} from 'lucide-react';
import researchWorkspaceService from '../services/researchWorkspace.service';
import researchTaskService from '../services/researchTask.service';
import researchFeedbackService from '../services/researchFeedback.service';
import progressService from '../services/progress.service';
import manuscriptDocumentAdapter from '../services/manuscriptDocumentAdapter';
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

  const effectiveRole = role === 'faculty' ? currentFacultyMode : role;
  const isAdviser = effectiveRole === 'adviser';
  const isPanelist = effectiveRole === 'panelist';

  useEffect(() => {
    let unsubscribeWs = () => {};
    let unsubscribeTasks = () => {};
    let unsubscribeFb = () => {};

    const loadWorkspace = async () => {
      setLoading(true);
      try {
        if (!workspaceId) {
          throw new Error('Workspace ID is missing.');
        }

        const targetWorkspace = await researchWorkspaceService.getWorkspaceById(workspaceId);
        
        if (targetWorkspace) {
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
    };
  }, [currentUser, workspaceId]);

  const handleOpenManuscript = async () => {
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

      // We pass the URL but DocumentEditorPage will check auth roles to lock down editing
      navigate(editorUrl);
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

  const handleTaskCreated = async (taskInput) => {
    try {
      await researchTaskService.createTask(taskInput);
      setToast('Research task assigned successfully.');
      setIsTaskModalOpen(false);
    } catch (err) {
      setToast('Failed to assign task: ' + err.message);
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
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900">Workspace Not Found</h2>
        <Button onClick={() => navigate(-1)} className="mt-4" variant="outline">Go Back</Button>
      </div>
    );
  }

  const overallProgress = progressService.calculateWorkspaceProgress(workspace, tasks);
  const currentStage = workspace.researchPhase || 'CHAPTERS_1_3';

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} variant="error" onClose={() => setToast('')} />}

      {/* Breadcrumb Navigation */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Dashboard
      </button>

      {/* Header Info */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 flex flex-col md:flex-row gap-6 justify-between items-start">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="blue" className="uppercase">
              {workspace.status?.replace(/_/g, ' ')}
            </Badge>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(workspace.createdAt).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            {workspace.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
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
            <FileEdit className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-[10px] text-gray-400 mt-2 text-center md:text-right">
            Read-only mode. Use comments for feedback.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Progress & Milestones */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-6">
              Research Progress
            </h3>
            <div className="flex flex-col items-center justify-center">
              <ResearchProgressCircle progress={overallProgress} size={140} />
              <div className="mt-4 text-center">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {currentStage.replace(/_/g, ' ')}
                </div>
                <div className="text-xs text-gray-500 mt-1">Current Focus Area</div>
              </div>
            </div>
          </Card>

          <MilestonesTracker workspace={workspace} />
        </div>

        {/* Right Column: Tasks & Feedback */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tasks Overview */}
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
                  <PlusCircle className="w-3.5 h-3.5 mr-1" /> Assign Task
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-500">
                    {taskFilter === 'completed' ? 'No completed tasks yet.' : 'All pending tasks have been completed!'}
                  </p>
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    role={effectiveRole} // Pass effectiveRole so TaskCard displays correctly for Adviser
                    onStatusChange={(newStatus) => handleTaskStatusChange(task.id, newStatus)}
                  />
                ))
              )}
            </div>
          </Card>

          {/* Feedback Threads (Module Component) */}
          <ResearchFeedbackSection 
            workspaceId={workspace.id}
            feedbackList={feedbackList}
            currentUser={currentUser}
            userProfile={{ ...userProfile, role: effectiveRole }} // Pass down effectiveRole
          />
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
    </div>
  );
};
