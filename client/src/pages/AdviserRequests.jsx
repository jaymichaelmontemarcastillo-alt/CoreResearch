// src/pages/AdviserRequests.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast } from '../components/ui/Toast';
import { adviserRequestService } from '../services/adviserRequest.service';
import { HiClipboardDocumentList } from 'react-icons/hi2';

export const AdviserRequests = () => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    const unsubscribe = adviserRequestService.subscribeToAllAdviserRequests(
      currentUser.uid,
      (data) => {
        setRequests(data);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const handleAccept = async (id) => {
    try {
      await adviserRequestService.acceptRequest(id);
      setToast('Request accepted successfully.');
    } catch (err) {
      console.error(err);
      setToast('Failed to accept request.');
    }
  };

  const handleReject = async (id) => {
    try {
      await adviserRequestService.declineRequest(id);
      setToast('Request declined successfully.');
    } catch (err) {
      console.error(err);
      setToast('Failed to decline request.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
      <PageHeader
        icon={HiClipboardDocumentList}
        title="Student Requests for Advisee"
        description="Review students requesting you to be their research adviser."
      />
      
      {loading ? (
        <div className="bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#222433] rounded-2xl overflow-hidden shadow-sm p-8 text-center text-gray-500">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
          Loading requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#222433] rounded-2xl overflow-hidden shadow-sm p-8 text-center text-gray-500">
          <HiClipboardDocumentList className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-[#6b6f84]" />
          <p className="text-sm font-medium">No adviser requests found.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#222433] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/50 dark:bg-[#1c1d28] border-b border-gray-200 dark:border-[#222433]">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white">Group / Students</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white">Year & Section</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white">Research Title</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-center">View Details</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white">Status</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white">Date Requested</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white">Date Actioned</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222433]">
                  {requests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1c1d28]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">{req.groupName || 'Individual'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{req.studentName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">{req.courseName || req.programCode || 'N/A'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{req.sectionName || ''}</div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-gray-900 dark:text-white font-medium line-clamp-2">{req.researchTitle}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                          req.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                          req.status === 'declined' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                        }`}>
                          {req.status === 'declined' ? 'Rejected' : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {req.status !== 'pending' && req.updatedAt ? new Date(req.updatedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {req.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAccept(req.id)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden flex flex-col space-y-3">
            {requests.map(req => (
              <div key={req.id} className="bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#222433] rounded-xl overflow-hidden shadow-sm p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{req.researchTitle}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{req.groupName || 'Individual'} • {req.studentName}</p>
                  </div>
                  <span className={`shrink-0 ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    req.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                    req.status === 'declined' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                  }`}>
                    {req.status === 'declined' ? 'Rejected' : req.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-[#222433]">
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View Details
                  </button>
                  
                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-3 py-1.5 text-[11px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleAccept(req.id)}
                        className="px-3 py-1.5 text-[11px] font-bold text-white bg-blue-600 rounded-lg"
                      >
                        Accept
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Details Modal (Uses bottom sheet on mobile) */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center md:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedRequest(null)} />
          <div className="relative bg-white dark:bg-[#15161e] w-full max-w-2xl md:rounded-2xl shadow-xl overflow-hidden mobile-bottom-sheet md:animate-scale-in flex flex-col max-h-[90vh]">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-[#222433] flex justify-between items-center shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Research Details</h3>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Title</h4>
                <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{selectedRequest.researchTitle}</p>
              </div>
              <div>
                <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Description / Rationale</h4>
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {selectedRequest.researchDescription || 'No description provided.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-[#222433]">
                <div>
                  <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Group / Students</h4>
                  <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{selectedRequest.groupName || 'Individual'}</p>
                  <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-400">{selectedRequest.studentName}</p>
                </div>
                <div>
                  <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Match Score</h4>
                  <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-bold">{selectedRequest.compatibilityScore}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdviserRequests;
