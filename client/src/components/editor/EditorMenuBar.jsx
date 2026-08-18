import React from 'react';
import { exportToDocx, exportToPdf } from '../../utils/manuscriptExporter';

export const EditorMenuBar = ({ editor }) => {
  if (!editor) return null;

  const handleExportDocx = () => {
    // In a real implementation, we would extract HTML from the editor 
    // and pass it to our exporter, or use a Tiptap Pro export feature.
    exportToDocx(editor.getHTML(), 'Manuscript.docx', 'Document Export');
  };

  const handleExportPdf = () => {
    exportToPdf(editor.getHTML(), 'Manuscript.pdf', 'Document Export');
  };

  return (
    <div className="flex items-center gap-2 mt-0.5 text-[13px] text-gray-600 dark:text-gray-400">
      <div className="hover:bg-gray-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors relative group">
        File
        <div className="absolute left-0 top-full mt-1 bg-white dark:bg-slate-800 shadow-lg border border-gray-200 dark:border-slate-700 rounded-md py-1 w-48 hidden group-hover:block z-50">
          <button className="w-full text-left px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700">New</button>
          <button className="w-full text-left px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700">Open</button>
          <div className="h-[1px] bg-gray-200 dark:bg-slate-700 my-1"></div>
          <button onClick={handleExportDocx} className="w-full text-left px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700">Download as DOCX</button>
          <button onClick={handleExportPdf} className="w-full text-left px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700">Download as PDF</button>
        </div>
      </div>
      
      <div className="hover:bg-gray-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors relative group">
        Edit
        <div className="absolute left-0 top-full mt-1 bg-white dark:bg-slate-800 shadow-lg border border-gray-200 dark:border-slate-700 rounded-md py-1 w-48 hidden group-hover:block z-50">
          <button onClick={() => editor.chain().focus().undo().run()} className="w-full text-left px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between">
            <span>Undo</span>
            <span className="text-gray-400 text-xs">Ctrl+Z</span>
          </button>
          <button onClick={() => editor.chain().focus().redo().run()} className="w-full text-left px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between">
            <span>Redo</span>
            <span className="text-gray-400 text-xs">Ctrl+Y</span>
          </button>
        </div>
      </div>

      <button className="hover:bg-gray-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">View</button>
      <button className="hover:bg-gray-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">Insert</button>
      <button className="hover:bg-gray-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">Format</button>
      <button className="hover:bg-gray-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">Tools</button>
    </div>
  );
};
