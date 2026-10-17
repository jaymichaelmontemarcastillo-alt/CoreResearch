import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { HiArrowLeft, HiShieldExclamation } from 'react-icons/hi2';
import { PdfViewer } from '../components/ui/PdfViewer';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

export const PdfViewerPage = () => {
  const { role } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const url = searchParams.get('url');
  const title = searchParams.get('title') || 'Document Viewer';

  const isRestrictedRepositoryDoc = role === 'student' && url && (url.includes('/repository/') || url.includes('repository%2F'));

  if (isRestrictedRepositoryDoc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-[#0e0f15] text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-900/50">
          <HiShieldExclamation className="w-9 h-9" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Repository Document Access Restricted
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6 leading-relaxed">
          Student access to institutional repository manuscripts is restricted to abstracts, highlights, and citation metadata only. Full manuscript reading is reserved for faculty and defense panelists.
        </p>
        <Button variant="primary" onClick={() => navigate('/repository')}>
          <HiArrowLeft className="w-4 h-4 mr-2" /> Return to Repository Search
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100 dark:bg-[#0e0f15]">
      {/* Header bar */}
      <div className="h-14 bg-white dark:bg-[#15161e] border-b border-gray-200 dark:border-[#222433] flex items-center px-4 shrink-0 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors mr-3"
          title="Go Back"
        >
          <HiArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={title}>
            {title}
          </h1>
          <p className="text-[11px] text-gray-500 truncate">
            {url}
          </p>
        </div>
      </div>
      
      {/* Viewer container */}
      <div className="flex-1 w-full h-full relative">
        <PdfViewer url={url} title={title} />
      </div>
    </div>
  );
};
