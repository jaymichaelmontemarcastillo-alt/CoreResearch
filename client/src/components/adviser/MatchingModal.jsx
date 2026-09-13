// src/components/adviser/MatchingModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';
import {
  HiSparkles,
  HiUser,
  HiAcademicCap,
  HiTag,
  HiCheckCircle,
  HiClock,
  HiExclamationCircle,
  HiChevronRight,
  HiArrowPath,
} from 'react-icons/hi2';
import adviserMatchingService from '../../services/adviserMatching.service';
import adviserRequestService from '../../services/adviserRequest.service';
import groupService from '../../services/group.service';
import { courseService } from '../../services/course.service';
import { sectionService } from '../../services/section.service';

const LOADING_MESSAGES = [
  'Analyzing your research title...',
  'Evaluating research domain & keywords...',
  'Matching faculty adviser specializations...',
  'Calculating semantic compatibility scores...',
  'Preparing recommended advisers...',
];

export const MatchingModal = ({
  isOpen,
  onClose,
  title = '',
  description = '',
  currentUser,
  userProfile,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [matches, setMatches] = useState([]);
  const [serviceError, setServiceError] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [toast, setToast] = useState('');
  const loadingIntervalRef = useRef(null);

  // Progressive loading message animation
  useEffect(() => {
    if (isOpen && loading && !pendingRequest) {
      let index = 0;
      loadingIntervalRef.current = setInterval(() => {
        index = (index + 1) % LOADING_MESSAGES.length;
        setLoadingMessage(LOADING_MESSAGES[index]);
      }, 1800);
    }
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    };
  }, [isOpen, loading, pendingRequest]);

  // Execute matching when modal opens
  const runMatching = async () => {
    if (!title) return;
    setLoading(true);
    setServiceError(null);
    try {
      // Check if student already has a pending or accepted request
      const group = await groupService.getGroupByStudentId(currentUser.uid);
      const requests = await adviserRequestService.getRequestsForStudentOrGroup(
        currentUser.uid,
        group?.id
      );
      const active = requests.find((r) => r.status === 'pending');
      const accepted = requests.find((r) => r.status === 'accepted');

      if (accepted) {
        onClose();
        navigate('/research/workspace');
        return;
      }

      if (active) {
        setPendingRequest(active);
        setLoading(false);
        return;
      }

      const recommendations = await adviserMatchingService.getRecommendations(
        title,
        description || ''
      );
      setMatches(recommendations.slice(0, 5));
    } catch (err) {
      console.error('[MatchingModal] error:', err);
      setServiceError(err.message || 'Unable to complete adviser matching at this moment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && title) {
      runMatching();
    } else {
      setMatches([]);
      setPendingRequest(null);
      setServiceError(null);
    }
  }, [isOpen, title, description]);

  const handleSelectAdviser = async (adviser) => {
    const confirm = window.confirm(
      `Are you sure you want to select ${adviser.adviserName} as your preferred adviser?`
    );
    if (!confirm) return;

    setSubmittingId(adviser.adviserId);
    try {
      const group = await groupService.getGroupByStudentId(currentUser.uid);
      const allCourses = await courseService.getAllCourses();

      const courseId = group?.courseId || userProfile?.courseId;
      const sectionId = group?.sectionId || userProfile?.sectionId;
      const course = allCourses.find((c) => c.id === courseId);

      let section = null;
      if (courseId && sectionId) {
        const sections = await sectionService.getSectionsByCourseId(courseId);
        section = sections.find((s) => s.id === sectionId);
      }

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
        compatibilityScore: adviser.compatibilityScore || adviser.score,
      });

      // Also persist research title to the group document immediately
      if (group?.id && title) {
        groupService.updateGroup(group.id, { title }).catch((err) => {
          console.warn('[MatchingModal] error updating group title:', err);
        });
      }

      setPendingRequest(request);
      setToast(`Request successfully sent to ${adviser.adviserName}!`);
      if (onSuccess) onSuccess(request);
    } catch (err) {
      console.error('[MatchingModal] select error:', err);
      setToast('Failed to select adviser: ' + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCancelRequest = async () => {
    if (!pendingRequest) return;
    const confirm = window.confirm(
      'Are you sure you want to cancel this request and select another adviser?'
    );
    if (!confirm) return;

    setLoading(true);
    try {
      await adviserRequestService.deleteRequest(pendingRequest.id);
      setPendingRequest(null);
      setToast('Request cancelled. You can now select a different adviser.');
      await runMatching();
    } catch (err) {
      setToast('Failed to cancel request: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Faculty Adviser Matching"
      icon={HiSparkles}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {toast && (
          <Toast
            message={toast}
            variant={toast.includes('Failed') ? 'error' : 'success'}
            onClose={() => setToast('')}
          />
        )}

        {/* Loading Animation */}
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center gap-5 text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-200 dark:border-blue-900/40 border-t-blue-600 dark:border-t-blue-400 animate-spin" />
              <HiSparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-800 dark:text-gray-200 animate-pulse">
                {loadingMessage}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Comparing research profile keywords with faculty expertise
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && serviceError && (
          <div className="p-6 text-center space-y-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40">
            <HiExclamationCircle className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <h4 className="text-base font-bold text-red-900 dark:text-red-200">
                Matching Unavailable
              </h4>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1 max-w-md mx-auto">
                {serviceError}
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="primary" size="sm" onClick={runMatching}>
                <HiArrowPath className="w-4 h-4 mr-1.5" /> Retry Matching
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Pending Request State */}
        {!loading && !serviceError && pendingRequest && (
          <div className="p-6 text-center space-y-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center mx-auto">
              <HiClock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Adviser Request Pending
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 max-w-md mx-auto">
                Your request has been submitted to{' '}
                <strong className="text-gray-900 dark:text-white">
                  {pendingRequest.adviserName}
                </strong>
                . Once accepted, your Research Workspace will be activated immediately.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#15161e] border border-amber-200/70 dark:border-amber-900/30 text-left text-xs space-y-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Research Title</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {pendingRequest.researchTitle}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Faculty Mentor</span>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  {pendingRequest.adviserName} ({pendingRequest.compatibilityScore}% Compatibility)
                </p>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40"
                onClick={handleCancelRequest}
              >
                Cancel Request & Pick Another
              </Button>
              <Button variant="primary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Results List */}
        {!loading && !serviceError && !pendingRequest && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
              <HiSparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 dark:text-blue-200">
                <span className="font-bold">Top Matched Advisers</span> for:{' '}
                <span className="italic">"{title}"</span>. Review their expertise and choose an
                adviser to guide your research.
              </div>
            </div>

            {matches.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No matching advisers found for this title. You may try modifying your research title
                or keywords.
              </div>
            ) : (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {matches.map((adviser, index) => {
                  const score = adviser.compatibilityScore || adviser.score || 0;
                  const scoreVariant = score >= 85 ? 'emerald' : score >= 70 ? 'blue' : 'amber';

                  return (
                    <div
                      key={adviser.adviserId}
                      className="p-4 rounded-xl border border-gray-200 dark:border-[#222433] bg-white dark:bg-[#15161e] hover:border-blue-300 dark:hover:border-blue-700/60 transition-all shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      {/* Left: Avatar & Info */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Profile Picture */}
                        <div className="relative shrink-0">
                          {adviser.profile_image ? (
                            <img
                              src={adviser.profile_image}
                              alt={adviser.adviserName}
                              className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/20 shadow-sm"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm items-center justify-center shadow-sm ${
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
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gray-100 dark:bg-slate-800 text-[10px] font-bold text-gray-600 dark:text-gray-300 flex items-center justify-center border border-gray-200 dark:border-slate-700">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Text Details */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {adviser.adviserName}
                            </h4>
                            <Badge variant={scoreVariant} size="sm">
                              {score}% Match
                            </Badge>
                          </div>

                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {adviser.department || 'Faculty Adviser'}
                          </p>

                          {/* Matched Keywords */}
                          {adviser.matchedKeywords && adviser.matchedKeywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {adviser.matchedKeywords.slice(0, 4).map((kw, ki) => (
                                <span
                                  key={ki}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40"
                                >
                                  <HiTag className="w-2.5 h-2.5" />
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}

                          {adviser.explanation && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 italic pt-0.5">
                              "{adviser.explanation}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Select Action */}
                      <div className="shrink-0 w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-[#222433]">
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full sm:w-auto shadow-sm"
                          disabled={submittingId !== null}
                          onClick={() => handleSelectAdviser(adviser)}
                        >
                          {submittingId === adviser.adviserId ? (
                            'Sending...'
                          ) : (
                            <>
                              Select Adviser <HiChevronRight className="w-4 h-4 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MatchingModal;
