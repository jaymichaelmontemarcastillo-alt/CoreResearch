import React, { useState, useRef, useEffect } from 'react';
import { exportToDocx, exportToPdf } from '../../utils/manuscriptExporter';

export const EditorMenuBar = ({ editor, title = 'Manuscript', onOpenPageSettings, onNewDocument, onImportDocument }) => {
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menuName) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const closeMenu = () => setOpenMenu(null);

  if (!editor) return null;

  const handleExportDocx = () => {
    exportToDocx(editor.getHTML(), `${title || 'Manuscript'}.docx`, title);
  };

  const handleExportPdf = () => {
    exportToPdf(editor.getHTML(), `${title || 'Manuscript'}.pdf`, title);
  };

  return (
    <div ref={menuRef} className="flex items-center gap-1 mt-0.5 text-[12px] text-gray-600 dark:text-gray-400 select-none">
      {/* File Menu */}
      <div className="relative">
        <div 
          onClick={() => toggleMenu('file')}
          className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${openMenu === 'file' ? 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
        >
          File
        </div>
        {openMenu === 'file' && (
          <div className="absolute left-0 top-full mt-1 bg-white dark:bg-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-200 dark:border-slate-700 rounded-lg py-1 w-48 z-50 animate-fade-in text-xs">
          {onNewDocument && (
            <button 
              type="button"
              onClick={() => { onNewDocument(); closeMenu(); }} 
              className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
            >
              New Document
            </button>
          )}
          {onImportDocument && (
            <button 
              type="button"
              onClick={() => { onImportDocument(); closeMenu(); }} 
              className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 font-medium text-blue-600 dark:text-blue-400"
            >
              Import DOCX...
            </button>
          )}
          {onOpenPageSettings && (
            <button 
              type="button"
              onClick={() => { onOpenPageSettings(); closeMenu(); }} 
              className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
            >
              Page setup & margins...
            </button>
          )}
          <div className="h-[1px] bg-gray-200 dark:bg-slate-700 my-1" />
          <button 
            type="button"
            onClick={() => { handleExportDocx(); closeMenu(); }} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
          >
            Download as DOCX (.docx)
          </button>
          <button 
            type="button"
            onClick={() => { handleExportPdf(); closeMenu(); }}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
          >
            Download as PDF (.pdf)
          </button>
          </div>
        )}
      </div>
      
      {/* Edit Menu */}
      <div className="relative">
        <div 
          onClick={() => toggleMenu('edit')}
          className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${openMenu === 'edit' ? 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
        >
          Edit
        </div>
        {openMenu === 'edit' && (
          <div className="absolute left-0 top-full mt-1 bg-white dark:bg-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-200 dark:border-slate-700 rounded-lg py-1 w-48 z-50 animate-fade-in text-xs">
          <button 
            type="button"
            onClick={() => { editor.chain().focus().undo().run(); closeMenu(); }} 
            disabled={!editor.can().undo()}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between text-gray-800 dark:text-gray-200 disabled:opacity-40"
          >
            <span>Undo</span>
            <span className="text-gray-400 text-[10px]">Ctrl+Z</span>
          </button>
          <button 
            type="button"
            onClick={() => { editor.chain().focus().redo().run(); closeMenu(); }} 
            disabled={!editor.can().redo()}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between text-gray-800 dark:text-gray-200 disabled:opacity-40"
          >
            <span>Redo</span>
            <span className="text-gray-400 text-[10px]">Ctrl+Y</span>
          </button>
          <div className="h-[1px] bg-gray-200 dark:bg-slate-700 my-1" />
          <button 
            type="button"
            onClick={() => { editor.chain().focus().selectAll().run(); closeMenu(); }} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between text-gray-800 dark:text-gray-200"
          >
            <span>Select All</span>
            <span className="text-gray-400 text-[10px]">Ctrl+A</span>
          </button>
          <button 
            type="button"
            onClick={() => { editor.chain().focus().unsetAllMarks().clearNodes().run(); closeMenu(); }} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
          >
            Clear Formatting
          </button>
          </div>
        )}
      </div>

      {/* Insert Menu */}
      <div className="relative">
        <div 
          onClick={() => toggleMenu('insert')}
          className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${openMenu === 'insert' ? 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
        >
          Insert
        </div>
        {openMenu === 'insert' && (
          <div className="absolute left-0 top-full mt-1 bg-white dark:bg-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-200 dark:border-slate-700 rounded-lg py-1 w-48 z-50 animate-fade-in text-xs">
          <button 
            type="button"
            onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); closeMenu(); }} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
          >
            Table (3×3)
          </button>
          <button 
            type="button"
            onClick={() => { editor.chain().focus().setHorizontalRule().run(); closeMenu(); }} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
          >
            Horizontal Line
          </button>
          </div>
        )}
      </div>

      {/* Format Menu */}
      <div className="relative">
        <div 
          onClick={() => toggleMenu('format')}
          className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${openMenu === 'format' ? 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
        >
          Format
        </div>
        {openMenu === 'format' && (
          <div className="absolute left-0 top-full mt-1 bg-white dark:bg-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-200 dark:border-slate-700 rounded-lg py-1 w-48 z-50 animate-fade-in text-xs">
          <button 
            type="button"
            onClick={() => { editor.chain().focus().toggleBold().run(); closeMenu(); }} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between text-gray-800 dark:text-gray-200"
          >
            <span className="font-bold">Bold</span>
            <span className="text-gray-400 text-[10px]">Ctrl+B</span>
          </button>
          <button 
            type="button"
            onClick={() => { editor.chain().focus().toggleItalic().run(); closeMenu(); }} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between text-gray-800 dark:text-gray-200"
          >
            <span className="italic">Italic</span>
            <span className="text-gray-400 text-[10px]">Ctrl+I</span>
          </button>
          <button 
            type="button"
            onClick={() => { editor.chain().focus().toggleUnderline().run(); closeMenu(); }} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between text-gray-800 dark:text-gray-200"
          >
            <span className="underline">Underline</span>
            <span className="text-gray-400 text-[10px]">Ctrl+U</span>
          </button>
          <button 
            type="button"
            onClick={() => { editor.chain().focus().toggleStrike().run(); closeMenu(); }} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between text-gray-800 dark:text-gray-200 line-through"
          >
            Strikethrough
          </button>
          <div className="h-[1px] bg-gray-200 dark:bg-slate-700 my-1" />
          <button 
            type="button"
            onClick={() => { editor.chain().focus().setTextAlign('left').run(); closeMenu(); }} 
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
        )}
      </div>
    </div>
  );
};
