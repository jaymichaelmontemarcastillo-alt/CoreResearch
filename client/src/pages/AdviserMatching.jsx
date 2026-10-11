// src/pages/AdviserMatching.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import {
  HiUsers,
  HiChevronRight,
  HiExclamationCircle,
  HiClock,
  HiXCircle,
  HiSparkles,
  HiTag,
  HiBookOpen,
  HiDocumentText,
  HiExclamationTriangle,
  HiInformationCircle,
  HiCheckCircle
} from 'react-icons/hi2';
import groupService from '../services/group.service';
import adviserRequestService from '../services/adviserRequest.service';
import adviserMatchingService from '../services/adviserMatching.service';
import { courseService } from '../services/course.service';
import { sectionService } from '../services/section.service';

// Progressive loading messages
const LOADING_MESSAGES = [
  'Analyzing your research title...',
  'Finding compatible advisers...',
  'Checking faculty group capacities...',
  'Comparing research expertise & publications...',
  'Calculating compatibility scores...',
  'Preparing recommendations...',
];

export const AdviserMatching = () => {
  const { currentUser, userProfile } = useAuth();
  const { confirm } = useConfirm();
  const location = useLocation();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [matches, setMatches] = useState([]);
  const [availableAlternatives, setAvailableAlternatives] = useState([]);
  const [allTopMatchesFull, setAllTopMatchesFull] = useState(false);
  const [activeTab, setActiveTab] = useState('matches'); // 'matches' | 'available'
  const [selectedAdviserForWorks, setSelectedAdviserForWorks] = useState(null);
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
    let unsubscribe = () => {};

    const initMatching = async () => {
      try {
        const group = await groupService.getGroupByStudentId(currentUser.uid);
        
        // 1. Check for existing request via Real-time subscription
        unsubscribe = adviserRequestService.subscribeToStudentRequests(
          currentUser.uid,
          async (requests) => {
            const activeRequest = requests.find(r => r.status === 'pending');
            const acceptedRequest = requests.find(r => r.status === 'accepted');
            const declinedRequest = requests.find(r => r.status === 'declined');

            if (acceptedRequest) {
              // Adviser accepted! Head to workspace
              navigate('/research/workspace');
              return;
            }

            if (activeRequest) {
              setPendingRequest(activeRequest);
              setLoading(false);
              return;
            }
            
            if (declinedRequest) {
              // If declined, clear the pending state and let them see matches again
              setPendingRequest(null);
            }

            // 2. We don't have a pending/accepted request. Start matching based on state.
            if (!location.state?.title && !activeRequest) {
              // If they got here without a title, send them back
              navigate('/submit-title');
              return;
            }

            if (location.state?.title && !activeRequest && matches.length === 0 && !serviceError) {
              // Only fetch recommendations if we haven't already
              setTitle(location.state.title);
              setDescription(location.state.description || '');

              try {
                const recResult = await adviserMatchingService.getRecommendations(
                  location.state.title,
                  location.state.description || ''
                );
                
                const recMatches = (recResult?.matches || []).slice(0, 5);
                const recAlternatives = recResult?.availableAlternatives || [];
                const topMatchesAreFull = Boolean(recResult?.allTopMatchesFull);

                setMatches(recMatches);
                setAvailableAlternatives(recAlternatives);
                setAllTopMatchesFull(topMatchesAreFull);

                // Auto-switch to available faculty if no top matches or all are full
                if (recMatches.length === 0 || topMatchesAreFull) {
                  setActiveTab('available');
                } else {
                  setActiveTab('matches');
                }

                setServiceError(null);
              } catch (err) {
                console.error(err);
                if (err.message?.includes('unavailable') || err.message?.includes('temporarily')) {
                  setServiceError(err.message);
                } else if (err.message?.includes('Network Error') || err.message?.includes('connection')) {
                  setServiceError('Adviser matching service is temporarily unavailable. Please try again later.');
                } else {
                  setToast('Failed to initialize matching: ' + err.message);
                }
              }
              setLoading(false);
            }
          },
          group?.id
        );

      } catch (err) {
        console.error(err);
        setToast('Failed to initialize matching: ' + err.message);
        setLoading(false);
      }
    };

    if (currentUser) {
      initMatching();
    }
    
    return () => unsubscribe();
  }, [currentUser, location.state, navigate]);

  const handleSelectAdviser = async (adviser) => {
    if (adviser.isFull || (adviser.availableSlots !== undefined && adviser.availableSlots <= 0)) {
      setToast('This adviser has reached their maximum advisee capacity and cannot accept more groups.');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Confirm Adviser Selection',
      message: `Are you sure you want to select ${adviser.adviserName} as your preferred adviser?`,
      confirmText: 'Select Adviser',
      variant: 'primary'
    });
    if (!isConfirmed) return;

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
        compatibilityScore: adviser.compatibilityScore || 0
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
    const isConfirmed = await confirm({
      title: 'Cancel Request',
      message: 'Are you sure you want to cancel this request and restart your title submission?',
      confirmText: 'Cancel Request',
      variant: 'danger'
    });
    if (!isConfirmed) return;

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

    const retryMatching = async () => {
      try {
        const recResult = await adviserMatchingService.getRecommendations(
          title || location.state?.title || '',
          description || location.state?.description || ''
        );
        const recMatches = (recResult?.matches || []).slice(0, 5);
        const recAlternatives = recResult?.availableAlternatives || [];
        const topMatchesAreFull = Boolean(recResult?.allTopMatchesFull);

        setMatches(recMatches);
        setAvailableAlternatives(recAlternatives);
        setAllTopMatchesFull(topMatchesAreFull);

        if (recMatches.length === 0 || topMatchesAreFull) {
          setActiveTab('available');
        } else {
          setActiveTab('matches');
        }

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
          <HiSparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center">
          <p className="text-gray-700 dark:text-gray-200 font-medium text-lg animate-pulse">
            {loadingMessage}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Evaluating research profiles, publications, and group workload
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
          <HiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">
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
          <HiClock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">Waiting for Adviser Acceptance</h2>
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
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {pendingRequest.adviserName} {pendingRequest.compatibilityScore ? `(${pendingRequest.compatibilityScore}% Match)` : ''}
              </span>
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

  const displayedList = activeTab === 'matches' ? matches : availableAlternatives;

  // ── Main Results View ─────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {toast && <Toast message={toast} variant={toast.includes('success') ? 'success' : 'error'} onClose={() => setToast('')} />}

      <PageHeader
        icon={HiUsers}
        title="Adviser Matching & Faculty Directory"
        description="Review algorithmic recommendations, check faculty slot capacities, and explore verified published works."
      />

      {/* Title Context Box */}
      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl flex items-start gap-4">
        <HiExclamationCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">Proposed Research Title</h4>
          <p className="text-xs text-blue-800 dark:text-blue-300 mt-0.5 font-medium">
            "{title}"
          </p>
          <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1">
            Select one adviser with open slots. If recommended faculty are full, you can explore any faculty member's published papers in the Available Directory to make an informed choice.
          </p>
        </div>
      </div>

      {/* All Matches Full Warning Banner */}
      {allTopMatchesFull && (
        <div className="bg-amber-50 dark:bg-amber-900/25 border border-amber-200 dark:border-amber-800/60 p-4 rounded-xl flex items-start gap-3">
          <HiExclamationTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <h4 className="font-semibold text-amber-900 dark:text-amber-100">
              Top Recommended Advisers are Currently at Full Capacity
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
              Faculty members with the highest expertise match for your title have already reached their maximum limit of 5 advisee groups. 
              We've enlisted all faculty members who currently have open slots below so you can inspect their published research works and choose an adviser.
            </p>
          </div>
        </div>
      )}

      {/* No Matches Found Banner */}
      {matches.length === 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/25 border border-indigo-200 dark:border-indigo-800/60 p-4 rounded-xl flex items-start gap-3">
          <HiInformationCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <h4 className="font-semibold text-indigo-900 dark:text-indigo-100">
              No Algorithmic Matches Found
            </h4>
            <p className="text-xs text-indigo-800 dark:text-indigo-300 mt-1 leading-relaxed">
              We couldn't match specific keywords from your proposed title with faculty specializations. 
              However, you can browse all faculty members who have open slots below, view their published papers and research abstracts, and request your preferred adviser.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('matches')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'matches'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <HiSparkles className="w-4 h-4" />
          Top Recommended ({matches.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('available')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'available'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <HiUsers className="w-4 h-4" />
          Available Faculty Directory ({availableAlternatives.length})
        </button>
      </div>

      {/* Tab Context Subtitle */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
        <span>
          {activeTab === 'matches'
            ? 'Displaying highest ranked faculty based on semantic title similarity.'
            : 'Displaying faculty members with open slots. Click "View Published Works" to inspect their research papers & abstracts.'}
        </span>
        <span>Showing {displayedList.length} faculty</span>
      </div>

      {/* Empty State */}
      {displayedList.length === 0 && (
        <Card className="p-10 text-center">
          <HiExclamationCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            {activeTab === 'matches' ? 'No Matching Advisers Found' : 'No Faculty with Open Slots'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 max-w-md mx-auto">
            {activeTab === 'matches'
              ? 'Try switching to the "Available Faculty Directory" tab to browse faculty with available advisee slots.'
              : 'All faculty members in the department are currently at their maximum capacity. Please consult your research coordinator.'}
          </p>
          {activeTab === 'matches' && availableAlternatives.length > 0 && (
            <Button variant="primary" onClick={() => setActiveTab('available')}>
              View Available Faculty Directory ({availableAlternatives.length})
            </Button>
          )}
        </Card>
      )}

      {/* Adviser Cards List */}
      <div className="space-y-4">
        {displayedList.map((adviser, idx) => {
          const isAtCapacity = adviser.isFull || (adviser.availableSlots !== undefined && adviser.availableSlots <= 0);
          const hasPapers = adviser.publishedWorks && adviser.publishedWorks.length > 0;

          return (
            <Card
              key={`${adviser.adviserId}-${idx}`}
              className={`p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all ${
                isAtCapacity
                  ? 'bg-gray-50/60 dark:bg-slate-900/40 border-gray-200 dark:border-slate-800 opacity-90'
                  : 'hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Profile Picture with Ranking Badge */}
                <div className="relative shrink-0">
                  {adviser.profile_image ? (
                    <img
                      src={adviser.profile_image}
                      alt={adviser.adviserName}
                      className="w-14 h-14 rounded-full object-cover border-2 border-blue-500/20 shadow-sm"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-base items-center justify-center shadow-sm ${
                      adviser.profile_image ? 'hidden' : 'flex'
                    }`}
                  >
                    {adviser.adviserName
                      ?.split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'AD'}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-slate-800 text-[10px] font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center border border-gray-200 dark:border-slate-700 shadow-xs">
                    #{idx + 1}
                  </span>
                </div>

                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
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

                    {/* Capacity Badge */}
                    <div>
                      {isAtCapacity ? (
                        <Badge variant="rose" size="sm">
                          At Capacity (0 slots)
                        </Badge>
                      ) : (
                        <Badge variant="emerald" size="sm">
                          {adviser.availableSlots ?? (5 - (adviser.activeGroupsCount || 0))} / {adviser.maxCapacity || 5} Slots Open
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Matched Keywords */}
                  {adviser.matchedKeywords && adviser.matchedKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {adviser.matchedKeywords.slice(0, 5).map((kw, ki) => (
                        <span
                          key={ki}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
                        >
                          <HiTag className="w-2.5 h-2.5" />
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Matched Paper Title (If applicable) */}
                  {adviser.matchedPaperTitle && (
                    <div className="text-xs text-blue-700 dark:text-blue-300 mb-1">
                      <strong className="font-semibold">Relevant Publication:</strong> <span className="italic">"{adviser.matchedPaperTitle}"</span>
                    </div>
                  )}

                  {/* Supporting Research Evidence */}
                  {adviser.matchedResearch && adviser.matchedResearch.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] uppercase font-bold text-gray-500">Relevant Research Evidence:</p>
                      <ul className="text-xs space-y-1">
                        {adviser.matchedResearch.map((paper) => (
                          <li key={paper.documentId} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <span className={`w-2 h-2 rounded-full ${paper.relevance === 'strong' ? 'bg-emerald-500' : paper.relevance === 'moderate' ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                            <span className="truncate max-w-[250px] sm:max-w-[350px]">{paper.title}</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{paper.similarity}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Explanation note */}
                  <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-gray-100 dark:border-slate-700 italic">
                    "{adviser.explanation}"
                  </p>

                  {/* Published Works Trigger Button */}
                  <div className="pt-1">
                    {hasPapers ? (
                      <button
                        type="button"
                        onClick={() => setSelectedAdviserForWorks(adviser)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 transition-colors border border-blue-200 dark:border-blue-800"
                      >
                        <HiBookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Explore Published Works ({adviser.publishedWorks.length} {adviser.publishedWorks.length === 1 ? 'Paper' : 'Papers'})
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 italic inline-flex items-center gap-1">
                        <HiDocumentText className="w-3.5 h-3.5" />
                        No research papers uploaded yet
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Column */}
              <div className="flex flex-col items-end gap-3 shrink-0 w-full md:w-44 border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 text-right">
                <div className="text-center md:text-right w-full">
                  {adviser.compatibilityScore > 0 ? (
                    <>
                      <div className="text-2xl sm:text-3xl font-semibold text-blue-600 dark:text-blue-400 leading-none">
                        {adviser.compatibilityScore}%
                      </div>
                      <div className="text-[10px] uppercase font-bold text-gray-400 mt-1">Compatibility</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        Open Slot
                      </div>
                      <div className="text-[10px] uppercase font-bold text-gray-400 mt-0.5">Faculty Directory</div>
                    </>
                  )}
                </div>

                {isAtCapacity ? (
                  <Button
                    variant="outline"
                    className="w-full text-xs text-gray-400 border-gray-300 dark:border-slate-700 cursor-not-allowed opacity-60"
                    disabled={true}
                  >
                    At Capacity
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="w-full text-xs"
                    disabled={submittingId !== null}
                    onClick={() => handleSelectAdviser(adviser)}
                  >
                    {submittingId === adviser.adviserId ? 'Sending...' : 'Select Adviser'}
                    <HiChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Published Works Modal */}
      <Modal
        isOpen={Boolean(selectedAdviserForWorks)}
        onClose={() => setSelectedAdviserForWorks(null)}
        title={`${selectedAdviserForWorks?.adviserName || 'Faculty Member'} - Published Works & Expertise`}
        icon={HiBookOpen}
        maxWidth="max-w-3xl"
      >
        {selectedAdviserForWorks && (
          <div className="space-y-5">
            {/* Faculty Snapshot */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl flex items-center justify-between border border-gray-100 dark:border-slate-700/60">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white text-base">
                  {selectedAdviserForWorks.adviserName}
                </h4>
                <p className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">
                  {selectedAdviserForWorks.department}
                </p>
              </div>
              <div className="text-right">
                {selectedAdviserForWorks.isFull ? (
                  <Badge variant="rose">At Capacity</Badge>
                ) : (
                  <Badge variant="emerald">
                    {selectedAdviserForWorks.availableSlots ?? (5 - (selectedAdviserForWorks.activeGroupsCount || 0))} of {selectedAdviserForWorks.maxCapacity || 5} Slots Open
                  </Badge>
                )}
              </div>
            </div>

            {/* Explanatory instruction for students */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Review this faculty member's published research papers, methodologies, and topics below to evaluate if their domain aligns with your thesis requirements.
            </p>

            {/* Papers List */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {selectedAdviserForWorks.publishedWorks && selectedAdviserForWorks.publishedWorks.length > 0 ? (
                selectedAdviserForWorks.publishedWorks.map((paper, pIdx) => (
                  <div
                    key={paper.id || pIdx}
                    className="p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                        {paper.title}
                      </h5>
                    </div>

                    {paper.abstract ? (
                      <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 block text-[11px] mb-1 uppercase tracking-wider">
                          Abstract:
                        </span>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                          {paper.abstract}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No abstract provided for this publication.</p>
                    )}

                    {/* Methodologies */}
                    {paper.methodologies && paper.methodologies.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Methodologies:</span>
                        {paper.methodologies.map((meth, mi) => (
                          <span
                            key={`meth-${mi}`}
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800"
                          >
                            {meth}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Keywords & Topics */}
                    {((paper.keywords && paper.keywords.length > 0) || (paper.researchTopics && paper.researchTopics.length > 0)) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Topics:</span>
                        {(paper.researchTopics || []).map((topic, ti) => (
                          <span
                            key={`top-${ti}`}
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800"
                          >
                            {topic}
                          </span>
                        ))}
                        {(paper.keywords || []).map((kw, ki) => (
                          <span
                            key={`kw-${ki}`}
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-400">
                  <HiDocumentText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No research papers uploaded or verified yet for this faculty member.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setSelectedAdviserForWorks(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={selectedAdviserForWorks.isFull || submittingId !== null}
                onClick={() => {
                  const adviser = selectedAdviserForWorks;
                  setSelectedAdviserForWorks(null);
                  handleSelectAdviser(adviser);
                }}
              >
                {selectedAdviserForWorks.isFull ? 'Capacity Reached' : 'Select This Adviser'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
