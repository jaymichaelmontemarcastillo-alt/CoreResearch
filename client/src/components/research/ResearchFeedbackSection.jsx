// src/components/research/ResearchFeedbackSection.jsx
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  User,
  Shield,
  Clock,
} from 'lucide-react';

export const ResearchFeedbackSection = ({
  feedbackList = [],
  workspace,
  currentUser,
  userProfile,
  isStudent = false,
  isAdviser = false,
  onAddFeedback,
  onUpdateStatus,
}) => {
  const [comment, setComment] = useState('');
  const [sectionId, setSectionId] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateFeedback = async (e) => {
    e.preventDefault();
    if (!comment.trim() || !onAddFeedback) return;

    setIsSubmitting(true);
    try {
      const input = {
        workspaceId: workspace.id,
        studentId: workspace.studentId,
        authorId: currentUser.uid,
        authorName: userProfile?.fullName || currentUser.email.split('@')[0],
        authorRole: (userProfile?.role || 'adviser'),
        sectionId: sectionId === 'general' ? undefined : sectionId,
        comment: comment.trim(),
      };
      await onAddFeedback(input);
      setComment('');
    } catch (err) {
      console.error('Feedback creation failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Research Advisory Feedback
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {feedbackList.length} feedback item{feedbackList.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Advisory Composer (Advisers / Coordinators / Panelists) */}
      {(isAdviser || userProfile?.role === 'research_coordinator' || userProfile?.role === 'admin') && (
        <Card className="p-4 bg-gray-50/70 dark:bg-[#15161e] border-dashed border-gray-200 dark:border-[#222433] space-y-3">
          <form onSubmit={handleCreateFeedback} className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-700 dark:text-[#9396a8] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-500" /> Provide Research Guidance / Feedback
              </span>

              <select
                className="text-xs p-1.5 rounded-lg border border-gray-200 dark:border-[#222433] bg-white dark:bg-[#0e0f15] text-gray-700 dark:text-[#f3f4f8]"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
              >
                <option value="general">General Manuscript Guidance</option>
                {(workspace?.sections || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              className="w-full text-xs p-3 rounded-xl border border-gray-200 dark:border-[#222433] bg-white dark:bg-[#0e0f15] text-gray-900 dark:text-[#f3f4f8] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none min-h-[80px] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84]"
              placeholder="Write concrete observations, requested revisions, or methodological suggestions for the research group..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />

            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={isSubmitting || !comment.trim()}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {isSubmitting ? 'Posting...' : 'Post Advisory Feedback'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Feedback Feed */}
      {feedbackList.length === 0 ? (
        <div className="p-6 text-center border-2 border-dashed border-gray-200 dark:border-[#222433] rounded-xl text-xs text-gray-400 dark:text-[#6b6f84]">
          No advisory feedback recorded yet. Feedback from your adviser and panel will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {feedbackList.map((fb) => {
            const isResolved = fb.status === 'resolved';
            const isAddressed = fb.status === 'addressed';

            return (
              <Card
                key={fb.id}
                className={`p-4 space-y-3 transition-all border ${
                  isResolved
                    ? 'opacity-60 bg-gray-50/50 dark:bg-[#15161e]/50 border-gray-200 dark:border-[#222433]'
                    : 'bg-white dark:bg-[#15161e] border-l-4 border-l-blue-600 border-gray-200/90 dark:border-[#222433]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">
                      {fb.authorName?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {fb.authorName}
                        </span>
                        <Badge variant="blue" className="text-[10px] py-0">
                          {fb.authorRole?.toUpperCase() || 'ADVISER'}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-[#6b6f84]">
                        {new Date(fb.createdAt).toLocaleDateString()} at{' '}
                        {new Date(fb.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant={
                      isResolved
                        ? 'emerald'
                        : isAddressed
                        ? 'blue'
                        : 'amber'
                    }
                  >
                    {isResolved
                      ? 'Resolved'
                      : isAddressed
                      ? 'Addressed by Student'
                      : 'Open Feedback'}
                  </Badge>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1c1d28] border border-gray-100 dark:border-[#222433] text-xs text-gray-800 dark:text-[#f3f4f8] leading-relaxed whitespace-pre-line">
                  {fb.comment}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-[#222433] text-xs">
                  {fb.sectionId && (
                    <span className="text-[11px] text-gray-400 dark:text-[#6b6f84]">
                      Attached to: <strong className="capitalize text-gray-700 dark:text-gray-300">{fb.sectionId.replace('_', ' ')}</strong>
                    </span>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    {/* Student Action: Mark as Addressed */}
                    {isStudent && fb.status === 'open' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateStatus?.(fb.id, 'addressed')}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark as Addressed
                      </Button>
                    )}

                    {/* Adviser Action: Resolve / Reopen */}
                    {isAdviser && (
                      <>
                        {fb.status !== 'resolved' ? (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => onUpdateStatus?.(fb.id, 'resolved')}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Resolve
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onUpdateStatus?.(fb.id, 'open')}
                          >
                            Reopen
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ResearchFeedbackSection;
