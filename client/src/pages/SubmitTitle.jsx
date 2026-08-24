// src/pages/SubmitTitle.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast } from '../components/ui/Toast';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import groupService from '../services/group.service';
import adviserRequestService from '../services/adviserRequest.service';
import researchWorkspaceService from '../services/researchWorkspace.service';

export const SubmitTitle = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [existingWorkspace, setExistingWorkspace] = useState(null);

  // Before allowing submission, check if student already has a pending/accepted request or workspace
  useEffect(() => {
    const checkExistingState = async () => {
      try {
        const group = await groupService.getGroupByStudentId(currentUser.uid);
        
        // 1. Check Workspace
        const ws = await researchWorkspaceService.getWorkspaceByStudentOrGroup(currentUser.uid, group?.id);
        if (ws) {
          setExistingWorkspace(ws);
          setLoading(false);
          return;
        }

        // 2. Check existing Adviser Requests
        const requests = await adviserRequestService.getRequestsForStudentOrGroup(currentUser.uid, group?.id);
        const activeRequest = requests.find(r => r.status === 'pending' || r.status === 'accepted');
        if (activeRequest) {
          // Send to matching page to view their pending status or to workspace if accepted
          navigate('/adviser-matching');
          return;
        }

        setLoading(false);
      } catch (err) {
        setToast('Failed to verify state: ' + err.message);
        setLoading(false);
      }
    };

    if (currentUser?.uid) {
      checkExistingState();
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setToast('Research title is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Navigate to matching screen and pass the title/description in state
      navigate('/adviser-matching', {
        state: {
          title: title.trim(),
          description: description.trim()
        }
      });
    } catch (err) {
      setToast('Submission error: ' + err.message);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-gray-500">Checking research status...</div>;
  }

  const handleResetWorkspace = async () => {
    if (!existingWorkspace) return;
    const confirm = window.confirm("WARNING: This will permanently delete your current workspace so you can restart the title submission process. Proceed?");
    if (!confirm) return;

    setLoading(true);
    try {
      // 1. Delete Workspace
      await researchWorkspaceService.deleteWorkspace(existingWorkspace.id);
      
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
      setExistingWorkspace(null);
      setLoading(false);
    } catch (err) {
      setToast('Failed to reset workspace: ' + err.message);
      setLoading(false);
    }
  };

  if (existingWorkspace) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 mt-8">
        {toast && <Toast message={toast} variant="success" onClose={() => setToast('')} />}
        <Card className="p-8 text-center border-t-4 border-t-purple-500">
          <BookOpen className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Workspace Already Active</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You already have an active Research Workspace. You cannot submit a new title while a workspace is active.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button variant="primary" onClick={() => navigate('/research/workspace')}>
              Go to Workspace
            </Button>
            <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={handleResetWorkspace}>
              Abandon Workspace & Restart (Dev Only)
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {toast && <Toast message={toast} variant="error" onClose={() => setToast('')} />}

      <PageHeader
        icon={BookOpen}
        title="Start Research Workflow"
        description="Enter your accepted research title to find an adviser and activate your workspace."
      />

      <Card className="p-8">
        <div className="mb-6 flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg">
          <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Important:</strong> Please ensure your research title has already been formally approved by your panel or coordinator before proceeding. CoreResearch will use this title to recommend suitable faculty advisers.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Accepted Research Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Development of an Online Research Management System"
              className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Short Description / Research Context <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe the focus of your research to help us match you with the best adviser..."
              rows={4}
              className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white custom-scrollbar"
            />
            <p className="text-xs text-gray-500">
              This helps our matching algorithm pair you with an adviser who shares your specialization and research interests.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting || !title.trim()}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? 'Processing...' : 'Find Advisers'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
