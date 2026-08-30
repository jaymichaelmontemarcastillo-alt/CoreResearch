import React, { useRef, useState } from 'react';
import { 
  FaBold, FaItalic, FaUnderline, FaStrikethrough, FaSubscript, FaSuperscript,
  FaAlignLeft, FaAlignCenter, FaAlignRight, FaAlignJustify,
  FaListUl, FaListOl, FaRotateLeft, FaRotateRight, FaImage, FaTable,
  FaGripLines, FaGripLinesVertical, FaArrowsUpDown
} from 'react-icons/fa6';
import { HiChevronDown, HiPlus, HiTrash, HiDocumentText } from 'react-icons/hi2';
import { Scissors } from 'lucide-react';
import { storageService } from '../../services/storage.service';

const ToolbarButton = ({ onClick, isActive = false, disabled = false, icon: Icon, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
      isActive 
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-medium' 
        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
  >
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </button>
);

const Divider = () => <div className="w-[1px] h-5 bg-gray-200 dark:bg-slate-700 mx-1 shrink-0" />;

const FONT_FAMILIES = [
  { label: 'Inter (Default)', value: 'Inter, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Calibri', value: 'Calibri, Candara, Segoe, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
];

const FONT_SIZES = [
  { label: '10 pt', value: '10pt' },
  { label: '11 pt', value: '11pt' },
  { label: '12 pt', value: '12pt' },
  { label: '14 pt', value: '14pt' },
  { label: '16 pt', value: '16pt' },
  { label: '18 pt', value: '18pt' },
  { label: '24 pt', value: '24pt' },
  { label: '30 pt', value: '30pt' },
  { label: '36 pt', value: '36pt' },
];

export const EditorToolbar = ({ editor, documentId, onOpenPageSettings }) => {
  const fileInputRef = useRef(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showSpacingMenu, setShowSpacingMenu] = useState(false);

  if (!editor) return null;

  // Image Upload handler with Firebase Storage
  const handleImageFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    try {
      setIsUploadingImage(true);
      const downloadURL = await storageService.uploadDocumentImage(documentId, file);
      if (downloadURL) {
        editor.chain().focus().setImage({ src: downloadURL }).run();
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleInsertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    setShowTableMenu(false);
  };

  const currentFontFamily = editor.getAttributes('textStyle').fontFamily || '';
  const currentFontSize = editor.getAttributes('textStyle').fontSize || '';

  return (
    <div className="flex flex-wrap items-center gap-1 max-w-full px-2 py-1 text-xs sm:text-sm relative z-50">
      
      {/* Undo / Redo */}
      <ToolbarButton
        icon={FaRotateLeft}
        title="Undo (Ctrl+Z)"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      />
      <ToolbarButton
        icon={FaRotateRight}
        title="Redo (Ctrl+Y)"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      />

      <Divider />

      {/* Headings Dropdown */}
      <select 
        value={
          editor.isActive('heading', { level: 1 }) ? 'h1' : 
          editor.isActive('heading', { level: 2 }) ? 'h2' : 
          editor.isActive('heading', { level: 3 }) ? 'h3' : 
          editor.isActive('heading', { level: 4 }) ? 'h4' : 
          editor.isActive('heading', { level: 5 }) ? 'h5' : 
          editor.isActive('heading', { level: 6 }) ? 'h6' : 
          'p'
        }
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'p') editor.chain().focus().setParagraph().run();
          else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
          else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
          else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
          else if (val === 'h4') editor.chain().focus().toggleHeading({ level: 4 }).run();
          else if (val === 'h5') editor.chain().focus().toggleHeading({ level: 5 }).run();
          else if (val === 'h6') editor.chain().focus().toggleHeading({ level: 6 }).run();
        }}
        className="text-xs bg-transparent border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 font-medium"
        title="Text Heading Style"
      >
        <option value="p">Normal text</option>
        <option value="h1">Heading 1 (H1)</option>
        <option value="h2">Heading 2 (H2)</option>
        <option value="h3">Heading 3 (H3)</option>
        <option value="h4">Heading 4 (H4)</option>
        <option value="h5">Heading 5 (H5)</option>
        <option value="h6">Heading 6 (H6)</option>
      </select>

      {/* Font Family Dropdown */}
      <select
        value={currentFontFamily}
        onChange={(e) => {
          const val = e.target.value;
          if (val) {
            editor.chain().focus().setFontFamily(val).run();
          } else {
            editor.chain().focus().unsetFontFamily().run();
          }
        }}
        className="text-xs bg-transparent border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 max-w-[120px] truncate"
        title="Font Family"
      >
        <option value="">Font: Default</option>
        {FONT_FAMILIES.map((f) => (
          <option key={f.label} value={f.value} style={{ fontFamily: f.value }}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Font Size Dropdown */}
      <select
        value={currentFontSize}
        onChange={(e) => {
          const val = e.target.value;
          if (val) {
            editor.chain().focus().setFontSize(val).run();
          } else {
            editor.chain().focus().unsetFontSize().run();
          }
        }}
        className="text-xs bg-transparent border border-gray-200 dark:border-slate-700 rounded px-1.5 py-1 text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500"
        title="Font Size"
      >
        <option value="">Size</option>
        {FONT_SIZES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <Divider />

      {/* Text Styles */}
      <ToolbarButton
        icon={FaBold}
        title="Bold (Ctrl+B)"
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={FaItalic}
        title="Italic (Ctrl+I)"
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={FaUnderline}
        title="Underline (Ctrl+U)"
        isActive={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        icon={FaStrikethrough}
        title="Strikethrough"
        isActive={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      
      <ToolbarButton
        icon={FaSubscript}
        title="Subscript"
        isActive={editor.isActive('subscript')}
        onClick={() => editor.chain().focus().toggleSubscript().run()}
      />
      <ToolbarButton
        icon={FaSuperscript}
        title="Superscript"
        isActive={editor.isActive('superscript')}
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
      />

      <Divider />

      {/* Text Colors */}
      <div className="flex items-center gap-1">
        <label className="relative flex items-center cursor-pointer" title="Text Color">
          <input
            type="color"
            onInput={(event) => editor.chain().focus().setColor(event.target.value).run()}
            value={editor.getAttributes('textStyle').color || '#000000'}
            className="w-5 h-5 p-0 border-0 rounded cursor-pointer opacity-0 absolute inset-0"
          />
          <div className="w-5 h-5 rounded border border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center font-bold text-[11px]">
            <span>A</span>
            <div 
              className="w-3.5 h-0.5 rounded-full -mt-0.5" 
              style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }} 
            />
          </div>
        </label>
        
        <label className="relative flex items-center cursor-pointer" title="Highlight Color">
          <input
            type="color"
            onInput={(event) => editor.chain().focus().toggleHighlight({ color: event.target.value }).run()}
            value={editor.getAttributes('highlight').color || '#fef08a'}
            className="w-5 h-5 p-0 border-0 rounded cursor-pointer opacity-0 absolute inset-0"
          />
          <div className="w-5 h-5 rounded border border-gray-300 dark:border-slate-600 flex items-center justify-center bg-yellow-100 text-yellow-800 text-[10px] font-bold">
            H
          </div>
        </label>
      </div>

      <Divider />

      {/* Alignment */}
      <ToolbarButton
        icon={FaAlignLeft}
        title="Align Left"
        isActive={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      />
      <ToolbarButton
        icon={FaAlignCenter}
        title="Align Center"
        isActive={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      />
      <ToolbarButton
        icon={FaAlignRight}
        title="Align Right"
        isActive={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      />
      <ToolbarButton
        icon={FaAlignJustify}
        title="Justify"
        isActive={editor.isActive({ textAlign: 'justify' })}
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
      />

      {/* Line & Paragraph Spacing Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setShowSpacingMenu(!showSpacingMenu); setShowTableMenu(false); }}
          title="Line & Paragraph spacing"
          className={`p-1.5 rounded transition-colors flex items-center gap-0.5 ${
            showSpacingMenu 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800'
          }`}
        >
          <FaArrowsUpDown className="w-3.5 h-3.5" />
          <HiChevronDown className="w-3 h-3 text-gray-400" />
        </button>

        {showSpacingMenu && (
          <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 text-xs animate-fade-in">
            <button
              type="button"
              onClick={() => { editor.chain().focus().setLineHeight('1').run(); setShowSpacingMenu(false); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-between text-gray-700 dark:text-gray-200"
            >
              <span>Single</span>
              {editor.isActive({ lineHeight: '1' }) && <span className="text-blue-600">✓</span>}
            </button>
            <button
              type="button"
              onClick={() => { editor.chain().focus().setLineHeight('1.15').run(); setShowSpacingMenu(false); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-between text-gray-700 dark:text-gray-200"
            >
              <span>1.15</span>
              {editor.isActive({ lineHeight: '1.15' }) && <span className="text-blue-600">✓</span>}
            </button>
            <button
              type="button"
              onClick={() => { editor.chain().focus().setLineHeight('1.5').run(); setShowSpacingMenu(false); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-between text-gray-700 dark:text-gray-200"
            >
              <span>1.5</span>
              {editor.isActive({ lineHeight: '1.5' }) && <span className="text-blue-600">✓</span>}
            </button>
            <button
              type="button"
              onClick={() => { editor.chain().focus().setLineHeight('2').run(); setShowSpacingMenu(false); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-between text-gray-700 dark:text-gray-200"
            >
              <span>Double</span>
              {editor.isActive({ lineHeight: '2' }) && <span className="text-blue-600">✓</span>}
            </button>
            
            <div className="h-[1px] bg-gray-200 dark:bg-slate-700 my-1" />
            
            <button
              type="button"
              onClick={() => { editor.chain().focus().setSpaceBefore('0').run(); setShowSpacingMenu(false); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
            >
              Remove space before paragraph
            </button>
            <button
              type="button"
              onClick={() => { editor.chain().focus().setSpaceAfter('12pt').run(); setShowSpacingMenu(false); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
            >
              Add space after paragraph
            </button>
            
            <div className="h-[1px] bg-gray-200 dark:bg-slate-700 my-1" />
            
            <button
              type="button"
              onClick={() => { setShowSpacingMenu(false); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
            >
              Custom spacing
            </button>
            
            <div className="h-[1px] bg-gray-200 dark:bg-slate-700 my-1" />
            
            <button
              type="button"
              onClick={() => { setShowSpacingMenu(false); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
            >
              Keep with next
            </button>
            <button
              type="button"
              onClick={() => { setShowSpacingMenu(false); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
            >
              Keep lines together
            </button>
            <button
              type="button"
              onClick={() => { setShowSpacingMenu(false); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
            >
              Prevent single lines
            </button>
            <button
              type="button"
              onClick={() => { editor.chain().focus().setHorizontalRule().run(); setShowSpacingMenu(false); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
            >
              Add page break before
            </button>
          </div>
        )}
      </div>

      <Divider />

      {/* Lists */}
      <ToolbarButton
        icon={FaListUl}
        title="Bullet List"
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        icon={FaListOl}
        title="Numbered List"
        isActive={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />

      <Divider />

      {/* Media: Image Upload via Firebase Storage */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileSelect}
        accept="image/*"
        className="hidden"
      />
      <ToolbarButton
        icon={FaImage}
        title="Upload Image to Manuscript (Firebase Storage)"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploadingImage}
      >
        {isUploadingImage && <span className="text-[10px] animate-pulse">Uploading...</span>}
      </ToolbarButton>

      {/* Table & Table Operations Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setShowTableMenu(!showTableMenu); setShowSpacingMenu(false); }}
          title="Table Operations"
          className={`p-1.5 rounded transition-colors flex items-center gap-0.5 ${
            editor.isActive('table') 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800'
          }`}
        >
          <FaTable className="w-3.5 h-3.5" />
          <HiChevronDown className="w-3 h-3 text-gray-400" />
        </button>

        {showTableMenu && (
          <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 text-xs animate-fade-in">
            {!editor.isActive('table') ? (
              <button
                type="button"
                onClick={handleInsertTable}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200"
              >
                <HiPlus className="w-3.5 h-3.5 text-blue-600" /> Insert Table (3×3)
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().addRowBefore().run(); setShowTableMenu(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <FaGripLines className="w-3.5 h-3.5 text-gray-500" /> Add Row Above
                </button>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().addRowAfter().run(); setShowTableMenu(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <FaGripLines className="w-3.5 h-3.5 text-gray-500" /> Add Row Below
                </button>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().deleteRow().run(); setShowTableMenu(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-red-600 flex items-center gap-2"
                >
                  <HiTrash className="w-3.5 h-3.5" /> Delete Row
                </button>
                <div className="h-[1px] bg-gray-200 dark:bg-slate-700 my-1" />
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().addColumnBefore().run(); setShowTableMenu(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <FaGripLinesVertical className="w-3.5 h-3.5 text-gray-500" /> Add Column Left
                </button>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().addColumnAfter().run(); setShowTableMenu(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <FaGripLinesVertical className="w-3.5 h-3.5 text-gray-500" /> Add Column Right
                </button>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().deleteColumn().run(); setShowTableMenu(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-red-600 flex items-center gap-2"
                >
                  <HiTrash className="w-3.5 h-3.5" /> Delete Column
                </button>
                <div className="h-[1px] bg-gray-200 dark:bg-slate-700 my-1" />
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().toggleHeaderRow().run(); setShowTableMenu(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  Toggle Header Row
                </button>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().deleteTable().run(); setShowTableMenu(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 font-semibold flex items-center gap-2"
                >
                  <HiTrash className="w-3.5 h-3.5" /> Delete Table
                </button>
              </>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
