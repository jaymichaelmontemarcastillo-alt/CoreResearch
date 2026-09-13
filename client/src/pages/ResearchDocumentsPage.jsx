import React, { useState, useEffect, useRef } from 'react';
import { 
  HiDocumentText, 
  HiArrowUpTray, 
  HiTrash, 
  HiCheckCircle, 
  HiXCircle, 
  HiCog8Tooth,
  HiArrowPath,
  HiMagnifyingGlass
} from 'react-icons/hi2';
import api from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { useConfirm } from '../context/ConfirmContext';

export const ResearchDocumentsPage = () => {
  const { confirm } = useConfirm();
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState({ message: "", variant: "error" });
  
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
      setToast({ variant: 'error', message: 'Failed to load documents.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf') && !file.type.includes('word')) {
      setToast({ variant: 'error', message: 'Only PDF and DOCX files are allowed.' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setToast({ variant: 'error', message: 'File size must be under 10MB.' });
      return;
    }

    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/adviser-research/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        setToast({ variant: 'success', message: 'Document uploaded successfully! It is now being processed.' });
        fetchDocuments(); 
      }
    } catch (err) {
      console.error('Upload error:', err);
      setToast({ variant: 'error', message: err?.response?.data?.message || 'Failed to upload document.' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      setTimeout(() => fetchDocuments(), 3000);
      setTimeout(() => fetchDocuments(), 8000);
    }
  };

  const handleDelete = async (documentId) => {
    const isConfirmed = await confirm({
      title: "Delete Document",
      message: "Are you sure you want to delete this research document?",
      confirmText: "Delete",
      variant: "danger"
    });
    if (!isConfirmed) return;
    
    try {
      await api.delete(`/adviser-research/${documentId}`);
      setToast({ variant: 'success', message: 'Document deleted successfully.' });
      setDocuments(prev => prev.filter(d => d.id !== documentId));
    } catch (err) {
      console.error('Delete error:', err);
      setToast({ variant: 'error', message: 'Failed to delete document.' });
    }
  };

  const handleReprocess = async (documentId) => {
    try {
      setToast({ variant: 'success', message: 'Retrying document processing...' });
      await api.post(`/adviser-research/${documentId}/reprocess`);
      setToast({ variant: 'success', message: 'Document reprocessing started!' });
      setTimeout(() => fetchDocuments(), 3000);
      setTimeout(() => fetchDocuments(), 10000);
      setTimeout(() => fetchDocuments(), 20000);
    } catch (err) {
      console.error('Reprocess error:', err);
      setToast({ variant: 'error', message: err?.response?.data?.message || 'Failed to retry processing.' });
    }
  };

  const getStatusBadge = (status, stage) => {
    const stageLabels = {
      'UPLOADED': 'Uploaded',
      'EXTRACTING_TEXT': 'Extracting Text',
      'ANALYZING_RESEARCH': 'Analyzing NLP',
      'GENERATING_EMBEDDING': 'Generating Embedding',
      'SAVING_RESULTS': 'Saving Results',
      'READY': 'Ready',
      'FAILED': 'Failed'
    };
    const displayStage = stageLabels[stage] || stage || status;

    switch (status) {
      case 'READY':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs rounded-md font-semibold flex items-center gap-1 shrink-0"><HiCheckCircle className="w-3.5 h-3.5"/> Indexed</span>;
      case 'FAILED':
        return <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-xs rounded-md font-semibold flex items-center gap-1 shrink-0"><HiXCircle className="w-3.5 h-3.5"/> Failed</span>;
      default:
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 text-xs rounded-md font-semibold flex items-center gap-1 shrink-0"><HiCog8Tooth className="w-3.5 h-3.5 animate-spin"/> {displayStage}</span>;
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (doc.title && doc.title.toLowerCase().includes(q)) ||
      (doc.originalFilename && doc.originalFilename.toLowerCase().includes(q)) ||
      (doc.abstract && doc.abstract.toLowerCase().includes(q)) ||
      (doc.researchConcepts && doc.researchConcepts.some(c => c.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="space-y-6 font-inter animate-fade-in">
      {toast.message && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast({ message: "", variant: "error" })}
        />
      )}

      <PageHeader
        icon={HiDocumentText}
        title="Research Documents"
        description="Upload your published research papers, journals, or articles (PDF/DOCX). CoreResearch extracts the abstract, methodologies, and concepts from these documents to accurately match you with students based on actual research content."
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Input
            icon={HiMagnifyingGlass}
            placeholder="Search documents, abstracts, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
          />
          <Button
            variant="primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-2 h-10 w-full sm:w-auto justify-center"
          >
            {isUploading ? (
               <><HiCog8Tooth className="w-4 h-4 animate-spin" /> Uploading...</>
            ) : (
               <><HiArrowUpTray className="w-4 h-4" /> Upload Document</>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-64 text-gray-400 space-y-3 font-inter">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Loading documents...</span>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-16 px-4 border-2 border-dashed border-gray-200 dark:border-[#222433] rounded-2xl bg-white dark:bg-[#15161e]">
            <div className="w-16 h-16 mx-auto bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-4">
              <HiDocumentText className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              {documents.length === 0 ? "No research documents yet" : "No matching documents found"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#9396a8] max-w-sm mx-auto">
              {documents.length === 0 
                ? "Upload your first research paper to improve your visibility in the student adviser matching system." 
                : "Try adjusting your search query."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="p-5 bg-white dark:bg-[#1c1d28] border border-gray-100 dark:border-[#222433] rounded-2xl shadow-sm hover:shadow-md transition group flex flex-col sm:flex-row sm:items-start gap-4">
                
                <div className="w-12 h-12 shrink-0 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                  <HiDocumentText className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate" title={doc.originalFilename}>
                      {doc.originalFilename || doc.title}
                    </h3>
                    <div className="shrink-0">
                      {getStatusBadge(doc.processingStatus, doc.processingStage)}
                    </div>
                  </div>
                  
                  {doc.processingStatus === 'FAILED' && doc.processingError && (
                    <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded text-xs text-red-600 dark:text-red-400">
                      <strong>Error:</strong> {doc.processingError}
                    </div>
                  )}

                  {doc.abstract ? (
                    <p className="text-sm text-gray-500 dark:text-[#9396a8] line-clamp-3 mb-4 leading-relaxed">
                      {doc.abstract}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-[#6b6f84] italic mb-4">
                      Abstract extraction pending...
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {(doc.researchConcepts || []).map(concept => (
                      <span key={concept} className="px-2.5 py-1 bg-gray-50 dark:bg-[#252839] border border-gray-200 dark:border-[#2c2f42] text-gray-600 dark:text-[#9396a8] text-[11px] rounded-lg font-medium">
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 flex sm:flex-col gap-2">
                  {doc.processingStatus === 'FAILED' && (
                    <button 
                      onClick={() => handleReprocess(doc.id)}
                      className="p-2.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition bg-gray-50 dark:bg-[#252839] border border-transparent dark:border-[#2c2f42]"
                      title="Retry Processing"
                    >
                      <HiArrowPath className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(doc.id)}
                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition bg-gray-50 dark:bg-[#252839] border border-transparent dark:border-[#2c2f42]"
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

export default ResearchDocumentsPage;
