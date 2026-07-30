// src/pages/SubmitProposal.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { FileText, ArrowLeft, Send, Save, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTitleProposal } from "../hooks/useTitleProposal";
import titleProposalService from "../services/titleProposal.service";

const RESEARCH_CATEGORIES = [
  "Artificial Intelligence & Machine Learning",
  "Web & Mobile Application Systems",
  "Internet of Things & Embedded Systems",
  "Cybersecurity & Data Privacy",
  "Data Science & Big Data Analytics",
  "Software Engineering & Architecture",
  "Computer Networks & Cloud Computing",
];

export const SubmitProposal = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const studentId = currentUser?.uid || userProfile?.uid || "";
  const studentName = userProfile?.fullName || `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim() || currentUser?.email || "Student";
  const groupId = userProfile?.groupId || studentId;

  const { submitProposal, updateProposal } = useTitleProposal();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    rationale: "",
    objectives: "",
    scopeAndDelimitation: "",
    methodology: "",
    researchCategory: RESEARCH_CATEGORIES[0],
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(Boolean(editId));
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  // Pre-fill form if editing an existing proposal
  useEffect(() => {
    if (!editId) return;

    const loadExistingProposal = async () => {
      setFetching(true);
      setError("");
      try {
        const proposal = await titleProposalService.getProposalById(editId);
        if (!proposal) {
          setError("Proposal not found.");
          return;
        }

        // Verify edit permissions (only pending or revisions_required)
        if (proposal.status !== "pending" && proposal.status !== "revisions_required") {
          setError("This proposal cannot be edited because it is already under review or approved.");
          return;
        }

        setFormData({
          title: proposal.title || "",
          rationale: proposal.rationale || proposal.abstract || "",
          objectives: proposal.objectives || "",
          scopeAndDelimitation: proposal.scopeAndDelimitation || "",
          methodology: proposal.methodology || "",
          researchCategory: proposal.researchCategory || RESEARCH_CATEGORIES[0],
        });
      } catch (err) {
        setError(`Failed to load proposal for editing: ${err.message}`);
      } finally {
        setFetching(false);
      }
    };

    loadExistingProposal();
  }, [editId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = "Research Title is required.";
    if (!formData.rationale.trim()) errors.rationale = "Rationale / Background is required.";
    if (!formData.objectives.trim()) errors.objectives = "Objectives are required.";
    if (!formData.scopeAndDelimitation.trim()) errors.scopeAndDelimitation = "Scope and Delimitation are required.";
    if (!formData.methodology.trim()) errors.methodology = "Methodology is required.";
    if (!formData.researchCategory) errors.researchCategory = "Research Category is required.";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      setError("Please fill out all mandatory fields before submitting.");
      return;
    }

    setLoading(true);

    try {
      if (editId) {
        // Update mode
        await updateProposal(editId, {
          title: formData.title.trim(),
          rationale: formData.rationale.trim(),
          abstract: formData.rationale.trim(),
          objectives: formData.objectives.trim(),
          scopeAndDelimitation: formData.scopeAndDelimitation.trim(),
          methodology: formData.methodology.trim(),
          researchCategory: formData.researchCategory,
        });
      } else {
        // Create mode
        await submitProposal({
          title: formData.title.trim(),
          rationale: formData.rationale.trim(),
          abstract: formData.rationale.trim(),
          objectives: formData.objectives.trim(),
          scopeAndDelimitation: formData.scopeAndDelimitation.trim(),
          methodology: formData.methodology.trim(),
          researchCategory: formData.researchCategory,
          studentId,
          studentName,
          submittedBy: studentName,
          groupId,
          department: userProfile?.department || "Computer Studies",
        });
      }

      navigate("/proposals");
    } catch (err) {
      setError(err.message || "Failed to submit proposal.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="py-12 text-center text-gray-400 dark:text-gray-500">
        Loading proposal data...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/proposals"
          className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Proposals
        </Link>
      </div>

      <Card className="space-y-6">
        <div className="border-b border-gray-200 dark:border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            {editId ? "Edit Research Title Proposal" : "Submit Research Title Proposal"}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Fill out all mandatory fields below to submit a title proposal for your research group.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Research Title */}
          <div>
            <Input
              label="Research Title *"
              type="text"
              placeholder="e.g. Smart IoT Moisture Sensing Platform for Precision Agriculture"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
            />
            {validationErrors.title && (
              <p className="mt-1 text-xs text-red-500 font-medium">{validationErrors.title}</p>
            )}
          </div>

          {/* Research Category */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Research Category *
            </label>
            <select
              value={formData.researchCategory}
              onChange={(e) => handleChange("researchCategory", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {RESEARCH_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {validationErrors.researchCategory && (
              <p className="mt-1 text-xs text-red-500 font-medium">{validationErrors.researchCategory}</p>
            )}
          </div>

          {/* Rationale / Background */}
          <div>
            <Textarea
              label="Rationale / Background *"
              rows={4}
              placeholder="Explain the background problem, significance of the study, and motivations..."
              value={formData.rationale}
              onChange={(e) => handleChange("rationale", e.target.value)}
            />
            {validationErrors.rationale && (
              <p className="mt-1 text-xs text-red-500 font-medium">{validationErrors.rationale}</p>
            )}
          </div>

          {/* Objectives */}
          <div>
            <Textarea
              label="Specific Research Objectives *"
              rows={4}
              placeholder="1. Design the IoT sensor node architecture&#10;2. Implement machine learning anomaly detection&#10;3. Validate system accuracy..."
              value={formData.objectives}
              onChange={(e) => handleChange("objectives", e.target.value)}
            />
            {validationErrors.objectives && (
              <p className="mt-1 text-xs text-red-500 font-medium">{validationErrors.objectives}</p>
            )}
          </div>

          {/* Scope and Delimitation */}
          <div>
            <Textarea
              label="Scope and Delimitation *"
              rows={4}
              placeholder="Define the boundary of the project, target audience, limitations, and excluded features..."
              value={formData.scopeAndDelimitation}
              onChange={(e) => handleChange("scopeAndDelimitation", e.target.value)}
            />
            {validationErrors.scopeAndDelimitation && (
              <p className="mt-1 text-xs text-red-500 font-medium">{validationErrors.scopeAndDelimitation}</p>
            )}
          </div>

          {/* Methodology */}
          <div>
            <Textarea
              label="Methodology *"
              rows={4}
              placeholder="Detail the research framework, design approach, system architecture, data collection, and testing strategies..."
              value={formData.methodology}
              onChange={(e) => handleChange("methodology", e.target.value)}
            />
            {validationErrors.methodology && (
              <p className="mt-1 text-xs text-red-500 font-medium">{validationErrors.methodology}</p>
            )}
          </div>

          {/* Submission Buttons */}
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
            <Link to="/proposals">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="primary" isLoading={loading}>
              {editId ? (
                <>
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" /> Submit Proposal
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default SubmitProposal;
