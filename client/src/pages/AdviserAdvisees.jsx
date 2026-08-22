// src/pages/AdviserAdvisees.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast } from '../components/ui/Toast';
import {
  Users,
  BookOpen,
  CheckCircle2,
  Clock,
  FileEdit,
  ArrowRight,
  PlusCircle,
  FolderGit2,
  Award,
} from 'lucide-react';
import researchWorkspaceService from '../services/researchWorkspace.service';
import researchTaskService from '../services/researchTask.service';
import manuscriptDocumentAdapter from '../services/manuscriptDocumentAdapter';
import progressService from '../services/progress.service';
import { TaskManagementModal } from '../components/research/TaskManagementModal';

export const AdviserAdvisees = () => {
  const { currentUser, userProfile, role } = useAuth();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [tasksMap, setTasksMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedWorkspaceForTask, setSelectedWorkspaceForTask] = useState(null);
  const [toast, setToast] = useState('');

  const fetchAdviseeData = async () => {
    setLoading(true);
    try {
      let list = [];
      if (role === 'adviser') {
        list = await researchWorkspaceService.getWorkspacesByAdviser(currentUser.uid);
      } else {
        // Coordinators and Admins see all workspaces
        list = await researchWorkspaceService.getAllWorkspaces();
      }
      setWorkspaces(list);

      // Fetch tasks for each workspace to calculate real-time stats
      const tasksObj = {};
      await Promise.all(
        list.map(async (ws) => {
          const wsTasks = await researchTaskService.getTasksByWorkspace(ws.id);
          tasksObj[ws.id] = wsTasks;
        })
      );
      setTasksMap(tasksObj);
    } catch (err) {
      console.error('[AdviserAdvisees] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchAdviseeData();
    }
  }, [currentUser?.uid, role]);

  const handleOpenManuscript = async (ws) => {
    try {
      const { editorUrl } =
        await manuscriptDocumentAdapter.getOrCreateManuscriptDocument(
          ws,
          userProfile
        );
      navigate(editorUrl);
    } catch (err) {
      setToast('Failed to launch manuscript: ' + err.message);
    }
  };

  const handleTaskCreated = async (taskInput) => {
    try {
      await researchTaskService.createTask(taskInput);
      setToast('Task successfully assigned to student.');
      await fetchAdviseeData();
    } catch (err) {
      setToast('Failed to assign task: ' + err.message);
    }
  };

  const totalAdvisees = workspaces.length;
  const totalTasks = Object.values(tasksMap).flat().length;
  const completedTasks = Object.values(tasksMap).flat().filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast('')} />
      )}

      <PageHeader
        icon={Users}
        title="My Assigned Advisees & Research Progress"
        description="Monitor student manuscripts, track chapter completion, assign actionable research tasks, and provide advisory reviews."
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          title="Assigned Research Groups"
          value={totalAdvisees}
          description="Active student groups under advisory"
          trend="neutral"
        />
        <StatCard
          icon={CheckCircle2}
          title="Assigned Tasks Completed"
          value={`${completedTasks} / ${totalTasks}`}
          description="Actionable tasks completed by advisees"
          trend="up"
        />
        <StatCard
          icon={BookOpen}
          title="Active Manuscripts"
          value={workspaces.filter((w) => w.documentId).length}
          description="Linked collaborative manuscript workspaces"
          trend="up"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 dark:text-gray-500">
          Loading advisees and research workspaces...
        </div>
      ) : workspaces.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <Users className="w-10 h-10 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            No Assigned Advisees Yet
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Once research groups are matched with you or assigned by the coordinator, they will appear here with full workspace tracking.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workspaces.map((ws) => {
            const wsTasks = tasksMap[ws.id] || [];
            const calculatedProgress = progressService.calculateOverallProgress(ws, wsTasks);
            const { completed, total } = progressService.calculateTaskProgress(wsTasks);

            return (
              <Card key={ws.id} className="p-5 flex flex-col justify-between space-y-4 hover:border-gray-300 dark:hover:border-slate-700 transition-all">
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="emerald">
                      {ws.status?.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <span className="text-xs font-bold text-primary">
                      {calculatedProgress}% Progress
                    </span>
                  </div>

                  {/* Research Title */}
                  <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                    {ws.title}
                  </h3>

                  {/* Student & Group Meta */}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">
                        Student Researcher
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block">
                        {ws.studentName}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">
                        Group
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block">
                        {ws.groupName}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Overall Milestone Progress</span>
                      <span className="font-semibold">{calculatedProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-700"
                        style={{ width: `${calculatedProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5">
                      <span>{completed} of {total} tasks completed</span>
                      <span>{(ws.sections || []).filter((s) => s.status === 'completed').length} / 7 chapters passed</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedWorkspaceForTask(ws)}
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1" /> Assign Task
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOpenManuscript(ws)}
                    >
                      <FileEdit className="w-3.5 h-3.5 mr-1" /> Open Manuscript
                    </Button>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => navigate(`/research/workspace?id=${ws.id}`)}
                    >
                      Workspace <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task Creation Modal */}
      {selectedWorkspaceForTask && (
        <TaskManagementModal
          isOpen={Boolean(selectedWorkspaceForTask)}
          onClose={() => setSelectedWorkspaceForTask(null)}
          workspace={selectedWorkspaceForTask}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </div>
  );
};

export default AdviserAdvisees;
