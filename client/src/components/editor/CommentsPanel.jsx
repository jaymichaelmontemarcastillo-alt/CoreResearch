import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { MessageSquare, MoreVertical, Check, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const CommentsPanel = ({ documentId, editor }) => {
  const { userProfile } = useAuth();
  const [comments, setComments] = useState([
    {
      id: 'c1',
      author: 'Professor Cruz',
      text: 'Please clarify this paragraph regarding the methodology.',
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: []
    }
  ]);
  const [newCommentText, setNewCommentText] = useState('');

  const handleAddComment = () => {
    if (!newCommentText.trim() || !editor) return;

    // In a real implementation with Yjs/Tiptap, we would create a custom Mark
    // to anchor this comment to the current text selection (editor.state.selection).
    const newComment = {
      id: `c_${Date.now()}`,
      author: userProfile?.fullName || 'Anonymous',
      text: newCommentText,
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: []
    };

    setComments([...comments, newComment]);
    setNewCommentText('');
  };

  const handleResolve = (id) => {
    setComments(comments.map(c => c.id === id ? { ...c, resolved: true } : c));
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Add New Comment */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 shadow-sm">
        <Textarea
          placeholder="Add a comment to selected text..."
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          className="min-h-[80px] text-sm resize-none mb-2 bg-gray-50 dark:bg-slate-900 border-none"
        />
        <div className="flex justify-end">
          <Button 
            size="sm" 
            variant="primary" 
            onClick={handleAddComment}
            disabled={!newCommentText.trim()}
          >
            <Send className="w-3.5 h-3.5 mr-1.5" /> Comment
          </Button>
        </div>
      </div>

      {/* Comment List */}
      <div className="space-y-3">
        {comments.filter(c => !c.resolved).map(comment => (
          <div key={comment.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:border-blue-300 transition-colors cursor-pointer">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {comment.author.charAt(0)}
                </div>
                <span className="font-semibold text-sm text-gray-900 dark:text-white">{comment.author}</span>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{comment.text}</p>
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
              <button 
                onClick={() => handleResolve(comment.id)}
                className="flex items-center text-xs font-medium text-gray-500 hover:text-emerald-600 transition-colors"
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Resolve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
