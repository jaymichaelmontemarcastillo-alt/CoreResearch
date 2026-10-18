// src/pages/Grading.jsx
import React, { useState, useEffect, useMemo } from "react";
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
  HiTrophy,
  HiUser,
  HiPlusCircle,
  HiCalculator,
  HiCog6Tooth,
  HiTrash,
  HiArrowUp,
  HiArrowDown,
  HiCheckCircle,
  HiExclamationTriangle,
  HiPlus,
  HiAcademicCap,
} from "react-icons/hi2";
import { useAuth } from "../context/AuthContext";

const FALLBACK_DEFAULT_RUBRIC = {
  id: "rubric-v1",
  version: 1,
  title: "Standard Oral Defense & Manuscript Evaluation Rubric",
  description: "Institutional digital rubric for research proposals, oral defense evaluations, and manuscript assessment.",
  isActive: true,
  totalMaxScore: 100,
  criteria: [
    {
      id: "crit-presentation",
      key: "presentation",
      label: "Presentation & Defense Delivery",
      description: "Clarity of presentation, mastery of subject matter, and technical defense Q&A.",
      maxScore: 20,
    },
    {
      id: "crit-methodology",
      key: "methodology",
      label: "Research Methodology & Technical Soundness",
      description: "Soundness of research design, data collection, and algorithmic/experimental procedures.",
      maxScore: 30,
    },
    {
      id: "crit-results",
      key: "results",
      label: "Results, Analysis & System Demonstration",
      description: "Depth of analysis, findings, hardware/software implementation, and statistical validation.",
      maxScore: 30,
    },
    {
      id: "crit-manuscript",
      key: "manuscriptQuality",
      label: "Manuscript Quality & Documentation",
      description: "Organization, academic formatting, citation integrity, and overall document completeness.",
      maxScore: 20,
    },
  ],
};

export const Grading = () => {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "research_coordinator" || role === "coordinator";
  const [evaluations, setEvaluations] = useState([]);
  const [gradeSummary, setGradeSummary] = useState({ averageScore: 0, gradeLetter: "N/A" });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // Active rubric loaded from backend
  const [activeRubric, setActiveRubric] = useState(FALLBACK_DEFAULT_RUBRIC);

  // Fill Evaluation Rubric Modal state
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [evalScores, setEvalScores] = useState({});
  const [evalRemarks, setEvalRemarks] = useState("");
  const [submittingEval, setSubmittingEval] = useState(false);

  // Admin Rubric Management Modal state
  const [rubricModalOpen, setRubricModalOpen] = useState(false);
  const [rubricTitle, setRubricTitle] = useState("");
  const [rubricDesc, setRubricDesc] = useState("");
  const [rubricCriteria, setRubricCriteria] = useState([]);
  const [savingRubric, setSavingRubric] = useState(false);

  // Computed sum for filling evaluation
  const currentComputedTotal = useMemo(() => {
    if (!activeRubric?.criteria) return 0;
    return activeRubric.criteria.reduce((sum, crit) => {
      const val = Number(evalScores[crit.key] || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [evalScores, activeRubric]);

  // Computed sum for admin rubric manager
  const rubricTotalWeight = useMemo(() => {
    return rubricCriteria.reduce((sum, item) => sum + (Number(item.maxScore) || 0), 0);
  }, [rubricCriteria]);

  // Initialize evaluation scores when active rubric or modal opens
  const initEvalScores = (rubric) => {
    const initial = {};
    (rubric?.criteria || []).forEach((c) => {
      initial[c.key] = Math.round(c.maxScore * 0.85); // default suggested 85%
    });
    setEvalScores(initial);
  };

  const fetchActiveRubric = async () => {
    try {
      const res = await api.get("/evaluations/rubrics/active");
      if (res.data && res.data.data) {
        setActiveRubric(res.data.data);
        return res.data.data;
      }
    } catch (err) {
      console.warn("[Grading] fetchActiveRubric error, using fallback:", err);
    }
    return FALLBACK_DEFAULT_RUBRIC;
  };

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const [rubricData, evalRes] = await Promise.all([
        fetchActiveRubric(),
        api.get("/evaluations/project/default-project-1"),
      ]);

      if (evalRes.data && evalRes.data.data) {
        setEvaluations(evalRes.data.data);
      }
      if (evalRes.data) {
        setGradeSummary({
          averageScore: evalRes.data.averageScore || 0,
          gradeLetter: evalRes.data.gradeLetter || "N/A",
        });
      }
      if (rubricData) {
        initEvalScores(rubricData);
      }
    } catch (err) {
      console.error("[Grading] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluations();
  }, []);

  // Open Admin Rubric Management Modal
  const handleOpenRubricManager = () => {
    setRubricTitle(activeRubric?.title || "Research Evaluation Rubric");
    setRubricDesc(activeRubric?.description || "");
    setRubricCriteria(
      (activeRubric?.criteria || []).map((c) => ({
        id: c.id,
        key: c.key,
        label: c.label,
        description: c.description || "",
        maxScore: c.maxScore,
      }))
    );
    setRubricModalOpen(true);
  };

  // Add a new criterion row
  const handleAddCriterion = () => {
    const newIndex = rubricCriteria.length + 1;
    setRubricCriteria([
      ...rubricCriteria,
      {
        id: `crit-${Date.now()}`,
        key: `criterion_${newIndex}`,
        label: `New Criterion ${newIndex}`,
        description: "",
        maxScore: 10,
      },
    ]);
  };

  // Update criterion row field
  const handleCriterionChange = (index, field, value) => {
    setRubricCriteria((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "label" && !updated[index].key) {
        updated[index].key = value.toLowerCase().replace(/[^a-z0-9]/g, "_");
      }
      return updated;
    });
  };

  // Move criterion row up or down
  const handleMoveCriterion = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= rubricCriteria.length) return;
    setRubricCriteria((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  // Remove a criterion row
  const handleRemoveCriterion = (index) => {
    if (rubricCriteria.length <= 1) {
      alert("A rubric must have at least one criterion.");
      return;
    }
    setRubricCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  // Save updated rubric
  const handleSaveRubricSubmit = async (e) => {
    e.preventDefault();
    if (rubricTotalWeight !== 100) {
      alert(`Criteria max scores must total exactly 100. Current total is ${rubricTotalWeight}.`);
      return;
    }

    setSavingRubric(true);
    try {
      const payload = {
        title: rubricTitle.trim() || "Research Evaluation Rubric",
        description: rubricDesc.trim(),
        criteria: rubricCriteria.map((c, i) => ({
          id: c.id || `crit-${Date.now()}-${i}`,
          key: (c.key || c.label || `crit_${i}`).toLowerCase().replace(/[^a-z0-9]/g, "_"),
          label: c.label.trim(),
          description: c.description.trim(),
          maxScore: Number(c.maxScore) || 0,
        })),
      };

      const res = await api.post("/evaluations/rubrics", payload);
      if (res.data && res.data.data) {
        setActiveRubric(res.data.data);
        initEvalScores(res.data.data);
        setToast(`Evaluation Rubric (v${res.data.data.version}) successfully updated and activated!`);
        setRubricModalOpen(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      alert(`Failed to save rubric: ${msg}`);
    } finally {
      setSavingRubric(false);
    }
  };

  // Submit panelist evaluation
  const handleRubricSubmit = async (e) => {
    e.preventDefault();
    setSubmittingEval(true);
    try {
      const payloadScores = {};
      (activeRubric.criteria || []).forEach((c) => {
        payloadScores[c.key] = Number(evalScores[c.key] || 0);
      });

      const res = await api.post("/evaluations", {
        projectId: "default-project-1",
        projectTitle: "Smart IoT Moisture & Nutrient Sensing System",
        scores: payloadScores,
        remarks: evalRemarks,
      });

      setToast(res.data?.message || `Evaluation submitted successfully! Total score: ${currentComputedTotal}/100`);
      setEvalModalOpen(false);
      setEvalRemarks("");
      await fetchEvaluations();
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      alert(`Submission error: ${msg}`);
    } finally {
      setSubmittingEval(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={HiTrophy}
        title="Digital Rubric & Auto-Grading Engine"
        description="Multi-criteria defense evaluation forms, instant weighted score computation, and configurable institutional rubrics."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="md"
                onClick={handleOpenRubricManager}
                className="border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30"
              >
                <HiCog6Tooth className="w-4 h-4 mr-2 text-purple-500" />
                Configure Rubric (v{activeRubric?.version || 1})
              </Button>
            )}
            {(role === "panelist" || isAdmin) && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  initEvalScores(activeRubric);
                  setEvalModalOpen(true);
                }}
              >
                <HiPlusCircle className="w-4 h-4 mr-2" /> Fill Evaluation Rubric
              </Button>
            )}
          </div>
        }
      />

      {toast && <Toast message={toast} variant="success" onClose={() => setToast("")} />}

      {/* Composite Grade Summary Card */}
      <Card className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6">
        <div className="space-y-1">
          <div className="text-xs uppercase font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <HiCalculator className="w-4 h-4" /> Composite Panel Evaluation Grade
          </div>
          <h2 className="text-xl font-medium text-gray-900 dark:text-white">
            Smart IoT Moisture &amp; Nutrient Sensing System
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Candidate: <strong className="text-gray-700 dark:text-gray-300">Alex Rivera</strong> (Computer Science)
            &nbsp;•&nbsp; Active Rubric:{" "}
            <span className="font-semibold text-primary">{activeRubric?.title || "Default Rubric"} (v{activeRubric?.version || 1})</span>
          </p>
        </div>

        <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-gray-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Average Panel Score</div>
            <div className="text-3xl font-medium text-amber-600 dark:text-amber-400">
              {gradeSummary.averageScore}
              <span className="text-sm text-gray-400 dark:text-gray-500">/100</span>
            </div>
          </div>

          <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Transmuted Grade</div>
            <Badge variant="emerald" className="text-xs py-1 px-3 mt-1">
              {gradeSummary.gradeLetter}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Individual Panelist Rubric Scores */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 dark:text-gray-500">Loading evaluation rubrics...</div>
      ) : evaluations.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={HiTrophy}
            title="No Rubrics Submitted Yet"
            description="Panelists will submit digital rubric evaluation forms during the defense presentation."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {evaluations.map((ev) => {
            const criteriaList = ev.criteriaSnapshot || activeRubric.criteria || [];
            return (
              <Card key={ev.id} className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <HiUser className="w-3.5 h-3.5 text-purple-500" /> {ev.panelistName}
                    </div>
                    <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                      Submitted {new Date(ev.submittedAt).toLocaleDateString()} •{" "}
                      <span className="font-mono text-[10px] bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        Rubric v{ev.rubricVersion || 1}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-medium text-gray-900 dark:text-white">
                      {ev.totalScore}
                      <span className="text-xs text-gray-400 dark:text-gray-500">/100</span>
                    </div>
                    <Badge variant={ev.totalScore >= 75 ? "emerald" : "rose"} className="text-[10px]">
                      {ev.totalScore >= 75 ? "PASSED" : "CONDITIONAL"}
                    </Badge>
                  </div>
                </div>

                {/* Dynamic Breakdown Grid from Historical Snapshot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {criteriaList.map((crit) => {
                    const score = ev.scores?.[crit.key] ?? ev.scores?.[crit.id] ?? 0;
                    return (
                      <div
                        key={crit.id || crit.key}
                        className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex justify-between items-center"
                      >
                        <span className="text-gray-600 dark:text-gray-300 truncate pr-2" title={crit.label}>
                          {crit.label} ({crit.maxScore} pts)
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white shrink-0">
                          {score}/{crit.maxScore}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {ev.remarks && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 text-xs text-gray-600 dark:text-gray-300 italic">
                    "{ev.remarks}"
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Fill Evaluation Rubric Modal (Dynamic Criteria Rendering) */}
      <Modal
        isOpen={evalModalOpen}
        onClose={() => setEvalModalOpen(false)}
        title="Fill Defense Evaluation Rubric"
        icon={HiTrophy}
      >
        <form onSubmit={handleRubricSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">
              Active Rubric: <strong>{activeRubric?.title} (v{activeRubric?.version || 1})</strong>
            </span>
            <span className="text-lg font-medium text-amber-600 dark:text-amber-400">
              {currentComputedTotal} / 100
            </span>
          </div>

          {/* Dynamic Criteria Input Fields */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {(activeRubric.criteria || []).map((crit) => (
              <div
                key={crit.key || crit.id}
                className="p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/40 space-y-1.5"
              >
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-900 dark:text-white">
                    {crit.label} <span className="text-gray-500 font-normal">(Max {crit.maxScore} pts)</span>
                  </label>
                  <span className="text-xs font-bold text-primary">
                    {evalScores[crit.key] ?? 0} / {crit.maxScore}
                  </span>
                </div>
                {crit.description && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                    {crit.description}
                  </p>
                )}
                <Input
                  type="number"
                  min="0"
                  max={crit.maxScore}
                  value={evalScores[crit.key] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : Math.min(crit.maxScore, Math.max(0, Number(e.target.value)));
                    setEvalScores((prev) => ({ ...prev, [crit.key]: val }));
                  }}
                  required
                  placeholder={`0 - ${crit.maxScore}`}
                  className="mt-1"
                />
              </div>
            ))}
          </div>

          <Textarea
            label="Panel Evaluation Remarks & Defense Notes"
            rows={3}
            placeholder="Enter remarks on presentation delivery, technical Q&A, and final recommendations..."
            value={evalRemarks}
            onChange={(e) => setEvalRemarks(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setEvalModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submittingEval}>
              Submit Rubric Evaluation ({currentComputedTotal}/100)
            </Button>
          </div>
        </form>
      </Modal>

      {/* Admin Rubric Configuration Modal (Add, Edit, Reorder, Delete, Total=100) */}
      <Modal
        isOpen={rubricModalOpen}
        onClose={() => setRubricModalOpen(false)}
        title={`Configure Research Evaluation Rubric (v${activeRubric?.version || 1})`}
        icon={HiAcademicCap}
      >
        <form onSubmit={handleSaveRubricSubmit} className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Configure criteria, weights, and descriptions. Historical evaluations are preserved and will not be altered.
            Criteria weights must total exactly <strong>100 points</strong>.
          </p>

          <Input
            label="Rubric Title"
            value={rubricTitle}
            onChange={(e) => setRubricTitle(e.target.value)}
            required
            placeholder="e.g. Standard Oral Defense & Manuscript Evaluation Rubric"
          />

          <Textarea
            label="Description / Purpose"
            rows={2}
            value={rubricDesc}
            onChange={(e) => setRubricDesc(e.target.value)}
            placeholder="Institutional rubric scope, target defense types, or scoring instructions..."
          />

          {/* Criteria Management List */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Evaluation Criteria ({rubricCriteria.length} items)
              </h4>
              <Button type="button" variant="outline" size="sm" onClick={handleAddCriterion}>
                <HiPlus className="w-3.5 h-3.5 mr-1" /> Add Criterion
              </Button>
            </div>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
              {rubricCriteria.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/60 space-y-2 relative"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">#{idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveCriterion(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30"
                        title="Move Up"
                      >
                        <HiArrowUp className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCriterion(idx, 1)}
                        disabled={idx === rubricCriteria.length - 1}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30"
                        title="Move Down"
                      >
                        <HiArrowDown className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCriterion(idx)}
                        disabled={rubricCriteria.length <= 1}
                        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-500 disabled:opacity-30 ml-1"
                        title="Delete Criterion"
                      >
                        <HiTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Input
                        label="Criterion Label"
                        value={item.label}
                        onChange={(e) => handleCriterionChange(idx, "label", e.target.value)}
                        required
                        placeholder="e.g. Research Methodology"
                      />
                    </div>
                    <div>
                      <Input
                        label="Max Points"
                        type="number"
                        min="1"
                        max="100"
                        value={item.maxScore}
                        onChange={(e) => handleCriterionChange(idx, "maxScore", Number(e.target.value))}
                        required
                      />
                    </div>
                  </div>

                  <Textarea
                    label="Description & Scoring Guidelines"
                    rows={1}
                    value={item.description}
                    onChange={(e) => handleCriterionChange(idx, "description", e.target.value)}
                    placeholder="Specific expectations, evaluation indicators, or benchmarks..."
                  />
                </div>
              ))}
            </div>

            {/* Total Weight Validator Banner */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
                rubricTotalWeight === 100
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {rubricTotalWeight === 100 ? (
                  <HiCheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <HiExclamationTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <div>
                  <p className="font-bold">Total Max Score: {rubricTotalWeight} / 100</p>
                  <p className="text-[11px] opacity-90">
                    {rubricTotalWeight === 100
                      ? "Score sum equals exactly 100 points. Ready to save and activate."
                      : `Criteria must sum to 100. (Discrepancy: ${rubricTotalWeight > 100 ? "+" : ""}${rubricTotalWeight - 100} pts)`}
                  </p>
                </div>
              </div>
              <Badge variant={rubricTotalWeight === 100 ? "emerald" : "rose"}>
                {rubricTotalWeight === 100 ? "VALID" : "INVALID"}
              </Badge>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setRubricModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={rubricTotalWeight !== 100 || savingRubric}
              isLoading={savingRubric}
            >
              Save &amp; Activate Rubric
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Grading;
