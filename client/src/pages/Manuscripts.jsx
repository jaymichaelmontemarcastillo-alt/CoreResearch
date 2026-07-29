// src/pages/Manuscripts.jsx
import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Toast } from "../components/ui/Toast";
import {
  FolderGit2,
  UploadCloud,
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  File,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Manuscripts = () => {
  const { role } = useAuth();
  const [manuscripts, setManuscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Upload form state
  const [versionTag, setVersionTag] = useState("v1.0");
  const [fileName, setFileName] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");

  const fetchManuscripts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/manuscripts/all");
      if (res.data && res.data.data) {
        setManuscripts(res.data.data);
      }
    } catch (err) {
      console.error("[Manuscripts] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManuscripts();
  }, []);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!fileName) return alert("Please enter or select a manuscript file name.");

    setUploading(true);
    try {
      await api.post("/manuscripts", {
        projectId: "proj-501",
        projectTitle: "Smart IoT Moisture & Nutrient Sensing System for Urban Farming",
        versionTag,
        fileName,
        fileSize: 5120000,
        notes,
      });

      setToast(`Manuscript version ${versionTag} uploaded successfully!`);
      setUploadModalOpen(false);
      setFileName("");
      setNotes("");
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
      await fetchManuscripts();
    } catch (err) {
      alert(`Status update error: ${err.message}`);
    }
  };

  const statusBadges = {
    under_review: { label: "Under Review", variant: "amber", icon: Clock },
    revisions_requested: { label: "Revisions Requested", variant: "blue", icon: AlertTriangle },
    approved: { label: "Approved for Defense", variant: "emerald", icon: CheckCircle2 },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FolderGit2}
        title="Manuscript Repository & Version History"
        description="Track manuscript revisions, version history timeline (v1.0, v1.1), and download draft files."
        actions={
          (role === "student" || role === "admin") && (
            <Button variant="primary" size="md" onClick={() => setUploadModalOpen(true)}>
              <UploadCloud className="w-4 h-4 mr-2" /> Upload New Version
            </Button>
          )
        }
      />

      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast("")} />
      )}

      {/* Manuscripts Timeline */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 dark:text-gray-500">
          Loading manuscript versions...
        </div>
      ) : manuscripts.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={FileText}
            title="No Manuscript Uploads Found"
            description="Students can upload PDF/DOCX manuscript drafts to track version history."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {manuscripts.map((ms) => {
            const StatusIcon = statusBadges[ms.status]?.icon || Clock;
            const formattedSize = (ms.fileSize / (1024 * 1024)).toFixed(2);

            return (
              <Card key={ms.id} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400 flex items-center justify-center shrink-0">
                      <File className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="blue" className="font-mono">{ms.versionNumber}</Badge>
                        <Badge variant={statusBadges[ms.status]?.variant || "amber"} className="flex items-center gap-1">
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusBadges[ms.status]?.label || ms.status}
                        </Badge>
                      </div>

                      <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1">{ms.fileName}</h3>

                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>Uploaded by <strong className="text-gray-700 dark:text-gray-300">{ms.uploaderName}</strong></span>
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

                    {(role === "adviser" || role === "admin") && (
                      <select
                        value={ms.status}
                        onChange={(e) => handleStatusUpdate(ms.id, e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs font-semibold text-gray-700 dark:text-gray-300"
                      >
                        <option value="under_review">Under Review</option>
                        <option value="revisions_requested">Revisions Requested</option>
                        <option value="approved">Approve for Defense</option>
                      </select>
                    )}
                  </div>
                </div>

                {ms.notes && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 text-xs text-gray-600 dark:text-gray-300">
                    <strong className="text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px] block mb-0.5">Submission Release Notes:</strong>
                    {ms.notes}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Manuscript Modal Component */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Manuscript Version"
        icon={UploadCloud}
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Version Tag
            </label>
            <div className="flex gap-2">
              {["v1.0", "v1.1", "v2.0", "v2.1"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVersionTag(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition ${
                    versionTag === v
                      ? "bg-primary border-primary text-white"
                      : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400"
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

          <Textarea
            label="Revision Notes & Changes Summary"
            rows={3}
            placeholder="Describe key revisions made in this manuscript version..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={uploading}>
              Submit Version
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
