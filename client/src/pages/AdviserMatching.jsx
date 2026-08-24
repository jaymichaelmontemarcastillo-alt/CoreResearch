// src/pages/AdviserMatching.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast } from '../components/ui/Toast';
import { Users, CheckCircle2, ChevronRight, AlertCircle, Clock, XCircle, Sparkles, Tag } from 'lucide-react';
import groupService from '../services/group.service';
import adviserRequestService from '../services/adviserRequest.service';
import adviserMatchingService from '../services/adviserMatching.service';
import { courseService } from '../services/course.service';
import { sectionService } from '../services/section.service';

// Progressive loading messages
const LOADING_MESSAGES = [
  'Analyzing your research title...',
  'Finding compatible advisers...',
  'Comparing research expertise...',
  'Calculating compatibility scores...',
  'Preparing recommendations...',
];

export const AdviserMatching = () => {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [matches, setMatches] = useState([]);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [submittingId, setSubmittingId] = useState(null);
  const [toast, setToast] = useState('');
  const [serviceError, setServiceError] = useState(null);
  const loadingIntervalRef = useRef(null);

  // Progressive loading message rotation
  useEffect(() => {
    if (loading && !pendingRequest) {
      let messageIndex = 0;
      loadingIntervalRef.current = setInterval(() => {
        messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
        setLoadingMessage(LOADING_MESSAGES[messageIndex]);
      }, 2000);
    }
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    };
  }, [loading, pendingRequest]);

  useEffect(() => {
    const initMatching = async () => {
      try {
        const group = await groupService.getGroupByStudentId(currentUser.uid);
        
        // 1. Check for existing request
        const requests = await adviserRequestService.getRequestsForStudentOrGroup(currentUser.uid, group?.id);
        const activeRequest = requests.find(r => r.status === 'pending');
        
        if (activeRequest) {
          setPendingRequest(activeRequest);
          setLoading(false);
          return;
        }

        const acceptedRequest = requests.find(r => r.status === 'accepted');
        if (acceptedRequest) {
          // Adviser accepted! Head to workspace
          navigate('/research/workspace');
          return;
        }

        // 2. We don't have a pending request. Start matching based on state.
        if (!location.state?.title) {
          // If they got here without a title, send them back
          navigate('/submit-title');
          return;
        }

        setTitle(location.state.title);
        setDescription(location.state.description || '');

        // 3. Call the backend matching API (which calls NLP service)
        const recommendations = await adviserMatchingService.getRecommendations(
          location.state.title,
          location.state.description || ''
        );
        setMatches(recommendations);
        setServiceError(null);
        setLoading(false);

      } catch (err) {
        console.error(err);
        
        // Differentiate between NLP service errors and other errors
        if (err.message?.includes('unavailable') || err.message?.includes('temporarily')) {
          setServiceError(err.message);
        } else if (err.message?.includes('Network Error') || err.message?.includes('connection')) {
          setServiceError('Adviser matching service is temporarily unavailable. Please try again later.');
        } else {
          setToast('Failed to initialize matching: ' + err.message);
        }
        setLoading(false);
      }
    };

    if (currentUser) {
      initMatching();
    }
  }, [currentUser, location.state, navigate]);

  const handleSelectAdviser = async (adviser) => {
    const confirm = window.confirm(`Are you sure you want to select ${adviser.adviserName} as your preferred adviser?`);
    if (!confirm) return;

    setSubmittingId(adviser.adviserId);
    try {
      // 1. Get full group & academic info for the request
      const group = await groupService.getGroupByStudentId(currentUser.uid);
      const allCourses = await courseService.getAllCourses();

      const courseId = group?.courseId || userProfile?.courseId;
      const sectionId = group?.sectionId || userProfile?.sectionId;
      const course = allCourses.find(c => c.id === courseId);
      
      let section = null;
      if (courseId && sectionId) {
        const sections = await sectionService.getSectionsByCourseId(courseId);
        section = sections.find(s => s.id === sectionId);
      }

      // 2. Create the request
      const request = await adviserRequestService.createRequest({
        studentId: currentUser.uid,
        studentName: userProfile?.fullName || currentUser.email,
        groupId: group?.id,
        groupName: group?.name,
        courseId: course?.id,
        courseName: course?.code || course?.name,
        sectionId: section?.id,
        sectionName: section?.name,
        researchTitle: title,
        researchDescription: description,
        adviserId: adviser.adviserId,
        adviserName: adviser.adviserName,
        compatibilityScore: adviser.compatibilityScore
      });

      setPendingRequest(request);
      setToast('Adviser request successfully submitted.');
    } catch (err) {
      setToast('Failed to select adviser: ' + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCancelRequest = async () => {
    if (!pendingRequest) return;
    const confirm = window.confirm("Are you sure you want to cancel this request and restart your title submission?");
    if (!confirm) return;

    setLoading(true);
    try {
      await adviserRequestService.deleteRequest(pendingRequest.id);
      setToast('Request cancelled. You can now submit a new title.');
      navigate('/submit-title');
    } catch (err) {
      setToast('Failed to cancel request: ' + err.message);
      setLoading(false);
    }
  };

  const handleRetryMatching = () => {
    setServiceError(null);
    setLoading(true);
    setLoadingMessage(LOADING_MESSAGES[0]);
    // Re-trigger matching by updating a dummy state
    const retryMatching = async () => {
      try {
        const recommendations = await adviserMatchingService.getRecommendations(
          title || location.state?.title || '',
          description || location.state?.description || ''
        );
        setMatches(recommendations);
        setServiceError(null);
      } catch (err) {
        if (err.message?.includes('unavailable') || err.message?.includes('temporarily') || err.message?.includes('Network')) {
          setServiceError(err.message);
        } else {
          setToast('Matching failed: ' + err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    retryMatching();
  };

  // ── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 animate-spin" />
          <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center">
          <p className="text-gray-700 dark:text-gray-200 font-medium text-lg animate-pulse">
            {loadingMessage}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            This may take a few seconds
          </p>
        </div>
      </div>
    );
  }

  // ── Service Error State ───────────────────────────────────────────────────
  if (serviceError) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 mt-8">
        <Card className="p-8 text-center border-t-4 border-t-red-500">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Matching Service Unavailable
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {serviceError}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button variant="primary" onClick={handleRetryMatching}>
              Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate('/submit-title')}>
              Back to Title Submission
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Pending Request State ─────────────────────────────────────────────────
  if (pendingRequest) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 mt-8">
        <Card className="p-8 text-center border-t-4 border-t-amber-500">
          <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Waiting for Adviser Acceptance</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Your request has been sent to <strong>{pendingRequest.adviserName}</strong>. 
            Once they accept your request, your Research Workspace will be activated immediately.
          </p>
          <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg text-left text-sm space-y-3">
            <div>
              <span className="text-gray-400 block uppercase text-[10px] font-bold">Research Title</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{pendingRequest.researchTitle}</span>
            </div>
            <div>
              <span className="text-gray-400 block uppercase text-[10px] font-bold">Requested Adviser</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{pendingRequest.adviserName} ({pendingRequest.compatibilityScore}% Match)</span>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="md"
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full sm:w-auto"
              onClick={handleCancelRequest}
            >
              Cancel Request & Restart
            </Button>
            <p className="text-[10px] text-gray-400 mt-2">
              Cancelling will allow you to submit a new research title or choose a different adviser.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // ── Main Results View ─────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {toast && <Toast message={toast} variant={toast.includes('success') ? 'success' : 'error'} onClose={() => setToast('')} />}

      <PageHeader
        icon={Users}
        title="Top Recommended Advisers"
        description="Based on your research title and description, here are the most compatible faculty members."
      />

      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl flex items-start gap-4 mb-6">
        <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">Matching Results</h4>
          <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
            We analyzed <strong>"{title}"</strong> and found these top {matches.length} matches. Select ONE adviser. They will receive your request and can accept or decline based on their current workload.
          </p>
        </div>
      </div>

      {matches.length === 0 && (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Suitable Matches Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No adviser matches were found for your research title. This may happen if no advisers have matching specializations.
          </p>
          <Button variant="outline" onClick={() => navigate('/submit-title')}>
            Back to Title Submission
          </Button>
        </Card>
      )}

      <div className="space-y-4">
        {matches.map((adviser, idx) => (
          <Card key={adviser.adviserId} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
            
            <div className="flex items-start gap-4 flex-1">
              {/* Ranking Number */}
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 font-bold text-gray-500 flex items-center justify-center shrink-0">
                #{idx + 1}
              </div>
              
              <div className="space-y-2">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {adviser.adviserName}
                    {adviser.compatibilityScore >= 90 && (
                      <Badge variant="emerald" size="sm">High Match</Badge>
                    )}
                    {adviser.compatibilityScore >= 75 && adviser.compatibilityScore < 90 && (
                      <Badge variant="blue" size="sm">Good Match</Badge>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{adviser.department}</p>
                </div>

                {/* Matched Keywords */}
                {adviser.matchedKeywords && adviser.matchedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {adviser.matchedKeywords.slice(0, 5).map((kw, ki) => (
                      <span
                        key={ki}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

                {/* Score Breakdown */}
                {adviser.textSimilarity !== undefined && (
                  <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 dark:text-gray-400">
                    <span>Text: <strong className="text-gray-700 dark:text-gray-300">{Math.round(adviser.textSimilarity)}%</strong></span>
                    <span>Specialization: <strong className="text-gray-700 dark:text-gray-300">{Math.round(adviser.specializationMatch)}%</strong></span>
                    <span>Expertise: <strong className="text-gray-700 dark:text-gray-300">{Math.round(adviser.expertiseMatch)}%</strong></span>
                    <span>Interest: <strong className="text-gray-700 dark:text-gray-300">{Math.round(adviser.researchInterestMatch)}%</strong></span>
                  </div>
                )}

                <p className="text-xs text-gray-500 bg-gray-50 dark:bg-slate-800 p-2 rounded border border-gray-100 dark:border-slate-700 italic">
                  "{adviser.explanation}"
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3 shrink-0 w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 text-right">
              <div className="text-center md:text-right w-full">
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400 leading-none">
                  {adviser.compatibilityScore}%
                </div>
                <div className="text-[10px] uppercase font-bold text-gray-400 mt-1">Compatibility</div>
              </div>
              
              <Button
                variant="primary"
                className="w-full"
                disabled={submittingId !== null}
                onClick={() => handleSelectAdviser(adviser)}
              >
                {submittingId === adviser.adviserId ? 'Sending...' : 'Select Adviser'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

          </Card>
        ))}
      </div>
    </div>
  );
};
