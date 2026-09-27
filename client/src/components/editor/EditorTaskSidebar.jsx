// src/components/editor/EditorTaskSidebar.jsx
import React, { useState, useEffect } from 'react';
import { getSelectedText, addContentControlAtSelection } from '../../services/editorConnector';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  X,
  PlusCircle,
  Target,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Send,
  Play,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';

const PRIORITY_STYLES = {
  low: { label: 'Low', variant: 'gray' },
  medium: { label: 'Medium', variant: 'blue' },
  high: { label: 'High', variant: 'amber' },
  urgent: { label: 'Urgent', variant: 'rose' },
};

const STATUS_STYLES = {
  todo: { label: 'To Do', variant: 'gray' },
  in_progress: { label: 'In Progress', variant: 'blue' },
  submitted: { label: 'Submitted', variant: 'amber' },
  completed: { label: 'Completed', variant: 'emerald' },
  revision_required: { label: 'Revision Required', variant: 'rose' },
};

const getVerdictBadge = (verdict) => {
  switch (verdict) {
    case 'APPROVED':
    case 'PASSED':
      return {
        classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
        text: verdict === 'APPROVED' ? 'APPROVED' : 'PASSED'
      };
    case 'APPROVED_WITH_REVISIONS':
      return {
        classes: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
        text: 'APPROVED WITH REVISIONS'
      };
    case 'PASSED_WITH_MINOR_REVISIONS':
      return {
        classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
        text: 'PASSED WITH MINOR REVISIONS'
      };
    case 'PASSED_WITH_MAJOR_REVISIONS':
      return {
        classes: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
        text: 'PASSED WITH MAJOR REVISIONS'
      };
    case 'REDEFENSE':
      return {
        classes: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
        text: 'REDEFENSE'
      };
    case 'DISAPPROVED':
    default:
      return {
        classes: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
        text: verdict === 'DISAPPROVED' ? 'DISAPPROVED' : (verdict || 'UNKNOWN')
      };
  }
};

export const EditorTaskSidebar = ({
  isOpen,
  onClose,
  workspace,
  tasks = [],
  currentUser,
  userProfile,
  isAdviser = false,
  isStudent = false,
  isPanelist = false,
  activeChapterId,
  setActiveChapterId,
  onTaskStatusChange,
  onTaskReview,
  onNavigateToAnchor,
  onCreateTask,
  onGradeProposal,
  defenseType,
  existingEval,
  studentProposalEvals,
  studentFinalEvals,
}) => {
  const [filter, setFilter] = useState('active'); // 'active' | 'completed' | 'all'
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [error, setError] = useState('');

  // Creation state
  const [createMode, setCreateMode] = useState(null); // 'selection' | 'general' | null
  const [selectedText, setSelectedText] = useState('');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
  });

  // Student submission
  const [submittingTaskId, setSubmittingTaskId] = useState(null);
  const [submissionNote, setSubmissionNote] = useState('');
  const [showSubmitForm, setShowSubmitForm] = useState(null);

  // Adviser review
  const [reviewingTaskId, setReviewingTaskId] = useState(null);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [showRevisionForm, setShowRevisionForm] = useState(null);

  // Panelist Review
  const [panelistFeedback, setPanelistFeedback] = useState('');
  const [isSubmittingPanelist, setIsSubmittingPanelist] = useState(false);
  const [panelistTab, setPanelistTab] = useState('comments'); // 'comments' | 'rating_rubrics'

  // Student specific view
  const [studentTab, setStudentTab] = useState('tasks'); // 'tasks' | 'panel_comments'
  const [selectedPanelistId, setSelectedPanelistId] = useState(null);

  const handlePanelistSubmit = async () => {
    if (!panelistFeedback.trim()) return;
    setIsSubmittingPanelist(true);
    try {
      const selectedText = await getSelectedText();
      let controlId = null;
      if (selectedText) {
        const tag = `comment_${Date.now()}`;
        controlId = await addContentControlAtSelection(tag);
      }
      
      const currSec = (workspace?.sections || []).find(s => s.id === activeChapterId);
      const chapterName = currSec ? currSec.name : 'Selected text';

      await onCreateTask({
        title: `Revision Required - ${chapterName}`,
        description: panelistFeedback,
        priority: 'high',
        type: 'anchored',
        status: 'revision_required',
        anchor: {
          selectedText: selectedText || '',
          contentControlId: controlId,
        }
      });
      setPanelistFeedback('');
    } catch (err) {
      setError('Failed to submit revision: ' + err.message);
    } finally {
      setIsSubmittingPanelist(false);
    }
  };

  // Creation actions
  const handleStartCreateTask = () => {
    setCreateMode('general');
    setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
    setError('');
  };

  const handleCancelCreate = () => {
    setCreateMode(null);
    setSelectedText('');
    setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
    setError('');
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      setError('Title is required.');
      return;
    }
    try {
      const taskData = { ...newTask, type: 'general' };
      await onCreateTask(taskData);
      handleCancelCreate();
    } catch (err) {
      setError('Failed to create task: ' + err.message);
    }
  };

  // Student: submit task for review
  const handleStudentSubmit = async (taskId) => {
    setSubmittingTaskId(taskId);
    try {
      await onTaskStatusChange(taskId, 'submitted', submissionNote);
      setShowSubmitForm(null);
      setSubmissionNote('');
    } catch (err) {
      setError('Failed to submit task: ' + err.message);
    } finally {
      setSubmittingTaskId(null);
    }
  };

  // Adviser: approve task
  const handleApproveTask = async (taskId) => {
    setReviewingTaskId(taskId);
    try {
      await onTaskReview(taskId, 'completed');
    } catch (err) {
      setError('Failed to approve task: ' + err.message);
    } finally {
      setReviewingTaskId(null);
    }
  };

  // Adviser: request revision
  const handleRequestRevision = async (taskId) => {
    if (!revisionFeedback.trim()) {
      setError('Please provide revision feedback.');
      return;
    }
    setReviewingTaskId(taskId);
    try {
      await onTaskReview(taskId, 'revision_required', revisionFeedback.trim());
      setShowRevisionForm(null);
      setRevisionFeedback('');
    } catch (err) {
      setError('Failed to request revision: ' + err.message);
    } finally {
      setReviewingTaskId(null);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    // If the user is a panelist, they should only see their own comments
    if (isPanelist && t.createdBy !== currentUser?.uid) return false;

    // For students and advisers in the main 'tasks' tab, hide panelist comments
    if (!isPanelist && studentTab === 'tasks' && (t.createdByRole === 'panelist' || (!t.createdByRole && t.title.startsWith('Revision Required -')))) return false;

    const isDone = t.status === 'completed';
    if (filter === 'active') return !isDone;
    if (filter === 'completed') return isDone;
    return true;
  });

  if (!isOpen) return null;

  if (isPanelist) {
    return (
      <div className="w-[340px] min-w-[340px] h-full bg-white dark:bg-[#0e0f15] border-l border-gray-200 dark:border-[#1c1d28] flex flex-col overflow-hidden z-30 shadow-xl">
        <div className="px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-[#12131b] shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Panelist Review</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1c1d28]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-200 dark:border-[#1c1d28] bg-gray-50 dark:bg-[#12131b] px-2 shrink-0">
          <button 
            className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${panelistTab === 'comments' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border-b-2 border-transparent'}`}
            onClick={() => setPanelistTab('comments')}
          >
            Comments
          </button>
          <button 
            className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${panelistTab === 'rating_rubrics' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border-b-2 border-transparent'}`}
            onClick={() => setPanelistTab('rating_rubrics')}
          >
            Rating Rubrics
          </button>
        </div>

        {error && (
          <div className="mx-3 mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-[11px] text-rose-600 dark:text-rose-400 flex items-start gap-2 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-rose-600">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          {panelistTab === 'comments' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <h4 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Comments</h4>
                {filteredTasks.length === 0 ? (
                  <p className="text-[11px] text-gray-400 text-center py-4">No review comments yet.</p>
                ) : (
                  filteredTasks.map(task => (
                    <div key={task.id} className="p-3 bg-white dark:bg-[#12131b] border border-gray-200 dark:border-[#1c1d28] rounded-xl shadow-sm">
                      <div className="flex items-center gap-1.5 mb-2 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Revision Required
                      </div>
                      <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-line mb-3">
                        {task.description || task.title}
                      </p>
                      
                      {task.anchor?.selectedText && (
                        <div className="bg-gray-50 dark:bg-[#0e0f15] p-2 rounded border border-gray-100 dark:border-[#222433] text-[11px] mb-2">
                          <p className="text-gray-600 dark:text-[#9396a8] italic line-clamp-3">"{task.anchor.selectedText}"</p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-[#1c1d28]">
                        <span className="text-[10px] text-gray-500">{task.title.replace('Revision Required - ', '') || 'Selected text'}</span>
                        {(task.anchor?.contentControlId || task.anchor?.selectedText) && (
                          <button 
                            onClick={() => onNavigateToAnchor?.(task)}
                            className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Target className="w-3 h-3" /> Go to text
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 bg-gray-50 dark:bg-[#12131b] border-t border-gray-200 dark:border-[#1c1d28] shrink-0">
                <div className="mb-3">
                  <h4 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Select Chapter</h4>
                  <select
                    value={activeChapterId}
                    onChange={(e) => setActiveChapterId && setActiveChapterId(e.target.value)}
                    className="w-full bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#1c1d28] rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 outline-none appearance-none shadow-sm"
                  >
                    {(workspace?.sections || []).map((sec, idx) => (
                      <option key={sec.id} value={sec.id}>
                        Chapter {idx + 1}: {sec.name}
                      </option>
                    ))}
                  </select>
                </div>
                <h4 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Flag for Revision</h4>
                <textarea
                  className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-[#222433] bg-white dark:bg-[#0e0f15] text-gray-900 dark:text-white focus:ring-1 focus:ring-rose-500 focus:outline-none min-h-[80px] mb-2 resize-none placeholder:text-gray-400 shadow-sm"
                  placeholder="Describe what needs to be revised or corrected..."
                  value={panelistFeedback}
                  onChange={(e) => setPanelistFeedback(e.target.value)}
                />
                <Button
                  variant="outline"
                  className="w-full text-[11px] py-2 font-bold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-500/10 shadow-sm"
                  onClick={handlePanelistSubmit}
                  disabled={isSubmittingPanelist}
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                  {isSubmittingPanelist ? 'Submitting...' : 'Flag for Revision'}
                </Button>
              </div>
            </div>
          ) : panelistTab === 'rating_rubrics' ? (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
              {existingEval ? (
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Rating Summary</h4>
                  <div className="p-3 bg-white dark:bg-[#12131b] border border-gray-200 dark:border-[#1c1d28] rounded-xl shadow-sm space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 font-semibold">MANUSCRIPT (30%)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{existingEval.subTotals?.manuscript?.toFixed(1) || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 font-semibold">ORAL DEFENSE (30%)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{existingEval.subTotals?.oral?.toFixed(1) || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 font-semibold">CAPSTONE/THESIS PROJECT (40%)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{existingEval.subTotals?.project?.toFixed(1) || 0}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-[#222433] flex justify-between">
                      <span className="text-gray-800 dark:text-gray-200 font-bold">OVER ALL TOTAL</span>
                      <span className="font-black text-blue-600 dark:text-blue-400">{existingEval.subTotals?.overall?.toFixed(1) || 0}</span>
                    </div>
                    <div className="pt-2 flex justify-between items-center">
                      <span className="text-gray-800 dark:text-gray-200 font-bold">VERDICT</span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${getVerdictBadge(existingEval.verdict).classes}`}>
                        {getVerdictBadge(existingEval.verdict).text}
                      </span>
                    </div>
                  </div>
                  {(defenseType === 'proposal_defense' || defenseType === 'final_defense') && onGradeProposal && (
                    <button
                      onClick={onGradeProposal}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[12px] font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
                    >
                      View or Edit Rubrics
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col h-full items-center justify-center text-center">
                  <div className="mb-4 text-gray-400">
                     <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
                     <p className="text-xs">No rating submitted yet.</p>
                  </div>
                  {(defenseType === 'proposal_defense' || defenseType === 'final_defense') && onGradeProposal && (
                    <button
                      onClick={onGradeProposal}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[12px] font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7l2 2 4-4" />
                      </svg>
                      Grade {defenseType === 'proposal_defense' ? 'Proposal' : 'Final'} Defense
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[340px] min-w-[340px] h-full bg-white dark:bg-[#0e0f15] border-l border-gray-200 dark:border-[#1c1d28] flex flex-col overflow-hidden z-30 shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#1c1d28] flex items-center justify-between bg-gray-50 dark:bg-[#12131b] shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            {!isPanelist && studentTab === 'panel_comments' ? 'Panelist Reviews' : 'Manuscript Tasks'}
          </h3>
          {(isPanelist || studentTab === 'tasks') && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
              {filteredTasks.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1c1d28]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs for Student and Adviser */}
      {!isPanelist && (
        <div className="flex border-b border-gray-200 dark:border-[#1c1d28] bg-gray-50 dark:bg-[#12131b] px-2 shrink-0">
          <button 
            className={`flex-1 py-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-colors ${studentTab === 'tasks' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border-b-2 border-transparent'}`}
            onClick={() => setStudentTab('tasks')}
          >
            Tasks
          </button>
          <button 
            className={`flex-1 py-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-colors ${studentTab === 'panel_comments' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border-b-2 border-transparent'}`}
            onClick={() => { setStudentTab('panel_comments'); setSelectedPanelistId(null); }}
          >
            Comments
          </button>
          <button 
            className={`flex-1 py-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-colors ${studentTab === 'rating_rubrics' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border-b-2 border-transparent'}`}
            onClick={() => setStudentTab('rating_rubrics')}
          >
            Rubrics
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mx-3 mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-[11px] text-rose-600 dark:text-rose-400 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-rose-600">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* List View or Create View */}
      {createMode ? (
        <div className="flex-1 overflow-y-auto flex flex-col p-4">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-500" />
              Assign Task
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-[#6b6f84] mt-1">
              Create a task to instruct the student on revisions or next steps.
            </p>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4 flex-1">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Title
              </label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full bg-white dark:bg-[#12131b] border border-gray-200 dark:border-[#1c1d28] rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 outline-none transition-colors"
                placeholder="e.g., Rewrite introduction"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex justify-between">
                <span>Description / Instructions</span>
              </label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full h-32 bg-white dark:bg-[#12131b] border border-gray-200 dark:border-[#1c1d28] rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 outline-none transition-colors resize-none"
                placeholder="Provide detailed instructions..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Priority
                </label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="w-full bg-white dark:bg-[#12131b] border border-gray-200 dark:border-[#1c1d28] rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 outline-none appearance-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full bg-white dark:bg-[#12131b] border border-gray-200 dark:border-[#1c1d28] rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-2">
              <Button type="button" variant="ghost" onClick={handleCancelCreate} className="flex-1 text-xs">
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                Create Task
              </Button>
            </div>
          </form>
        </div>
      ) : !isPanelist && studentTab === 'panel_comments' ? (
        <div className="flex-1 overflow-y-auto flex flex-col p-4 bg-gray-50/50 dark:bg-[#0e0f15]">
          {(() => {
            const panelistComments = tasks.filter(t => t.createdByRole === 'panelist' || (!t.createdByRole && t.title.startsWith('Revision Required -')));
            const panelistsMap = {};
            panelistComments.forEach(t => {
              const id = t.createdBy || t.createdByName || 'unknown';
              if (!panelistsMap[id]) {
                panelistsMap[id] = { 
                  id, 
                  name: t.createdByName || 'Unknown Panelist', 
                  role: (t.createdByRole === 'panelist' || !t.createdByRole) ? 'Panelist' : t.createdByRole,
                  tasks: [] 
                };
              } else if (!panelistsMap[id].name || panelistsMap[id].name === 'Unknown Panelist') {
                if (t.createdByName) panelistsMap[id].name = t.createdByName;
                if (t.createdByRole) panelistsMap[id].role = t.createdByRole;
              }
              panelistsMap[id].tasks.push(t);
            });
            const panelistsList = Object.values(panelistsMap);

            if (panelistsList.length === 0) {
              return <p className="text-[11px] text-gray-400 text-center py-4">No panelist comments yet.</p>;
            }

            if (!selectedPanelistId) {
              return (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Select Panelist</h4>
                  {panelistsList.map(panelist => (
                    <button
                      key={panelist.id}
                      onClick={() => setSelectedPanelistId(panelist.id)}
                      className="w-full text-left p-3 bg-white dark:bg-[#12131b] border border-gray-200 dark:border-[#1c1d28] rounded-xl shadow-sm hover:border-blue-400 dark:hover:border-blue-500/50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-xs text-gray-900 dark:text-white capitalize">{panelist.name}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5 capitalize">{panelist.role} • {panelist.tasks.length} comments</div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" />
                    </button>
                  ))}
                </div>
              );
            }

            const selectedPanelist = panelistsList.find(p => p.id === selectedPanelistId);
            return (
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => setSelectedPanelistId(null)}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center mb-2"
                >
                  <ChevronDown className="w-3 h-3 rotate-90 mr-1" /> Back to Panelists
                </button>
                <h4 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Comments by {selectedPanelist?.name}
                </h4>
                {selectedPanelist?.tasks.map(task => (
                  <div key={task.id} className="p-3 bg-white dark:bg-[#12131b] border border-gray-200 dark:border-[#1c1d28] rounded-xl shadow-sm">
                    <div className="flex items-center gap-1.5 mb-2 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Revision Required
                    </div>
                    <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-line mb-3">
                      {task.description || task.title}
                    </p>
                    
                    {task.anchor?.selectedText && (
                      <div className="bg-gray-50 dark:bg-[#0e0f15] p-2 rounded border border-gray-100 dark:border-[#222433] text-[11px] mb-2">
                        <p className="text-gray-600 dark:text-[#9396a8] italic line-clamp-3">"{task.anchor.selectedText}"</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-[#1c1d28]">
                      <span className="text-[10px] text-gray-500">{task.title.replace('Revision Required - ', '') || 'Selected text'}</span>
                      {(task.anchor?.contentControlId || task.anchor?.selectedText) && (
                        <button 
                          onClick={() => onNavigateToAnchor?.(task)}
                          className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Target className="w-3 h-3" /> Go to text
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      ) : studentTab === 'rating_rubrics' ? (
        <div className="flex-1 overflow-y-auto flex flex-col p-4 bg-gray-50/50 dark:bg-[#0e0f15]">
              {isStudent ? (
                <div className="space-y-4">
                  {studentProposalEvals?.map((ev, idx) => (
                    <div key={'p_'+idx} className="space-y-2 mb-4">
                      <h4 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Proposal - {ev.panelistName}</h4>
                      <div className="p-3 bg-white dark:bg-[#12131b] border border-gray-200 dark:border-[#1c1d28] rounded-xl shadow-sm space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 font-semibold">MANUSCRIPT (30%)</span>
                          <span className="font-bold text-gray-900 dark:text-white">{ev.subTotals?.manuscript?.toFixed(1) || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 font-semibold">ORAL DEFENSE (30%)</span>
                          <span className="font-bold text-gray-900 dark:text-white">{ev.subTotals?.oral?.toFixed(1) || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 font-semibold">CAPSTONE/THESIS PROJECT (40%)</span>
                          <span className="font-bold text-gray-900 dark:text-white">{ev.subTotals?.project?.toFixed(1) || 0}</span>
                        </div>
                        <div className="pt-2 border-t border-gray-100 dark:border-[#222433] flex justify-between">
                          <span className="text-gray-800 dark:text-gray-200 font-bold">OVER ALL TOTAL</span>
                          <span className="font-black text-blue-600 dark:text-blue-400">{ev.subTotals?.overall?.toFixed(1) || 0}</span>
                        </div>
                        <div className="pt-2 flex justify-between items-center">
                          <span className="text-gray-800 dark:text-gray-200 font-bold">VERDICT</span>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${getVerdictBadge(ev.verdict).classes}`}>
                            {getVerdictBadge(ev.verdict).text}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {studentFinalEvals?.map((ev, idx) => (
                    <div key={'f_'+idx} className="space-y-2 mb-4">
                      <h4 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Final - {ev.panelistName}</h4>
                      <div className="p-3 bg-white dark:bg-[#12131b] border border-gray-200 dark:border-[#1c1d28] rounded-xl shadow-sm space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 font-semibold">MANUSCRIPT (30%)</span>
                          <span className="font-bold text-gray-900 dark:text-white">{ev.subTotals?.manuscript?.toFixed(1) || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 font-semibold">ORAL DEFENSE (30%)</span>
                          <span className="font-bold text-gray-900 dark:text-white">{ev.subTotals?.oral?.toFixed(1) || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 font-semibold">CAPSTONE/THESIS PROJECT (40%)</span>
                          <span className="font-bold text-gray-900 dark:text-white">{ev.subTotals?.project?.toFixed(1) || 0}</span>
                        </div>
                        <div className="pt-2 border-t border-gray-100 dark:border-[#222433] flex justify-between">
                          <span className="text-gray-800 dark:text-gray-200 font-bold">OVER ALL TOTAL</span>
                          <span className="font-black text-blue-600 dark:text-blue-400">{ev.subTotals?.overall?.toFixed(1) || 0}</span>
                        </div>
                        <div className="pt-2 flex justify-between items-center">
                          <span className="text-gray-800 dark:text-gray-200 font-bold">VERDICT</span>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${getVerdictBadge(ev.verdict).classes}`}>
                            {getVerdictBadge(ev.verdict).text}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!studentProposalEvals?.length && !studentFinalEvals?.length) && (
                    <div className="flex flex-col h-full items-center justify-center text-center">
                      <div className="mb-4 text-gray-400">
                         <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
                         <p className="text-xs">No rating available yet.</p>
                      </div>
                    </div>
                  )}
                  <div className="text-center mt-2">
                    <p className="text-[10px] text-gray-400">Return to workspace to view full rubrics or download PDF.</p>
                  </div>
                </div>
              ) : existingEval ? (
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Rating Summary</h4>
                  <div className="p-3 bg-white dark:bg-[#12131b] border border-gray-200 dark:border-[#1c1d28] rounded-xl shadow-sm space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 font-semibold">MANUSCRIPT (30%)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{existingEval.subTotals?.manuscript?.toFixed(1) || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 font-semibold">ORAL DEFENSE (30%)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{existingEval.subTotals?.oral?.toFixed(1) || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 font-semibold">CAPSTONE/THESIS PROJECT (40%)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{existingEval.subTotals?.project?.toFixed(1) || 0}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-[#222433] flex justify-between">
                      <span className="text-gray-800 dark:text-gray-200 font-bold">OVER ALL TOTAL</span>
                      <span className="font-black text-blue-600 dark:text-blue-400">{existingEval.subTotals?.overall?.toFixed(1) || 0}</span>
                    </div>
                    <div className="pt-2 flex justify-between items-center">
                      <span className="text-gray-800 dark:text-gray-200 font-bold">VERDICT</span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${getVerdictBadge(existingEval.verdict).classes}`}>
                        {getVerdictBadge(existingEval.verdict).text}
                      </span>
                    </div>
                  </div>
                  {onGradeProposal && (
                    <button
                      onClick={onGradeProposal}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[12px] font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
                    >
                      View Rubrics Details
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col h-full items-center justify-center text-center">
                  <div className="mb-4 text-gray-400">
                     <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
                     <p className="text-xs">No rating available yet.</p>
                  </div>
                </div>
              )}
        </div>
      ) : (
        <>
          {/* Action Buttons for Advisers */}
          {isAdviser && (
            <div className="p-3 border-b border-gray-100 dark:border-[#1c1d28] shrink-0 bg-gray-50/50 dark:bg-[#12131b]/50 flex">
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartCreateTask}
                className="flex-1 text-[11px] py-1.5 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Assign New Task
              </Button>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-[#1c1d28] flex items-center gap-1 shrink-0">
            {['active', 'completed', 'all'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all capitalize ${
                  filter === f
                    ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                    : 'text-gray-500 dark:text-[#6b6f84] hover:text-gray-700 dark:hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400 dark:text-[#6b6f84]">
                <CheckCircle2 className="w-8 h-8 text-emerald-400/50 mx-auto mb-2" />
                <p>
                  {filter === 'completed'
                    ? 'No completed tasks yet.'
                    : 'No active tasks. All clear!'}
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const statusCfg = STATUS_STYLES[task.status] || STATUS_STYLES.todo;
                const priorityCfg = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;
                const isExpanded = expandedTaskId === task.id;
                const isAnchored = task.type === 'anchored' && task.anchor?.selectedText;

                return (
                  <div
                    key={task.id}
                    className={`rounded-xl border transition-all ${
                      isExpanded
                        ? 'bg-white dark:bg-[#15161e] border-blue-200 dark:border-blue-500/30 shadow-sm'
                        : 'bg-white dark:bg-[#12131b] border-gray-100 dark:border-[#1c1d28] hover:border-gray-200 dark:hover:border-[#2a2c3d]'
                    }`}
                  >
                    {/* Task Header — always visible */}
                    <button
                      className="w-full px-3 py-2.5 text-left flex items-start gap-2"
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                          <Badge variant={priorityCfg.variant}>{priorityCfg.label}</Badge>
                          {isAnchored && (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                              📌 Anchored
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {task.description || task.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400 dark:text-[#6b6f84]">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {task.dueDate
                              ? new Date(task.dueDate).toLocaleDateString()
                              : 'No deadline'}
                          </span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-1" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-1" />
                      )}
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2 border-t border-gray-100 dark:border-[#1c1d28] pt-2">
                        {/* Anchored Text Preview */}
                        {isAnchored && (
                          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-[11px]">
                            <span className="font-semibold text-indigo-700 dark:text-indigo-300 block mb-0.5">
                              📌 Linked Manuscript Text:
                            </span>
                            <p className="text-indigo-600 dark:text-indigo-200 italic line-clamp-3">
                              "{task.anchor.selectedText}"
                            </p>
                            <button
                              onClick={() => onNavigateToAnchor?.(task)}
                              className="mt-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <Target className="w-3 h-3" />
                              Jump to Location
                            </button>
                          </div>
                        )}

                        {/* Task Instruction */}
                        <div className="text-[11px] text-gray-600 dark:text-[#9396a8] whitespace-pre-line leading-relaxed">
                          {task.description}
                        </div>

                        {/* Adviser Feedback (if revision was requested) */}
                        {task.adviserFeedback && (
                          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-[11px]">
                            <span className="font-semibold text-amber-700 dark:text-amber-300 block mb-0.5">
                              Adviser Feedback:
                            </span>
                            <p className="text-amber-600 dark:text-amber-200 italic">
                              "{task.adviserFeedback}"
                            </p>
                          </div>
                        )}

                        {/* Submission Note (if student submitted) */}
                        {task.submissionNote && (
                          <div className="p-2 rounded-lg bg-gray-50 dark:bg-[#1c1d28] border border-gray-100 dark:border-[#222433] text-[11px]">
                            <span className="font-semibold text-gray-700 dark:text-[#9396a8] block mb-0.5">
                              Student Note:
                            </span>
                            <p className="text-gray-600 dark:text-[#f3f4f8] italic">
                              "{task.submissionNote}"
                            </p>
                          </div>
                        )}

                        {/* Revision History */}
                        {task.revisionHistory && task.revisionHistory.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-500 dark:text-[#6b6f84] uppercase tracking-wider">
                              History
                            </span>
                            {task.revisionHistory.map((entry, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 text-[10px] text-gray-500 dark:text-[#6b6f84]">
                                <span className={`shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${
                                  entry.action === 'approved' ? 'bg-emerald-400'
                                  : entry.action === 'submitted' ? 'bg-blue-400'
                                  : 'bg-amber-400'
                                }`} />
                                <span>
                                  <strong className="text-gray-700 dark:text-[#9396a8]">{entry.byName || 'User'}</strong>
                                  {' '}
                                  {entry.action === 'approved' ? 'approved'
                                    : entry.action === 'submitted' ? 'submitted'
                                    : 'requested revision'}
                                  {entry.comment && <span className="italic"> — "{entry.comment.slice(0, 50)}{entry.comment.length > 50 ? '…' : ''}"</span>}
                                  <span className="ml-1 text-[9px] text-gray-400">
                                    {new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-2 flex flex-wrap gap-2">
                          {/* Student Actions */}
                          {isStudent && (
                            <>
                              {task.status === 'todo' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-[11px] py-1 px-2.5"
                                  onClick={() => onTaskStatusChange?.(task.id, 'in_progress')}
                                >
                                  <Play className="w-3 h-3 mr-1" /> Start
                                </Button>
                              )}

                              {(task.status === 'in_progress' || task.status === 'revision_required') && (
                                <>
                                  {showSubmitForm === task.id ? (
                                    <div className="w-full space-y-2">
                                      <textarea
                                        className="w-full text-[11px] p-2 rounded-lg border border-gray-200 dark:border-[#222433] bg-gray-50 dark:bg-[#0e0f15] text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none min-h-[60px] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84]"
                                        placeholder="Add a note about your changes (optional)"
                                        value={submissionNote}
                                        onChange={(e) => setSubmissionNote(e.target.value)}
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="primary"
                                          className="text-[11px] py-1 px-2.5"
                                          disabled={submittingTaskId === task.id}
                                          onClick={() => handleStudentSubmit(task.id)}
                                        >
                                          <Send className="w-3 h-3 mr-1" />
                                          {submittingTaskId === task.id ? 'Submitting...' : 'Submit for Review'}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-[11px] py-1 px-2"
                                          onClick={() => { setShowSubmitForm(null); setSubmissionNote(''); }}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      className="text-[11px] py-1 px-2.5"
                                      onClick={() => setShowSubmitForm(task.id)}
                                    >
                                      <Send className="w-3 h-3 mr-1" /> Submit for Review
                                    </Button>
                                  )}
                                </>
                              )}
                            </>
                          )}

                          {/* Adviser Actions */}
                          {isAdviser && task.status === 'submitted' && (
                            <>
                              <Button
                                size="sm"
                                variant="success"
                                className="text-[11px] py-1 px-2.5"
                                disabled={reviewingTaskId === task.id}
                                onClick={() => handleApproveTask(task.id)}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Approve & Complete
                              </Button>

                              {showRevisionForm === task.id ? (
                                <div className="w-full space-y-2 mt-1">
                                  <textarea
                                    className="w-full text-[11px] p-2 rounded-lg border border-gray-200 dark:border-[#222433] bg-gray-50 dark:bg-[#0e0f15] text-gray-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:outline-none min-h-[60px] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84]"
                                    placeholder="Explain what needs to be revised..."
                                    value={revisionFeedback}
                                    onChange={(e) => setRevisionFeedback(e.target.value)}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-[11px] py-1 px-2.5 text-amber-600 border-amber-300 dark:border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                                      disabled={reviewingTaskId === task.id}
                                      onClick={() => handleRequestRevision(task.id)}
                                    >
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      {reviewingTaskId === task.id ? 'Sending...' : 'Send Revision Request'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-[11px] py-1 px-2"
                                      onClick={() => { setShowRevisionForm(null); setRevisionFeedback(''); }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-[11px] py-1 px-2.5 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
                                  onClick={() => setShowRevisionForm(task.id)}
                                >
                                  <AlertTriangle className="w-3 h-3 mr-1" /> Request Revision
                                </Button>
                              )}
                            </>
                          )}

                          {/* Navigate to Anchor — Available to both roles */}
                          {isAnchored && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-[11px] py-1 px-2 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                              onClick={() => onNavigateToAnchor?.(task)}
                            >
                              <Target className="w-3 h-3 mr-1" /> Go to Location
                            </Button>
                          )}
                        </div>

                        {/* Meta Info */}
                        <div className="text-[10px] text-gray-400 dark:text-[#6b6f84] pt-1 border-t border-gray-100 dark:border-[#1c1d28]">
                          <span>Assigned by {task.adviserName || 'Adviser'}</span>
                          <span className="mx-1.5">·</span>
                          <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

    </div>
  );
};

export default EditorTaskSidebar;
