// src/pages/Grading.jsx
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
  Award,
  User,
  PlusCircle,
  Calculator,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Grading = () => {
  const { role } = useAuth();
  const [evaluations, setEvaluations] = useState([]);
  const [gradeSummary, setGradeSummary] = useState({ averageScore: 0, gradeLetter: "N/A" });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Rubric Scores Form state
  const [presentationScore, setPresentationScore] = useState(18); // max 20
  const [methodologyScore, setMethodologyScore] = useState(26);   // max 30
  const [resultsScore, setResultsScore] = useState(27);           // max 30
  const [manuscriptScore, setManuscriptScore] = useState(18);     // max 20
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const currentComputedTotal =
    Number(presentationScore) +
    Number(methodologyScore) +
    Number(resultsScore) +
    Number(manuscriptScore);

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const res = await api.get("/evaluations/proj-501");
      if (res.data) {
        setEvaluations(res.data.data || []);
        setGradeSummary({
          averageScore: res.data.averageScore || 0,
          gradeLetter: res.data.gradeLetter || "N/A",
        });
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

  const handleRubricSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/evaluations", {
        projectId: "proj-501",
        projectTitle: "Smart IoT Moisture & Nutrient Sensing System for Urban Farming",
        studentName: "Alex Rivera",
        presentation: presentationScore,
        methodology: methodologyScore,
        results: resultsScore,
        manuscriptQuality: manuscriptScore,
        remarks,
      });

      setToast(`Evaluation submitted successfully! Total score: ${currentComputedTotal}/100`);
      setModalOpen(false);
      setRemarks("");
      await fetchEvaluations();
    } catch (err) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Award}
        title="Digital Rubric & Auto-Grading Engine"
        description="Multi-criteria defense evaluation forms, instant weighted score computation, and grade release."
        actions={
          (role === "panelist" || role === "admin") && (
            <Button variant="primary" size="md" onClick={() => setModalOpen(true)}>
              <PlusCircle className="w-4 h-4 mr-2" /> Fill Evaluation Rubric
            </Button>
          )
        }
      />

      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast("")} />
      )}

      {/* Composite Grade Summary Card */}
      <Card className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6">
        <div className="space-y-1">
          <div className="text-xs uppercase font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <Calculator className="w-4 h-4" /> Composite Panel Evaluation Grade
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Smart IoT Moisture & Nutrient Sensing System</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Candidate: <strong className="text-gray-700 dark:text-gray-300">Alex Rivera</strong> (Computer Science)
          </p>
        </div>

        <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-gray-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Average Panel Score</div>
            <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {gradeSummary.averageScore}<span className="text-sm text-gray-400 dark:text-gray-500">/100</span>
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
            icon={Award}
            title="No Rubrics Submitted Yet"
            description="Panelists will submit digital rubric evaluation forms during the defense presentation."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {evaluations.map((ev) => (
            <Card key={ev.id} className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-500" /> {ev.panelistName}
                  </div>
                  <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    Submitted {new Date(ev.submittedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-extrabold text-gray-900 dark:text-white">
                    {ev.totalScore}<span className="text-xs text-gray-400 dark:text-gray-500">/100</span>
                  </div>
                  <Badge variant="emerald" className="text-[10px]">PASSED</Badge>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Presentation (20%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{ev.scores?.presentation}/20</span>
                </div>
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Methodology (30%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{ev.scores?.methodology}/30</span>
                </div>
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Results & Data (30%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{ev.scores?.results}/30</span>
                </div>
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Manuscript (20%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{ev.scores?.manuscriptQuality}/20</span>
                </div>
              </div>

              {ev.remarks && (
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 text-xs text-gray-600 dark:text-gray-300 italic">
                  "{ev.remarks}"
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Fill Evaluation Rubric Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Fill Defense Evaluation Rubric"
        icon={Award}
      >
        <form onSubmit={handleRubricSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">Calculated Composite Score:</span>
            <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{currentComputedTotal} / 100</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Presentation (Max 20)"
              type="number"
              min="0"
              max="20"
              value={presentationScore}
              onChange={(e) => setPresentationScore(e.target.value)}
              required
            />
            <Input
              label="Methodology (Max 30)"
              type="number"
              min="0"
              max="30"
              value={methodologyScore}
              onChange={(e) => setMethodologyScore(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Results & Discussion (Max 30)"
              type="number"
              min="0"
              max="30"
              value={resultsScore}
              onChange={(e) => setResultsScore(e.target.value)}
              required
            />
            <Input
              label="Manuscript Quality (Max 20)"
              type="number"
              min="0"
              max="20"
              value={manuscriptScore}
              onChange={(e) => setManuscriptScore(e.target.value)}
              required
            />
          </div>

          <Textarea
            label="Panel Evaluation Remarks & Defense Notes"
            rows={3}
            placeholder="Enter remarks on presentation delivery, technical Q&A, and final recommendations..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Submit Rubric Evaluation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
