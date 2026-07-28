import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  GraduationCap, 
  MessageCircle,
  FolderGit2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Reviews = () => {
  const { role, userProfile } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Post review form
  const [chapter, setChapter] = useState('Chapter 1 - Introduction');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  // Student response modal state
  const [respondingId, setRespondingId] = useState(null);
  const [studentResponseText, setStudentResponseText] = useState('');

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reviews/all');
      if (res.data && res.data.data) {
        setReviews(res.data.data);
      }
    } catch (err) {
      console.error('[Reviews] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handlePostReview = async (e) => {
    e.preventDefault();
    if (!comment) return alert('Please enter review remarks.');

    setSubmitting(true);
    try {
      await api.post('/reviews', {
        manuscriptId: 'ms-v1.1',
        chapter,
        comment
      });

      setToast('Review feedback posted successfully!');
      setTimeout(() => setToast(''), 3500);
      setComment('');
      await fetchReviews();
    } catch (err) {
      alert(`Error posting review: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStudentResponseSubmit = async (reviewId) => {
    if (!studentResponseText) return alert('Please enter response notes.');

    try {
      await api.patch(`/reviews/${reviewId}/status`, {
        status: 'addressed',
        studentResponse: studentResponseText
      });

      setToast('Revision response saved and marked as Addressed.');
      setTimeout(() => setToast(''), 3500);
      setRespondingId(null);
      setStudentResponseText('');
      await fetchReviews();
    } catch (err) {
      alert(`Error submitting response: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-indigo-400" /> Review & Threaded Feedback Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-1">Adviser & Panelist chapter annotations, revision tracking, and student response threads.</p>
        </div>
      </div>

      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left / Top: Post Review Box (Adviser & Panelist & Admin) */}
        {(role === 'adviser' || role === 'panelist' || role === 'admin') && (
          <div className="lg:col-span-5">
            <Card className="border-indigo-500/30 space-y-4 sticky top-20">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-indigo-400" /> Post Manuscript Review Feedback
              </h2>

              <form onSubmit={handlePostReview} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Target Chapter / Section
                  </label>
                  <select
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    className="w-full glass-input rounded-xl text-xs py-2 px-3 bg-slate-900"
                  >
                    <option value="Chapter 1 - Introduction">Chapter 1 - Introduction</option>
                    <option value="Chapter 2 - Literature Review">Chapter 2 - Literature Review</option>
                    <option value="Chapter 3 - Methodology">Chapter 3 - Methodology & System Design</option>
                    <option value="Chapter 4 - Results & Discussion">Chapter 4 - Results & Data Analysis</option>
                    <option value="Chapter 5 - Conclusion & Future Work">Chapter 5 - Conclusion & Recommendations</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Detailed Review Remarks & Annotations
                  </label>
                  <textarea
                    rows={4}
                    className="w-full glass-input rounded-xl text-sm p-3"
                    placeholder="Specify necessary revisions, methodology corrections, or formatting changes..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" variant="primary" isLoading={submitting} className="w-full">
                  <Send className="w-4 h-4 mr-2" /> Post Review Feedback
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* Right / Main: Threaded Feedback Feed */}
        <div className={(role === 'adviser' || role === 'panelist' || role === 'admin') ? 'lg:col-span-7 space-y-4' : 'lg:col-span-12 space-y-4'}>
          {loading ? (
            <div className="py-12 text-center text-slate-500">Loading review thread...</div>
          ) : reviews.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Review Comments Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Advisers and panelists will post chapter feedback and revision requests here.
              </p>
            </Card>
          ) : (
            reviews.map((rev) => (
              <Card key={rev.id} className="border-slate-800 space-y-4">
                
                {/* Header info */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={rev.reviewerRole === 'adviser' ? 'emerald' : 'purple'}>
                        {rev.reviewerRole ? rev.reviewerRole.toUpperCase() : 'REVIEWER'}
                      </Badge>
                      <span className="text-xs font-bold text-indigo-400">{rev.chapter}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                      <span>Posted by <strong className="text-slate-200">{rev.reviewerName}</strong> on {new Date(rev.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <Badge variant={rev.status === 'addressed' ? 'emerald' : 'amber'}>
                    {rev.status === 'addressed' ? 'ADDRESSED' : 'PENDING REVISION'}
                  </Badge>
                </div>

                {/* Reviewer Comment Body */}
                <div className="text-sm text-slate-200 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                  {rev.comment}
                </div>

                {/* Student Response Thread */}
                {rev.studentResponse ? (
                  <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-1 ml-4 border-l-4 border-l-blue-500">
                    <div className="text-xs font-bold text-blue-400 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" /> Student Revision Response:
                    </div>
                    <p className="text-xs text-slate-300 italic">{rev.studentResponse}</p>
                  </div>
                ) : role === 'student' ? (
                  respondingId === rev.id ? (
                    <div className="space-y-2 pt-2">
                      <textarea
                        rows={2}
                        className="w-full glass-input rounded-xl text-xs p-2.5"
                        placeholder="Explain how you addressed this reviewer remark in your revised manuscript..."
                        value={studentResponseText}
                        onChange={(e) => setStudentResponseText(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setRespondingId(null)}>Cancel</Button>
                        <Button size="sm" variant="success" onClick={() => handleStudentResponseSubmit(rev.id)}>Submit Response</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end pt-1">
                      <Button size="sm" variant="secondary" onClick={() => { setRespondingId(rev.id); setStudentResponseText(''); }}>
                        Respond to Feedback
                      </Button>
                    </div>
                  )
                ) : null}
              </Card>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
