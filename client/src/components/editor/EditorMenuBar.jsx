import React from 'react';
import { exportToDocx, exportToPdf } from '../../utils/manuscriptExporter';

export const EditorMenuBar = ({ editor, title = 'Manuscript', onOpenPageSettings, onNewDocument }) => {
  if (!editor) return null;

  const handleExportDocx = () => {
    exportToDocx(editor.getHTML(), `${title || 'Manuscript'}.docx`, title);
  };

  const handleExportPdf = () => {
    exportToPdf(editor.getHTML(), `${title || 'Manuscript'}.pdf`, title);
  };

  return (
    <div className="flex items-center gap-1 mt-0.5 text-[12px] text-gray-600 dark:text-gray-400 select-none">
      {/* File Menu */}
      <div className="hover:bg-gray-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors relative group">
        File
        <div className="absolute left-0 top-full mt-0.5 bg-white dark:bg-slate-800 shadow-xl border border-gray-200 dark:border-slate-700 rounded-lg py-1 w-48 hidden group-hover:block z-50 animate-fade-in text-xs">
          {onNewDocument && (
            <button 
              type="button"
              onClick={onNewDocument} 
              className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
            >
              New Document
            </button>
          )}
          {onOpenPageSettings && (
            <button 
              type="button"
              onClick={onOpenPageSettings} 
              className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
            >
              Page setup & margins...
            </button>
          )}
          <div className="h-[1px] bg-gray-200 dark:bg-slate-700 my-1" />
          <button 
            type="button"
            onClick={handleExportDocx} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
          >
            Download as DOCX (.docx)
          </button>
          <button 
            type="button"
            onClick={handleExportPdf} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
          >
            Download as PDF (.pdf)
          </button>
        </div>
      </div>
      
      {/* Edit Menu */}
      <div className="hover:bg-gray-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors relative group">
        Edit
        <div className="absolute left-0 top-full mt-0.5 bg-white dark:bg-slate-800 shadow-xl border border-gray-200 dark:border-slate-700 rounded-lg py-1 w-48 hidden group-hover:block z-50 animate-fade-in text-xs">
          <button 
            type="button"
            onClick={() => editor.chain().focus().undo().run()} 
            disabled={!editor.can().undo()}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between text-gray-800 dark:text-gray-200 disabled:opacity-40"
          >
            <span>Undo</span>
            <span className="text-gray-400 text-[10px]">Ctrl+Z</span>
          </button>
          <button 
            type="button"
            onClick={() => editor.chain().focus().redo().run()} 
            disabled={!editor.can().redo()}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between text-gray-800 dark:text-gray-200 disabled:opacity-40"
          >
            <span>Redo</span>
            <span className="text-gray-400 text-[10px]">Ctrl+Y</span>
          </button>
          <div className="h-[1px] bg-gray-200 dark:bg-slate-700 my-1" />
          <button 
            type="button"
            onClick={() => editor.chain().focus().selectAll().run()} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between text-gray-800 dark:text-gray-200"
          >
            <span>Select All</span>
            <span className="text-gray-400 text-[10px]">Ctrl+A</span>
          </button>
          <button 
            type="button"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
          >
            Clear Formatting
          </button>
        </div>
      </div>

      {/* Insert Menu */}
      <div className="hover:bg-gray-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors relative group">
        Insert
        <div className="absolute left-0 top-full mt-0.5 bg-white dark:bg-slate-800 shadow-xl border border-gray-200 dark:border-slate-700 rounded-lg py-1 w-48 hidden group-hover:block z-50 animate-fade-in text-xs">
          <button 
            type="button"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
          >
            Table (3×3)
          </button>
          <button 
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
          >
            Horizontal Line
          </button>
        </div>
      </div>

      {/* Format Menu */}
      <div className="hover:bg-gray-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors relative group">
        Format
        <div className="absolute left-0 top-full mt-0.5 bg-white dark:bg-slate-800 shadow-xl border border-gray-200 dark:border-slate-700 rounded-lg py-1 w-48 hidden group-hover:block z-50 animate-fade-in text-xs">
          <button 
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between text-gray-800 dark:text-gray-200"
          >
            <span className="font-bold">Bold</span>
            <span className="text-gray-400 text-[10px]">Ctrl+B</span>
          </button>
          <button 
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between text-gray-800 dark:text-gray-200"
          >
            <span className="italic">Italic</span>
            <span className="text-gray-400 text-[10px]">Ctrl+I</span>
          </button>
          <button 
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between text-gray-800 dark:text-gray-200"
          >
            <span className="underline">Underline</span>
            <span className="text-gray-400 text-[10px]">Ctrl+U</span>
          </button>
          <button 
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 line-through"
          >
            Strikethrough
          </button>
          <div className="h-[1px] bg-gray-200 dark:bg-slate-700 my-1" />
          <button 
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
          >
            Align Left
          </button>
          <button 
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
          >
            Align Center
          </button>
          <button 
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
          >
            Align Right
          </button>
        </div>
      </div>
    </div>
  );
};
