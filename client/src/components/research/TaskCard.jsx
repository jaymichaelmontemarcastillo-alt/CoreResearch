// src/components/research/TaskCard.jsx
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Play,
  Send,
  Trash2,
  FileText,
  User,
} from 'lucide-react';

const PRIORITY_STYLES = {
  low: { label: 'Low Priority', variant: 'gray' },
  medium: { label: 'Medium', variant: 'blue' },
  high: { label: 'High Priority', variant: 'amber' },
  urgent: { label: 'Urgent', variant: 'rose' },
};

const STATUS_STYLES = {
  todo: { label: 'To Do', variant: 'gray' },
  in_progress: { label: 'In Progress', variant: 'blue' },
  submitted: { label: 'Submitted', variant: 'amber' },
  completed: { label: 'Completed', variant: 'emerald' },
  revision_required: { label: 'Revision Required', variant: 'rose' },
};

export const TaskCard = ({
  task,
  isStudent = false,
  isAdviser = false,
  onStatusChange,
  onReview,
  onDelete,
}) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionNote, setSubmissionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const priorityCfg = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;
  const statusCfg = STATUS_STYLES[task.status] || STATUS_STYLES.todo;

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate).getTime() < Date.now() &&
    task.status !== 'completed';

  const handleStudentSubmit = async () => {
    if (!onStatusChange) return;
    setIsSubmitting(true);
    try {
      await onStatusChange(task.id, 'submitted', submissionNote);
      setShowSubmitModal(false);
      setSubmissionNote('');
    } catch (e) {
      console.error('Task submit failed:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-4 space-y-3 transition-all hover:border-gray-300 dark:hover:border-slate-700">
      {/* Header Badges */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
          <Badge variant={priorityCfg.variant}>{priorityCfg.label}</Badge>
          {isOverdue && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              Overdue
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Calendar className="w-3.5 h-3.5" />
          <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}</span>
        </div>
      </div>

      {/* Task Content */}
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
            {task.description}
          </p>
        )}
      </div>

      {/* Student Submission Note (if any) */}
      {task.submissionNote && (
        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-800 text-xs">
          <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-0.5">
            Student Submission Note:
          </span>
          <p className="text-gray-600 dark:text-gray-400 italic">
            "{task.submissionNote}"
          </p>
        </div>
      )}

      {/* Action Footer */}
      <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[11px] text-gray-400 dark:text-gray-500">
          {task.adviserName && <span>Assigned by {task.adviserName}</span>}
        </div>

        <div className="flex items-center gap-2">
          {/* Student Actions */}
          {isStudent && (
            <>
              {task.status === 'todo' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStatusChange?.(task.id, 'in_progress')}
                >
                  <Play className="w-3.5 h-3.5 mr-1" /> Start Task
                </Button>
              )}

              {(task.status === 'in_progress' || task.status === 'revision_required') && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setShowSubmitModal(true)}
                >
                  <Send className="w-3.5 h-3.5 mr-1" /> Submit Work
                </Button>
              )}
            </>
          )}

          {/* Adviser Actions */}
          {isAdviser && (
            <>
              {task.status === 'submitted' && (
                <>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => onReview?.(task.id, 'completed')}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve &amp; Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReview?.(task.id, 'revision_required')}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Request Revision
                  </Button>
                </>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                onClick={() => onDelete?.(task.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Submission Modal for Student */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Submit Task: {task.title}
            </h3>
            <p className="text-xs text-gray-500">
              Provide an optional note or summary of your completed work for your adviser to review.
            </p>

            <textarea
              className="w-full text-xs p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none min-h-[100px]"
              placeholder="e.g. Updated Chapter 1 background with 5 new 2024–2026 citations as discussed."
              value={submissionNote}
              onChange={(e) => setSubmissionNote(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSubmitModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                onClick={handleStudentSubmit}
              >
                {isSubmitting ? 'Submitting...' : 'Submit to Adviser'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default TaskCard;
