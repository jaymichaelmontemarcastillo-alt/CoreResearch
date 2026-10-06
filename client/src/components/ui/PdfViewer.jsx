import React from 'react';
import { HiOutlineDocumentText, HiExclamationCircle, HiArrowTopRightOnSquare } from 'react-icons/hi2';

export const PdfViewer = ({ url, title }) => {
  if (!url) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-[#0e0f15] text-gray-500">
        <HiExclamationCircle className="w-8 h-8 mb-2 text-gray-400" />
        <p>No document URL provided.</p>
      </div>
    );
  }

  const isWorkspace = url.includes('/workspace') || url.includes('/documents/');

  if (isWorkspace) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-[#0e0f15] p-6 text-center">
        <HiOutlineDocumentText className="w-12 h-12 mb-3 text-blue-500" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Live Workspace Document</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
          This document is actively maintained in a live workspace. A static PDF version is not available for preview.
        </p>
        <a 
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
        >
          Open Workspace <HiArrowTopRightOnSquare className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-100 dark:bg-[#0e0f15] relative flex flex-col">
      <object
        data={url}
        type="application/pdf"
        className="w-full h-full flex-1"
        title={title || "PDF Viewer"}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gray-100 dark:bg-[#0e0f15]">
          <HiOutlineDocumentText className="w-12 h-12 mb-3 text-blue-500" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Unable to render PDF</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-4">
            Your browser does not support embedded PDFs, or the file is protected.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg inline-flex items-center gap-2"
          >
            Download PDF <HiArrowTopRightOnSquare className="w-4 h-4" />
          </a>
        </div>
      </object>
    </div>
  );
};
