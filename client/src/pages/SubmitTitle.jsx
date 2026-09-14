// src/pages/SubmitTitle.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast } from '../components/ui/Toast';
import { BookOpen, CheckCircle2, UploadCloud, FileText, Loader2, Check, X, AlertCircle } from 'lucide-react';
import groupService from '../services/group.service';
import adviserRequestService from '../services/adviserRequest.service';
import researchWorkspaceService from '../services/researchWorkspace.service';
import adviserMatchingService from '../services/adviserMatching.service';
import { MatchingModal } from '../components/adviser/MatchingModal';
import { useConfirm } from '../context/ConfirmContext';

const PROCESSING_STAGES = [
  { id: 'uploading', label: 'Uploading document...', progress: 15 },
  { id: 'extracting', label: 'Extracting text from your document...', progress: 35 },
  { id: 'analyzing', label: 'Analyzing keywords and key phrases...', progress: 55 },
  { id: 'fields', label: 'Identifying fields of interest...', progress: 70 },
  { id: 'expertise', label: 'Identifying research expertise...', progress: 85 },
  { id: 'preparing', label: 'Preparing adviser matching...', progress: 95 },
  { id: 'complete', label: 'Processing complete', progress: 100 },
];

export const SubmitTitle = () => {
  const { currentUser, userProfile } = useAuth();
  const { confirm } = useConfirm();
  const navigate = useNavigate();

  // Core State
  const [inputMethod, setInputMethod] = useState('document'); // 'document' | 'manual'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [existingWorkspace, setExistingWorkspace] = useState(null);
  const [isMatchingModalOpen, setIsMatchingModalOpen] = useState(false);

  // Document Processing State
  const [processingStage, setProcessingStage] = useState('idle'); // 'idle' | stage_id
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Before allowing submission, check if student already has a pending/accepted request or workspace
  useEffect(() => {
    const checkExistingState = async () => {
      try {
        const group = await groupService.getGroupByStudentId(currentUser.uid);
        
        // 1. Check Workspace
        const ws = await researchWorkspaceService.getWorkspaceByStudentOrGroup(currentUser.uid, group?.id);
        if (ws) {
          setExistingWorkspace(ws);
          setLoading(false);
          return;
        }

        // 2. Check existing Adviser Requests
        const requests = await adviserRequestService.getRequestsForStudentOrGroup(currentUser.uid, group?.id);
        const activeRequest = requests.find(r => r.status === 'pending' || r.status === 'accepted');
        if (activeRequest) {
          if (activeRequest.status === 'accepted') {
            navigate('/research/workspace');
            return;
          }
          // Set title & open modal
          setTitle(activeRequest.researchTitle || '');
          setDescription(activeRequest.researchDescription || '');
          setIsMatchingModalOpen(true);
        }

        setLoading(false);
      } catch (err) {
        setToast('Failed to verify state: ' + err.message);
        setLoading(false);
      }
    };

    if (currentUser?.uid) {
      checkExistingState();
    }
  }, [currentUser, navigate]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setToast('Research title is required.');
      return;
    }
    setIsMatchingModalOpen(true);
  };

  const processFile = async (file) => {
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
      setToast('Invalid file type. Please upload a PDF or DOCX file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setToast('File size exceeds the 10MB limit.');
      return;
    }

    setToast('');
    setProcessingStage('uploading');

    // Simulate progress stages while the API call runs
    let currentStageIndex = 0;
    const stageInterval = setInterval(() => {
      currentStageIndex++;
      if (currentStageIndex < PROCESSING_STAGES.length - 1) { // stop before 'complete'
        setProcessingStage(PROCESSING_STAGES[currentStageIndex].id);
      }
    }, 1500); // cycle every 1.5s for UX

    try {
      const data = await adviserMatchingService.extractDocument(file);
      clearInterval(stageInterval);
      setProcessingStage('complete');
      
      // Allow a brief moment to show 100% complete
      await new Promise(res => setTimeout(res, 600));
      
      setTitle(data.title || '');
      setDescription(data.abstract || '');
      setProcessingStage('idle');
      
      // Automatically proceed to matching
      setIsMatchingModalOpen(true);
    } catch (err) {
      clearInterval(stageInterval);
      setToast(err.message || 'Failed to extract document.');
      setProcessingStage('idle');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-gray-500">Checking research status...</div>;
  }

  const handleResetWorkspace = async () => {
    if (!existingWorkspace) return;
    const isConfirmed = await confirm({
      title: "Restart Submission",
      message: "WARNING: This will permanently delete your current workspace so you can restart the title submission process. Proceed?",
      confirmText: "Restart",
      variant: "danger"
    });
    if (!isConfirmed) return;

    setLoading(true);
    try {
      // 1. Delete Workspace
      await researchWorkspaceService.deleteWorkspace(existingWorkspace.id);
      
      // 2. Fetch Group and clear adviser fields
      const group = await groupService.getGroupByStudentId(currentUser.uid);
      if (group) {
        await groupService.updateGroup(group.id, {
          adviserId: "",
          adviserName: ""
        });
      }

      // 3. Delete any associated adviser requests
      const requests = await adviserRequestService.getRequestsForStudentOrGroup(currentUser.uid, group?.id);
      for (const req of requests) {
        await adviserRequestService.deleteRequest(req.id);
      }

      setToast('Workspace deleted. You can now submit a new title.');
      setExistingWorkspace(null);
      setLoading(false);
    } catch (err) {
      setToast('Failed to reset workspace: ' + err.message);
      setLoading(false);
    }
  };

  if (existingWorkspace) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 mt-8">
        {toast && <Toast message={toast} variant="success" onClose={() => setToast('')} />}
        <Card className="p-8 text-center border-t-4 border-t-purple-500">
          <BookOpen className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">Workspace Already Active</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You already have an active Research Workspace. You cannot submit a new title while a workspace is active.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button variant="primary" onClick={() => navigate('/research/workspace')}>
              Go to Workspace
            </Button>
            <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={handleResetWorkspace}>
              Abandon Workspace & Restart (Dev Only)
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Get current stage info
  const currentStage = PROCESSING_STAGES.find(s => s.id === processingStage) || PROCESSING_STAGES[0];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {toast && <Toast message={toast} variant="error" onClose={() => setToast('')} />}

      <PageHeader
        icon={BookOpen}
        title="Start Research Workflow"
        description="Provide your research content to find a suitable faculty adviser and activate your workspace."
      />

      <div className="flex flex-col gap-6">
        {/* Input Method Selector */}
        <div className="flex flex-col items-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 font-medium">Choose how you want to provide your research content.</p>
          <div className="inline-flex bg-gray-100 dark:bg-slate-800 rounded-full p-1 border border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => { setInputMethod('document'); setProcessingStage('idle'); setToast(''); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                inputMethod === 'document'
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-slate-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Import Document
            </button>
            <button
              type="button"
              onClick={() => { setInputMethod('manual'); setProcessingStage('idle'); setToast(''); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                inputMethod === 'manual'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-slate-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Enter Content Manually
            </button>
          </div>
        </div>

        {/* Content Area */}
        {inputMethod === 'document' ? (
          <Card className="p-8">
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Import Research Document</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Upload your research proposal (PDF or DOCX). We'll automatically extract the text and analyze it to find the best matching advisers.</p>
              </div>

              {processingStage === 'idle' ? (
                <div 
                  className={`mt-6 flex justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors relative cursor-pointer ${
                    isDragging 
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                      : 'border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="text-center pointer-events-none">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-900/20">
                      <UploadCloud className="h-8 w-8 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                    </div>
                    <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400 justify-center pointer-events-auto">
                      <span className="font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-500">
                        Upload a file
                      </span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" ref={fileInputRef} onChange={handleFileUpload} />
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs leading-5 text-gray-500 dark:text-gray-500 mt-1">PDF or DOCX up to 10MB</p>
                  </div>
                </div>
              ) : (
                <div className="mt-10 mb-6 max-w-md mx-auto text-center">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-6">
                    Processing your research document...
                  </h3>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden border border-gray-200 dark:border-slate-600">
                      <div 
                        className="bg-purple-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${currentStage.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 min-w-[3rem]">
                      {currentStage.progress}%
                    </span>
                  </div>
                  
                  <div className="h-6">
                    <p className="text-sm text-gray-600 dark:text-gray-300 animate-pulse">
                      {currentStage.label}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Enter Research Content</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Provide your approved title and a brief description of your research context.</p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                  Accepted Research Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Development of an Online Research Management System"
                  className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                  Short Description / Research Context <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Type or paste your research abstract, problem statement, or context here..."
                  rows={6}
                  required
                  className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white custom-scrollbar"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setTitle('');
                    setDescription('');
                    setInputMethod('document');
                  }}
                  className="text-gray-500"
                >
                  Exit
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={!title.trim() || !description.trim()}
                >
                  Find Advisers
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>

      <MatchingModal
        isOpen={isMatchingModalOpen}
        onClose={() => setIsMatchingModalOpen(false)}
        title={title.trim()}
        description={description.trim()}
        currentUser={currentUser}
        userProfile={userProfile}
        onSuccess={() => {
          setToast('Adviser selection submitted successfully.');
        }}
      />
    </div>
  );
};
