// src/pages/Documents/components/DocumentPreview.jsx
import React from 'react';
import { useDocumentPreview } from '../hooks/useDocumentPreview';

export const DocumentPreview = ({ document }) => {
  const previewModel = useDocumentPreview(document);

  if (previewModel.type === 'image' && previewModel.url) {
    return (
      <div className="cr-paper-sheet flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <img
          src={previewModel.url}
          alt={previewModel.title || 'Document Preview'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  const items = previewModel.items || [];
  const title = previewModel.title || document.title || document.fileName || 'Untitled Document';
  const isPdf = (document.sourceType || '').includes('pdf') || (document.contentType || '').includes('pdf');
  const isDocx = (document.sourceType || '').includes('docx') || (document.fileName || '').endsWith('.docx');

  return (
    <div className="cr-paper-sheet">
      <div className="cr-paper-content">
        {/* Research Paper Header Badge */}
        <div className="cr-paper-header-logo">
          <div className="w-4 h-4 rounded-full bg-blue-600/10 dark:bg-blue-400/20 flex items-center justify-center mr-1.5 shadow-2xs">
            <span className="text-[7px] font-extrabold text-blue-600 dark:text-blue-400 font-sans">CR</span>
          </div>
          <span className="text-[6.5px] font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase font-sans">
            CoreResearch Manuscript
          </span>
        </div>

        {/* Paper Title (Centered, academic style) */}
        <div className="cr-paper-title line-clamp-2" title={title}>
          {title}
        </div>

        {/* Group / Subtitle */}
        <div className="cr-paper-subtitle">
          {document.groupName || document.ownerName || 'Laguna State Polytechnic University'}
        </div>

        {/* Render Extracted Headings / Paragraphs */}
        <div className="flex-1 overflow-hidden space-y-1.5 mt-1">
          {items.slice(0, 6).map((item, idx) => {
            if (item.type === 'h1' || item.type === 'h2') {
              return (
                <div key={idx} className="cr-paper-heading line-clamp-1">
                  {item.text}
                </div>
              );
            }
            if (item.type === 'list' && item.items) {
              return (
                <div key={idx} className="space-y-0.5 pl-2 border-l border-blue-200 dark:border-slate-700">
                  {item.items.slice(0, 3).map((li, liIdx) => (
                    <div key={liIdx} className="cr-paper-text line-clamp-1">
                      • {li}
                    </div>
                  ))}
                </div>
              );
            }
            if (item.type === 'table') {
              return (
                <div key={idx} className="grid grid-cols-2 gap-1 border border-gray-200 dark:border-slate-700 p-1 rounded-sm my-1">
                  <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-xs" />
                  <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-xs" />
                  <div className="h-2 bg-gray-50 dark:bg-slate-900 rounded-xs" />
                  <div className="h-2 bg-gray-50 dark:bg-slate-900 rounded-xs" />
                </div>
              );
            }
            return (
              <div key={idx} className="cr-paper-text line-clamp-2">
                {item.text}
              </div>
            );
          })}

          {/* Faint skeleton lines filling the rest of the page realistically */}
          <div className="cr-paper-lines-skeleton opacity-70">
            <div className="cr-paper-line w-11/12" />
            <div className="cr-paper-line w-full" />
            <div className="cr-paper-line w-4/5" />
            <div className="cr-paper-line w-10/12" />
            <div className="cr-paper-line w-3/4" />
          </div>
        </div>

        {/* Format Badge Overlay (PDF or Word) */}
        {isPdf && (
          <div className="absolute bottom-2.5 right-2.5 bg-red-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-[3px] shadow-xs">
            PDF
          </div>
        )}
        {isDocx && (
          <div className="absolute bottom-2.5 right-2.5 bg-blue-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-[3px] shadow-xs">
            DOCX
          </div>
        )}
      </div>
    </div>
  );
};
