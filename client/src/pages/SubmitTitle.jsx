// src/pages/SubmitTitle.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import {
  BookOpen,
  CheckCircle2,
  UploadCloud,
  FileText,
  Loader2,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import groupService from "../services/group.service";
import adviserRequestService from "../services/adviserRequest.service";
import researchWorkspaceService from "../services/researchWorkspace.service";
import adviserMatchingService from "../services/adviserMatching.service";
import { MatchingModal } from "../components/adviser/MatchingModal";
import { useConfirm } from "../context/ConfirmContext";

const PROCESSING_STAGES = [
  { id: "uploading", label: "Uploading document...", progress: 15 },
  {
    id: "extracting",
    label: "Extracting text from your document...",
    progress: 35,
  },
  {
    id: "analyzing",
    label: "Analyzing keywords and key phrases...",
    progress: 55,
  },
  { id: "fields", label: "Identifying fields of interest...", progress: 70 },
  { id: "expertise", label: "Identifying research expertise...", progress: 85 },
  { id: "preparing", label: "Preparing adviser matching...", progress: 95 },
  { id: "complete", label: "Processing complete", progress: 100 },
];

export const SubmitTitle = () => {
  const { currentUser, userProfile } = useAuth();
  const { confirm } = useConfirm();
  const navigate = useNavigate();

  // Core State
  const [inputMethod, setInputMethod] = useState("document"); // 'document' | 'manual'
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [toastVariant, setToastVariant] = useState("success");
  const [loading, setLoading] = useState(true);
  const [existingWorkspace, setExistingWorkspace] = useState(null);
  const [existingGroupTitle, setExistingGroupTitle] = useState(null);
  const [isMatchingModalOpen, setIsMatchingModalOpen] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [isRestoredRequest, setIsRestoredRequest] = useState(false);
  const [matchingSession, setMatchingSession] = useState(null);
  const [declinedAdviserIds, setDeclinedAdviserIds] = useState([]);
  const [stateCheckError, setStateCheckError] = useState(null);
  const [retryCounter, setRetryCounter] = useState(0);

  // Document Processing State
  const [processingStage, setProcessingStage] = useState("idle"); // 'idle' | stage_id
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Restore any durable request/session before blocking on the group's title.
  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    const handleRequestUpdates = (requests) => {
      if (!isMounted) return;
      const sortedRequests = [...requests].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const activeRequest = sortedRequests.find(
        (request) =>
          request.status === "pending" || request.status === "accepted",
      );

      if (activeRequest?.status === "accepted") {
        navigate("/research/workspace");
        return;
      }
      if (activeRequest) {
        setExistingGroupTitle(null);
        setPendingRequest(activeRequest);
        setIsRestoredRequest(true);
        setLoading(false);
        return;
      }

      setPendingRequest(null);
      setIsRestoredRequest(false);
      const declinedRequests = sortedRequests.filter(
        (request) => request.status === "declined",
      );
      setDeclinedAdviserIds(
        declinedRequests.map((request) => request.adviserId),
      );
      if (declinedRequests[0]) {
        setTitle(declinedRequests[0].researchTitle || "");
        setDescription(declinedRequests[0].researchDescription || "");
        setInputMethod("manual");
      }
      setLoading(false);
    };

    const attachRequestSubscription = (requestId) => {
      const stops = requestId
        ? []
        : [
            adviserRequestService.subscribeToStudentRequests(
              currentUser.uid,
              handleRequestUpdates,
            ),
          ];
      if (requestId) {
        stops.push(
          adviserRequestService.subscribeToRequest(requestId, (request) => {
            if (!request) {
              setPendingRequest(null);
              setIsRestoredRequest(false);
              return;
            }
            if (request.status === "accepted") {
              navigate("/research/workspace");
            } else if (request.status === "pending") {
              setPendingRequest(request);
              setIsRestoredRequest(true);
            } else {
              setPendingRequest(null);
              setIsRestoredRequest(false);
            }
          }),
        );
      }

      const stopAll = () => stops.forEach((stop) => stop());
      if (isMounted) unsubscribe = stopAll;
      else stopAll();
    };

    const checkExistingState = async () => {
      try {
        setStateCheckError(null);
        const group = await groupService.getGroupByStudentId(currentUser.uid);

        // Check the persisted request before workspace/title checks. The title is
        // written when adviser selection begins, so it must not hide the request.
        const requests =
          await adviserRequestService.getRequestsForStudentOrGroup(
            currentUser.uid,
            group?.id,
          );
        const activeRequest = [...requests]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .find(
            (request) =>
              request.status === "pending" || request.status === "accepted",
          );

        if (activeRequest?.status === "accepted") {
          navigate("/research/workspace");
          return;
        }
        if (activeRequest) {
          if (isMounted) {
            setPendingRequest(activeRequest);
            setIsRestoredRequest(true);
            setLoading(false);
            attachRequestSubscription(activeRequest.id);
          }
          return;
        }

        // Restore the last matching session before treating a saved title as a
        // completed project. The endpoint returns only this authenticated user’s data.
        let session = null;
        try {
          session = await adviserMatchingService.getLatestMatchingSession();
        } catch (sessionError) {
          console.warn(
            "[SubmitTitle] Matching session restore unavailable:",
            sessionError.message,
          );
        }
        if (
          isMounted &&
          session &&
          ["processing", "completed", "failed"].includes(session.status)
        ) {
          setMatchingSession(session);
          setTitle(session.title || "");
          setDescription(session.description || "");
          setInputMethod("manual");
          setIsMatchingModalOpen(true);
          setLoading(false);
          attachRequestSubscription(null);
          return;
        }

        // Check existing workspace only after matching/request restoration.
        let ws = await researchWorkspaceService.getWorkspaceByStudentOrGroup(
          currentUser.uid,
          group?.id,
        );
        if (!ws && group && group.status !== 'forming' && group.title && group.adviserId) {
          try {
            ws = await researchWorkspaceService.getOrCreateWorkspaceForGroup(
              group,
              userProfile,
            );
          } catch (e) {
            console.warn("[SubmitTitle] Auto workspace create error:", e);
          }
        }
        if (ws && ws.status !== 'archived' && !ws.isArchived) {
          if (isMounted) {
            setExistingWorkspace(ws);
            setLoading(false);
          }
          return;
        }

        if (group?.title && group?.status !== 'forming' && isMounted) {
          setExistingGroupTitle({
            title: group.title,
            groupName: group.name,
            adviserName: group.adviserName || "",
          });
          setLoading(false);
          attachRequestSubscription(null);
          return;
        }

        attachRequestSubscription(null);
        if (
          isMounted &&
          requests.some((request) => request.status === "declined" && !request.isArchived)
        ) {
          setDeclinedAdviserIds(
            requests
              .filter((request) => request.status === "declined" && !request.isArchived)
              .map((request) => request.adviserId),
          );
        }
        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.warn("[SubmitTitle] State check warning:", err);
        if (isMounted) {
          setStateCheckError(err.message || "Unable to check active adviser request.");
          setLoading(false);
        }
      }
    };

    if (currentUser?.uid) {
      checkExistingState();
    }

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser, navigate, retryCounter]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setToast("Research title is required.");
      setToastVariant("error");
      return;
    }
    setIsMatchingModalOpen(true);
  };

  const processFile = async (file) => {
    if (!file) return;

    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (
      !validTypes.includes(file.type) &&
      !file.name.match(/\.(pdf|doc|docx)$/i)
    ) {
      setToast("Invalid file type. Please upload a PDF or DOCX file.");
      setToastVariant("error");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setToast("File size exceeds the 50MB limit.");
      setToastVariant("error");
      return;
    }

    setToast("");
    setProcessingStage("uploading");

    // Simulate progress stages while the API call runs
    let currentStageIndex = 0;
    const stageInterval = setInterval(() => {
      currentStageIndex++;
      if (currentStageIndex < PROCESSING_STAGES.length - 1) {
        // stop before 'complete'
        setProcessingStage(PROCESSING_STAGES[currentStageIndex].id);
      }
    }, 1500); // cycle every 1.5s for UX

    try {
      const data = await adviserMatchingService.extractDocument(file);
      clearInterval(stageInterval);
      setProcessingStage("complete");

      // Allow a brief moment to show 100% complete
      await new Promise((res) => setTimeout(res, 600));

      setTitle(data.title || "");
      setDescription(data.abstract || "");
      setProcessingStage("idle");

      // Automatically proceed to matching
      setIsMatchingModalOpen(true);
    } catch (err) {
      clearInterval(stageInterval);
      setToast(err.message || "Failed to extract document.");
      setToastVariant("error");
      setProcessingStage("idle");
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
    return (
      <div className="py-20 text-center text-gray-500">
        Checking research status...
      </div>
    );
  }

  const handleResetWorkspace = async () => {
    if (!existingWorkspace) return;
    const isConfirmed = await confirm({
      title: "Restart Submission",
      message:
        "WARNING: This will permanently delete your current workspace so you can restart the title submission process. Proceed?",
      confirmText: "Restart",
      variant: "danger",
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
          adviserName: "",
        });
      }

      // 3. Delete any associated adviser requests
      const requests = await adviserRequestService.getRequestsForStudentOrGroup(
        currentUser.uid,
        group?.id,
      );
      for (const req of requests) {
        await adviserRequestService.deleteRequest(req.id);
      }

      setToast("Workspace deleted. You can now submit a new title.");
      setToastVariant("success");
      setExistingWorkspace(null);
      setLoading(false);
    } catch (err) {
      setToast("Failed to reset workspace: " + err.message);
      setToastVariant("error");
      setLoading(false);
    }
  };

  if (existingWorkspace) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 mt-8">
        {toast && (
          <Toast
            message={toast}
            variant="success"
            onClose={() => setToast("")}
          />
        )}
        <Card className="p-8 text-center border-t-4 border-t-purple-500">
          <BookOpen className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">
            Workspace Already Active
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You already have an active Research Workspace. You cannot submit a
            new title while a workspace is active.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              variant="primary"
              onClick={() => navigate("/research/workspace")}
            >
              Go to Workspace
            </Button>
            <Button
              variant="outline"
              className="text-red-600 hover:bg-red-50"
              onClick={handleResetWorkspace}
            >
              Abandon Workspace & Restart (Dev Only)
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (existingGroupTitle) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 mt-8">
        <Card className="p-8 text-center border-t-4 border-t-blue-500">
          <BookOpen className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Group Project Already Assigned
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-lg mx-auto text-sm leading-relaxed">
            Your research group (<strong>{existingGroupTitle.groupName}</strong>
            ) is already working on an assigned project:
          </p>
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 max-w-lg mx-auto mb-6 text-left">
            <span className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">
              Research Title
            </span>
            <p className="font-semibold text-gray-900 dark:text-white mt-1 text-sm sm:text-base">
              {existingGroupTitle.title}
            </p>
            {existingGroupTitle.adviserName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Adviser:{" "}
                <strong className="text-gray-800 dark:text-gray-200">
                  {existingGroupTitle.adviserName}
                </strong>
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button
              variant="primary"
              onClick={() => navigate("/research/workspace")}
            >
              Go to Group Workspace
            </Button>
            <Button variant="outline" onClick={() => navigate("/my-group")}>
              View Research Group
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const handleCancelRequest = async () => {
    if (!pendingRequest) return;
    const isConfirmed = await confirm({
      title: "Cancel Request",
      message:
        "Are you sure you want to cancel this request and select another adviser?",
      confirmText: "Cancel Request",
      variant: "danger",
    });
    if (!isConfirmed) return;

    setLoading(true);
    try {
      await adviserRequestService.deleteRequest(pendingRequest.id);

      // Retain the title and description in the input fields
      setTitle(pendingRequest.researchTitle || "");
      setDescription(pendingRequest.researchDescription || "");
      setInputMethod("manual");

      setPendingRequest(null);
      setToast("Request cancelled. You can now submit a new one.");
      setToastVariant("success");
      setLoading(false);
    } catch (err) {
      setToast("Failed to cancel request: " + err.message);
      setToastVariant("error");
      setLoading(false);
    }
  };

  // Get current stage info
  const currentStage =
    PROCESSING_STAGES.find((s) => s.id === processingStage) ||
    PROCESSING_STAGES[0];

  if (stateCheckError && !pendingRequest) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12 mt-8">
        <div className="p-8 text-center space-y-6 rounded-3xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Service Temporarily Unavailable
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-lg mx-auto">
              {stateCheckError}
            </p>
          </div>
          <div className="flex justify-center pt-2">
            <Button
              variant="primary"
              className="px-6 py-2.5 rounded-xl cursor-pointer"
              onClick={() => {
                setLoading(true);
                setStateCheckError(null);
                setRetryCounter((c) => c + 1);
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (pendingRequest) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12 mt-8">
        {toast && (
          <Toast
            message={toast}
            variant={toastVariant}
            onClose={() => setToast("")}
          />
        )}
        <div className="p-8 text-center space-y-6 rounded-3xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Adviser Request Pending
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-lg mx-auto">
              {isRestoredRequest ? (
                `Your existing pending adviser request to ${pendingRequest.adviserName} has been restored. Please wait for the adviser's response.`
              ) : (
                <>
                  Your request has been submitted to{" "}
                  <strong className="text-gray-900 dark:text-white">
                    {pendingRequest.adviserName}
                  </strong>
                  . Once accepted, your Research Workspace will be activated
                  immediately.
                </>
              )}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#15161e] border border-gray-100 dark:border-[#222433] text-left space-y-4 shadow-sm max-w-2xl mx-auto">
            <div>
              <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                Research Title
              </span>
              <p className="font-semibold text-gray-900 dark:text-white mt-1 text-base">
                {pendingRequest.researchTitle}
              </p>
            </div>
            <div>
              <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                Faculty Mentor
              </span>
              <p className="font-medium text-gray-700 dark:text-gray-300 mt-1">
                {pendingRequest.adviserName}{" "}
                <span className="text-blue-500 font-semibold">
                  ({pendingRequest.compatibilityScore}% Compatibility)
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Button
              variant="outline"
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40 px-6 py-2.5 rounded-xl cursor-pointer"
              onClick={handleCancelRequest}
            >
              Cancel Request
            </Button>
            <Button
              variant="primary"
              className="px-6 py-2.5 rounded-xl cursor-pointer"
              onClick={() => setIsMatchingModalOpen(true)}
            >
              View Matching Modal
            </Button>
          </div>
        </div>

        <MatchingModal
          isOpen={isMatchingModalOpen}
          onClose={() => setIsMatchingModalOpen(false)}
          title={title.trim() || pendingRequest?.researchTitle || ""}
          description={description.trim() || pendingRequest?.researchDescription || ""}
          currentUser={currentUser}
          userProfile={userProfile}
          declinedAdviserIds={declinedAdviserIds}
          restoredSession={matchingSession}
          initialPendingRequest={pendingRequest}
          onSuccess={(request) => {
            setToast("Adviser selection submitted successfully.");
            setToastVariant("success");
            setPendingRequest(request);
            setIsRestoredRequest(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {toast && (
        <Toast
          message={toast}
          variant={toastVariant}
          onClose={() => setToast("")}
        />
      )}

      <PageHeader
        icon={BookOpen}
        title="Start Research Workflow"
        description="Provide your research content to find a suitable faculty adviser and activate your workspace."
      />

      <div className="flex flex-col gap-6">
        {/* Input Method Selector */}
        <div className="flex flex-col items-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 font-medium">
            Choose how you want to provide your research content.
          </p>
          <div className="inline-flex bg-gray-100 dark:bg-slate-800 rounded-full p-1 border border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setInputMethod("document");
                setProcessingStage("idle");
                setToast("");
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                inputMethod === "document"
                  ? "bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-slate-600"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Import Document
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMethod("manual");
                setProcessingStage("idle");
                setToast("");
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                inputMethod === "manual"
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-slate-600"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              Enter Content Manually
            </button>
          </div>
        </div>

        {/* Content Area */}
        {inputMethod === "document" ? (
          <Card className="p-8">
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Import Research Document
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Upload your research proposal (PDF or DOCX). We'll
                  automatically extract the text and analyze it to find the best
                  matching advisers.
                </p>
              </div>

              {processingStage === "idle" ? (
                <div
                  className={`mt-6 flex justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors relative cursor-pointer ${
                    isDragging
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                      : "border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="text-center pointer-events-none">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-900/20">
                      <UploadCloud
                        className="h-8 w-8 text-purple-600 dark:text-purple-400"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400 justify-center pointer-events-auto">
                      <span className="font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-500">
                        Upload a file
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                      />
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs leading-5 text-gray-500 dark:text-gray-500 mt-1">
                      PDF or DOCX up to 10MB
                    </p>
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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Enter Research Content
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Provide your approved title and a brief description of your
                research context.
              </p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                  Accepted Research Title{" "}
                  <span className="text-red-500">*</span>
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
                  Short Description / Research Context{" "}
                  <span className="text-red-500">*</span>
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
                    setTitle("");
                    setDescription("");
                    setInputMethod("document");
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
        declinedAdviserIds={declinedAdviserIds}
        restoredSession={matchingSession}
        initialPendingRequest={pendingRequest}
        onSuccess={(request) => {
          setToast("Adviser selection submitted successfully.");
          setToastVariant("success");
          setPendingRequest(request);
          setIsRestoredRequest(false);
        }}
      />
    </div>
  );
};
