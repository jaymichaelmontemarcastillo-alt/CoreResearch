import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { HiLink, HiDocumentDuplicate, HiCheck } from 'react-icons/hi2';

export const ShareDialog = ({ documentId, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = () => {
    if (!email) return;
    // In a real implementation, we would update Firestore documentCollaborators here
    alert(`Invited ${email} as Editor`);
    setEmail('');
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Share Manuscript" maxWidth="md">
      <div className="space-y-6">
        
        {/* Invite User */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Add people or groups
          </label>
          <div className="flex items-center gap-2">
            <Input 
              type="email" 
              placeholder="e.g. professor@university.edu" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button variant="primary" onClick={handleInvite} disabled={!email}>
              Invite
            </Button>
          </div>
        </div>

        <div className="h-[1px] bg-gray-200 dark:bg-slate-700 w-full" />

        {/* Existing Collaborators */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">People with access</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  Y
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">You (Owner)</p>
                  <p className="text-xs text-gray-500">you@university.edu</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">Owner</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  M
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Maria Santos</p>
                  <p className="text-xs text-gray-500">maria@university.edu</p>
                </div>
              </div>
              <select className="text-sm border-none bg-transparent text-gray-600 outline-none pr-6">
                <option>Editor</option>
                <option>Commenter</option>
                <option>Viewer</option>
              </select>
            </div>
          </div>
        </div>

        <div className="h-[1px] bg-gray-200 dark:bg-slate-700 w-full" />

        {/* Copy Link */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <HiLink className="w-4 h-4" />
            <span className="text-sm font-medium">Anyone with the link can edit</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-2">
            {copied ? <HiCheck className="w-4 h-4 text-emerald-600" /> : <HiDocumentDuplicate className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>

      </div>
    </Modal>
  );
};
