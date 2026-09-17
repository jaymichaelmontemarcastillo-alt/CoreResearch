// src/components/editor/EditorTaskSidebar.jsx
import React, { useState, useEffect } from 'react';
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

export const EditorTaskSidebar = ({
  isOpen,
  onClose,
  workspace,
  tasks = [],
  currentUser,
  userProfile,
  isAdviser = false,
  isStudent = false,
  onTaskStatusChange,
  onTaskReview,
  onNavigateToAnchor,
  onCreateTask,
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
    const isDone = t.status === 'completed';
    if (filter === 'active') return !isDone;
    if (filter === 'completed') return isDone;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="w-[340px] min-w-[340px] h-full bg-white dark:bg-[#0e0f15] border-l border-gray-200 dark:border-[#1c1d28] flex flex-col overflow-hidden z-30 shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#1c1d28] flex items-center justify-between bg-gray-50 dark:bg-[#12131b] shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Manuscript Tasks
          </h3>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1c1d28]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

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
