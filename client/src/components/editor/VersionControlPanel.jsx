import React, { useState, useEffect } from 'react';
import { HiOutlineClock, HiXMark, HiCheck, HiOutlineDocumentArrowDown } from 'react-icons/hi2';
import { documentStore } from '../../services/documentStore';
import { useAuth } from '../../context/AuthContext';

// Helper to format ISO timestamp into MM/DD/YYYY • h:mm AM/PM format
const formatVersionDateTime = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${month}/${day}/${year} • ${timeStr}`;
  } catch {
    return '';
  }
};

export const VersionControlPanel = ({
  documentId,
  editor,
  onClose,
  onPreviewVersion,
  previewingVersionId
}) => {
  const { userProfile, currentUser, role, currentFacultyMode } = useAuth();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const effectiveUserProfile = userProfile || {
    uid: currentUser?.uid || 'guest-user',
    fullName: userProfile?.fullName || userProfile?.first_name || 'Researcher',
  };

  const effectiveRole = role === 'faculty' ? currentFacultyMode : role;
  const isFaculty = effectiveRole === 'adviser' || effectiveRole === 'panelist';

  useEffect(() => {
    if (!documentId) return;
    setLoading(true);

    const unsubscribe = documentStore.subscribeVersions(
      documentId,
      (fetchedVersions) => {
        setVersions(fetchedVersions);
        setLoading(false);
      },
      (err) => {
        console.warn('Versions subscription warning:', err);
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [documentId]);

  const handleSaveVersion = async () => {
    if (!editor || isSaving) return;
    setIsSaving(true);
    
    try {
      const contentJson = editor.getJSON();
      await documentStore.saveVersion(documentId, contentJson, effectiveUserProfile, newVersionLabel);
      setNewVersionLabel('');
      setShowSaveForm(false);
    } catch (err) {
      console.error('Failed to save version:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 select-text overflow-hidden text-sm">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-blue-600">
            <HiOutlineClock className="w-5 h-5" />
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Version History</h3>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Close panel"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Save Version Action - Hidden for Advisers */}
        {!isFaculty && (
          <button
            onClick={handleSaveVersion}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors font-medium text-xs disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <HiOutlineDocumentArrowDown className="w-4 h-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Current State'}
          </button>
        )}
      </div>

      {/* Version List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span>Loading history...</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 px-4">
            <HiOutlineClock className="w-8 h-8 mx-auto mb-2.5 text-gray-300 dark:text-gray-600" />
            <p className="font-medium text-gray-600 dark:text-gray-300 mb-1">
              No versions saved
            </p>
            <p className="text-gray-400">
              Save the current document state to create a version snapshot.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => {
              const isPreviewing = previewingVersionId === version.id;
              
              return (
                <div
                  key={version.id}
                  onClick={() => onPreviewVersion(version)}
                  className={`border rounded-xl p-3 shadow-sm transition-all cursor-pointer group hover:shadow-md ${
                    isPreviewing
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-1 ring-blue-500'
                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 truncate pr-2">
                      {version.label || 'Saved Version'}
                    </span>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap pt-0.5">
                      {formatVersionDateTime(version.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                    <span>By {version.createdByName || 'Unknown'}</span>
                    {isPreviewing && (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">
                        Previewing
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionControlPanel;
