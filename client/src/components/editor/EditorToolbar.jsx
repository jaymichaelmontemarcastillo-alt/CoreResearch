import React from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo, Redo, Image as ImageIcon, Table
} from 'lucide-react';

const ToolbarButton = ({ onClick, isActive = false, disabled = false, icon: Icon, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded-sm transition-colors ${
      isActive 
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' 
        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <Icon className="w-4 h-4" />
  </button>
);

const Divider = () => <div className="w-[1px] h-5 bg-gray-300 dark:bg-slate-700 mx-1 shrink-0" />;

export const EditorToolbar = ({ editor }) => {
  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 overflow-x-auto max-w-full px-2 py-1 scrollbar-hide">
      
      {/* Undo / Redo */}
      <ToolbarButton
        icon={Undo}
        title="Undo"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
      />
      <ToolbarButton
        icon={Redo}
        title="Redo"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
      />

      <Divider />

      {/* Headings */}
      <select 
        value={
          editor.isActive('heading', { level: 1 }) ? 'h1' : 
          editor.isActive('heading', { level: 2 }) ? 'h2' : 
          editor.isActive('heading', { level: 3 }) ? 'h3' : 
          'p'
        }
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'p') editor.chain().focus().setParagraph().run();
          else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
          else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
          else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
        }}
        className="text-sm bg-transparent border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500"
      >
        <option value="p">Normal text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>

      <Divider />

      {/* Text Styles */}
      <ToolbarButton
        icon={Bold}
        title="Bold (Ctrl+B)"
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={Italic}
        title="Italic (Ctrl+I)"
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={Underline}
        title="Underline (Ctrl+U)"
        isActive={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        icon={Strikethrough}
        title="Strikethrough"
        isActive={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      
      <ToolbarButton
        icon={Subscript}
        title="Subscript"
        isActive={editor.isActive('subscript')}
        onClick={() => editor.chain().focus().toggleSubscript().run()}
      />
      <ToolbarButton
        icon={Superscript}
        title="Superscript"
        isActive={editor.isActive('superscript')}
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
      />

      <Divider />

      {/* Text Colors */}
      <input
        type="color"
        title="Text Color"
        onInput={(event) => editor.chain().focus().setColor(event.target.value).run()}
        value={editor.getAttributes('textStyle').color || '#000000'}
        className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
      />
      
      <input
        type="color"
        title="Highlight Color"
        onInput={(event) => editor.chain().focus().toggleHighlight({ color: event.target.value }).run()}
        value={editor.getAttributes('highlight').color || '#ffffff'}
        className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
      />

      <Divider />

      {/* Alignment */}
      <ToolbarButton
        icon={AlignLeft}
        title="Align Left"
        isActive={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      />
      <ToolbarButton
        icon={AlignCenter}
        title="Align Center"
        isActive={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      />
      <ToolbarButton
        icon={AlignRight}
        title="Align Right"
        isActive={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      />
      <ToolbarButton
        icon={AlignJustify}
        title="Justify"
        isActive={editor.isActive({ textAlign: 'justify' })}
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
      />

      <Divider />

      {/* Lists */}
      <ToolbarButton
        icon={List}
        title="Bullet List"
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        icon={ListOrdered}
        title="Numbered List"
        isActive={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />

      <Divider />

      {/* Media & Tables */}
      <ToolbarButton
        icon={ImageIcon}
        title="Insert Image"
        onClick={addImage}
      />
      <ToolbarButton
        icon={Table}
        title="Insert Table"
        onClick={insertTable}
      />
    </div>
  );
};
