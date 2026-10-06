import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi2';
import { PdfViewer } from '../components/ui/PdfViewer';

export const PdfViewerPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const url = searchParams.get('url');
  const title = searchParams.get('title') || 'Document Viewer';

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
