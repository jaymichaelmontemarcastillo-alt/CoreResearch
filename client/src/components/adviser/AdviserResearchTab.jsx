import React, { useState, useEffect, useRef } from 'react';
import { 
  HiDocumentText, 
  HiArrowUpTray, 
  HiTrash, 
  HiCheckCircle, 
  HiXCircle, 
  HiCog8Tooth,
  HiArrowPath 
} from 'react-icons/hi2';
import api from '../../services/api';

export const AdviserResearchTab = () => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [feedback, setFeedback] = useState(null);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/adviser-research/me');
      if (res.data.success) {
        setDocuments(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch research documents:', err);
      setFeedback({ type: 'error', message: 'Failed to load documents.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf') && !file.type.includes('word')) {
      setFeedback({ type: 'error', message: 'Only PDF and DOCX files are allowed.' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'File size must be under 10MB.' });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);
      
      const formData = new FormData();
      formData.append('file', file);

      // We fake progress since axios doesn't support it cleanly with our fetch wrapper out of the box, 
      // but if api is axios, we can do it. Assuming it's standard fetch/axios wrapper:
      setUploadProgress(50);
      const res = await api.post('/adviser-research/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadProgress(100);
      if (res.data.success) {
        setFeedback({ type: 'success', message: 'Document uploaded successfully! It is now being processed.' });
        fetchDocuments(); // Refresh list to show the new document
      }
    } catch (err) {
      console.error('Upload error:', err);
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Failed to upload document.' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Auto-refresh periodically if we have processing documents
      setTimeout(() => fetchDocuments(), 3000);
      setTimeout(() => fetchDocuments(), 8000);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this research document?')) return;
    
    try {
      await api.delete(`/adviser-research/${documentId}`);
      setFeedback({ type: 'success', message: 'Document deleted successfully.' });
      setDocuments(prev => prev.filter(d => d.id !== documentId));
    } catch (err) {
      console.error('Delete error:', err);
      setFeedback({ type: 'error', message: 'Failed to delete document.' });
    }
  };

  const handleReprocess = async (documentId) => {
    try {
      setFeedback({ type: 'success', message: 'Retrying document processing...' });
      await api.post(`/adviser-research/${documentId}/reprocess`);
      setFeedback({ type: 'success', message: 'Document reprocessing started!' });
      // Poll for updates
      setTimeout(() => fetchDocuments(), 3000);
      setTimeout(() => fetchDocuments(), 10000);
      setTimeout(() => fetchDocuments(), 20000);
    } catch (err) {
      console.error('Reprocess error:', err);
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Failed to retry processing.' });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'READY':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs rounded-md font-semibold flex items-center gap-1"><HiCheckCircle className="w-3.5 h-3.5"/> Indexed</span>;
      case 'FAILED':
        return <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-xs rounded-md font-semibold flex items-center gap-1"><HiXCircle className="w-3.5 h-3.5"/> Failed</span>;
      default:
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 text-xs rounded-md font-semibold flex items-center gap-1"><HiCog8Tooth className="w-3.5 h-3.5 animate-spin"/> Processing</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="pb-4 border-b border-gray-100 dark:border-[#222433] flex justify-between items-start">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HiDocumentText className="w-5 h-5 text-blue-500" />
            Research Documents
          </h2>
          <p className="text-xs text-gray-500 dark:text-[#9396a8] mt-1 max-w-xl">
            Upload your published research papers, journals, or articles (PDF/DOCX). 
            CoreResearch extracts the abstract, methodologies, and concepts from these documents to accurately match you with students based on actual research content.
          </p>
        </div>
        
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl flex items-center gap-2 shadow-sm disabled:opacity-50 transition"
          >
            {isUploading ? (
               <><HiCog8Tooth className="w-4 h-4 animate-spin" /> Uploading...</>
            ) : (
               <><HiArrowUpTray className="w-4 h-4" /> Upload Document</>
            )}
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-fade-in ${
          feedback.type === "success"
            ? "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300"
            : "bg-red-50 border border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
        }`}>
          {feedback.type === "success" ? <HiCheckCircle className="w-5 h-5 shrink-0" /> : <HiXCircle className="w-5 h-5 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Document List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-10 text-gray-500">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 px-4 border-2 border-dashed border-gray-200 dark:border-[#222433] rounded-2xl">
            <div className="w-16 h-16 mx-auto bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-4">
              <HiDocumentText className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No research documents yet</h3>
            <p className="text-xs text-gray-500 dark:text-[#9396a8] max-w-sm mx-auto">
              Upload your first research paper to improve your visibility in the student adviser matching system.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 bg-white dark:bg-[#1c1d28] border border-gray-100 dark:border-[#222433] rounded-2xl shadow-sm hover:shadow-md transition group flex flex-col sm:flex-row sm:items-start gap-4">
                
                {/* Icon */}
                <div className="w-12 h-12 shrink-0 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                  <HiDocumentText className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={doc.originalFilename}>
                      {doc.originalFilename || doc.title}
                    </h3>
                    {getStatusBadge(doc.processingStatus)}
                  </div>
                  
                  {doc.abstract ? (
                    <p className="text-xs text-gray-500 dark:text-[#9396a8] line-clamp-2 mb-3">
                      {doc.abstract}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-[#6b6f84] italic mb-3">
                      Abstract extraction pending...
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {(doc.researchConcepts || []).slice(0, 3).map(concept => (
                      <span key={concept} className="px-2 py-0.5 bg-gray-100 dark:bg-[#252839] text-gray-600 dark:text-[#9396a8] text-[10px] rounded font-medium">
                        {concept}
                      </span>
                    ))}
                    {(doc.researchConcepts?.length > 3) && (
                      <span className="px-2 py-0.5 bg-gray-50 dark:bg-[#15161e] text-gray-400 dark:text-[#6b6f84] text-[10px] rounded font-medium">
                        +{doc.researchConcepts.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex sm:flex-col gap-2">
                  {doc.processingStatus === 'FAILED' && (
                    <button 
                      onClick={() => handleReprocess(doc.id)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition"
                      title="Retry Processing"
                    >
                      <HiArrowPath className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                    title="Delete Document"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
