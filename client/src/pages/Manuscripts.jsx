import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  FolderGit2, 
  UploadCloud, 
  Download, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  User, 
  File, 
  Check 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Manuscripts = () => {
  const { role, userProfile } = useAuth();
  const [manuscripts, setManuscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
  // Upload form state
  const [versionTag, setVersionTag] = useState('v1.0');
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');

  const fetchManuscripts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/manuscripts/all');
      if (res.data && res.data.data) {
        setManuscripts(res.data.data);
      }
    } catch (err) {
      console.error('[Manuscripts] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManuscripts();
  }, []);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!fileName) return alert('Please enter or select a manuscript file name.');

    setUploading(true);
    try {
      await api.post('/manuscripts', {
        projectId: 'proj-501',
        projectTitle: 'Smart IoT Moisture & Nutrient Sensing System for Urban Farming',
        versionTag,
        fileName,
        fileSize: 5120000,
        notes
      });

      setToast(`Manuscript version ${versionTag} uploaded successfully!`);
      setTimeout(() => setToast(''), 4000);
      setUploadModalOpen(false);
      setFileName('');
      setNotes('');
      await fetchManuscripts();
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleStatusUpdate = async (manuscriptId, newStatus) => {
    try {
      await api.patch(`/manuscripts/${manuscriptId}/status`, { status: newStatus });
      setToast(`Manuscript status updated to ${newStatus.toUpperCase()}`);
      setTimeout(() => setToast(''), 3000);
      await fetchManuscripts();
    } catch (err) {
      alert(`Status update error: ${err.message}`);
    }
  };

  const statusBadges = {
    under_review: { label: 'Under Review', variant: 'amber', icon: Clock },
    revisions_requested: { label: 'Revisions Requested', variant: 'blue', icon: AlertTriangle },
    approved: { label: 'Approved for Defense', variant: 'emerald', icon: CheckCircle2 }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <FolderGit2 className="w-6 h-6 text-blue-400" /> Manuscript Repository & Version History
          </h1>
          <p className="text-xs text-slate-400 mt-1">Track manuscript revisions, version history timeline (v1.0, v1.1), and download draft files.</p>
        </div>

        {(role === 'student' || role === 'admin') && (
          <Button variant="primary" size="md" onClick={() => setUploadModalOpen(true)}>
            <UploadCloud className="w-4 h-4 mr-2" /> Upload New Version
          </Button>
        )}
      </div>

      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Manuscripts Timeline */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading manuscript versions...</div>
      ) : manuscripts.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Manuscript Uploads Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Students can upload PDF/DOCX manuscript drafts to track version history.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {manuscripts.map((ms) => {
            const StatusIcon = statusBadges[ms.status]?.icon || Clock;
            const formattedSize = (ms.fileSize / (1024 * 1024)).toFixed(2);

            return (
              <Card key={ms.id} className="border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <File className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="blue" className="font-mono">{ms.versionNumber}</Badge>
                        <Badge variant={statusBadges[ms.status]?.variant || 'amber'} className="flex items-center gap-1">
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusBadges[ms.status]?.label || ms.status}
                        </Badge>
                      </div>

                      <h3 className="text-base font-bold text-white mt-1">{ms.fileName}</h3>
                      
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span>Uploaded by <strong className="text-slate-200">{ms.uploaderName}</strong></span>
                        <span>•</span>
                        <span>{formattedSize} MB</span>
                        <span>•</span>
                        <span>{new Date(ms.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a href={ms.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Download File
                      </Button>
                    </a>

                    {(role === 'adviser' || role === 'admin') && (
                      <select
                        value={ms.status}
                        onChange={(e) => handleStatusUpdate(ms.id, e.target.value)}
                        className="glass-input rounded-xl py-1.5 px-2 text-xs font-semibold bg-slate-900 border border-slate-700"
                      >
                        <option value="under_review">Under Review</option>
                        <option value="revisions_requested">Revisions Requested</option>
                        <option value="approved">Approve for Defense</option>
                      </select>
                    )}
                  </div>
                </div>

                {ms.notes && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                    <strong className="text-slate-400 uppercase tracking-wider text-[10px] block mb-0.5">Submission Release Notes:</strong>
                    {ms.notes}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Manuscript Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-400" /> Upload Manuscript Version
              </h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-white text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Version Tag
                </label>
                <div className="flex gap-2">
                  {['v1.0', 'v1.1', 'v2.0', 'v2.1'].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVersionTag(v)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition ${
                        versionTag === v ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Manuscript File Name (.pdf / .docx)"
                type="text"
                placeholder="e.g. CoreResearch_Manuscript_v1.1.pdf"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Revision Notes & Changes Summary
                </label>
                <textarea
                  rows={3}
                  className="w-full glass-input rounded-xl text-sm p-3"
                  placeholder="Describe key revisions made in this manuscript version..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setUploadModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={uploading}>
                  Submit Version
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
