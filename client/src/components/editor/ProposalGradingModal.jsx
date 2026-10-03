// src/components/editor/ProposalGradingModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Calculator, Loader2, ClipboardCheck, Download, Printer } from 'lucide-react';
import { Button } from '../ui/Button';
import { buildProposalPrintHTML } from '../../utils/proposalPrintTemplate';

const MAX_SCORES = {
  format: 7,
  researchProblems: 8,
  relatedLiterature: 7,
  methodology: 8,
  presentation: 15,
  defense: 15,
  innovation: 15,
  application: 15,
  impact: 10,
};

const INITIAL_SCORES = {
  format: '',
  researchProblems: '',
  relatedLiterature: '',
  methodology: '',
  presentation: '',
  defense: '',
  innovation: '',
  application: '',
  impact: '',
};

/**
 * Proposal Defense Rating Sheet Modal
 *
 * Props:
 *  isOpen        - boolean
 *  onClose       - () => void
 *  onSubmit      - async (payload: SubmitProposalEvaluationInput) => void
 *  defenseType   - 'proposal_defense' | 'final_defense' | undefined
 *  defenseId     - string  (the defense schedule ID)
 *  panelistId    - string  (currentUser.uid)
 *  panelistName  - string
 *  groupDetails  - { adviser, expert, title, date, time, groupNo, proponents[] }
 *  existingEval  - ProposalEvaluation | null  (pre-loaded from Firestore)
 */
export const ProposalGradingModal = ({
  isOpen,
  onClose,
  onSubmit,
  defenseType,
  defenseId,
  panelistId,
  panelistName,
  groupDetails,
  existingEval = null,
  readOnly = false,
}) => {
  const [scores, setScores] = useState(INITIAL_SCORES);
  const [totals, setTotals] = useState({ manuscript: 0, oral: 0, project: 0, overall: 0 });
  const [verdict, setVerdict] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Editable metadata — pre-filled from groupDetails, panelist can adjust
  const [meta, setMeta] = useState({
    adviser: '',
    expert: '',
    title: '',
    proponents: '',
    groupNo: '',
    date: '',
    time: '',
  });

  // Sync metadata when groupDetails or isOpen changes
  useEffect(() => {
    setMeta({
      adviser: groupDetails?.adviser || '',
      expert: groupDetails?.expert || '',
      title: groupDetails?.title || '',
      proponents: Array.isArray(groupDetails?.proponents)
        ? groupDetails.proponents.join(', ')
        : groupDetails?.proponents || '',
      groupNo: groupDetails?.groupNo || '',
      date: groupDetails?.date || '',
      time: groupDetails?.time || '',
    });
  }, [groupDetails, isOpen]);

  // Pre-fill scores if we have an existing evaluation
  useEffect(() => {
    if (existingEval) {
      const s = existingEval.scores || {};
      setScores({
        format: s.format ?? '',
        researchProblems: s.researchProblems ?? '',
        relatedLiterature: s.relatedLiterature ?? '',
        methodology: s.methodology ?? '',
        presentation: s.presentation ?? '',
        defense: s.defense ?? '',
        innovation: s.innovation ?? '',
        application: s.application ?? '',
        impact: s.impact ?? '',
      });
    } else {
      setScores(INITIAL_SCORES);
    }
    setSubmitted(false);
    setSubmitError('');
  }, [existingEval, isOpen]);

  // Recompute totals every time scores change
  useEffect(() => {
    const manuscript =
      (Number(scores.format) || 0) +
      (Number(scores.researchProblems) || 0) +
      (Number(scores.relatedLiterature) || 0) +
      (Number(scores.methodology) || 0);
    const oral =
      (Number(scores.presentation) || 0) + (Number(scores.defense) || 0);
    const project =
      (Number(scores.innovation) || 0) +
      (Number(scores.application) || 0) +
      (Number(scores.impact) || 0);
    const overall = manuscript + oral + project;
    setTotals({ manuscript, oral, project, overall });
    if (overall >= 86) setVerdict('APPROVED');
    else if (overall >= 75) setVerdict('APPROVED_WITH_REVISIONS');
    else if (overall > 0) setVerdict('DISAPPROVED');
    else setVerdict(null);
  }, [scores]);

  const handleScoreChange = (field, value) => {
    if (value === '') {
      setScores((prev) => ({ ...prev, [field]: value }));
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= MAX_SCORES[field]) {
      setScores((prev) => ({ ...prev, [field]: num }));
    }
  };

  const allFilled = Object.keys(INITIAL_SCORES).every((k) => scores[k] !== '');

  // ─── PDF Download ────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;

      const htmlString = buildProposalPrintHTML({
        meta,
        scores,
        totals,
        verdict,
        panelistName,
        MAX_SCORES,
      });

      const filename = `Proposal_Defense_Rating_${(meta.title || 'untitled').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}.pdf`;

      // Pass htmlString directly instead of a manually positioned DOM element 
      // to avoid off-screen culling in html2canvas
      await html2pdf()
        .set({
          margin: [15, 25, 15, 25], // adjusted to match original reference margins
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
          jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all'] },
        })
        .from(htmlString)
        .save();

    } catch (err) {
      console.error('[ProposalGradingModal] PDF generation failed:', err);
      setSubmitError('PDF download failed: ' + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allFilled || !verdict) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit({
        defenseId,
        panelistId,
        panelistName,
        scores: {
          format: Number(scores.format),
          researchProblems: Number(scores.researchProblems),
          relatedLiterature: Number(scores.relatedLiterature),
          methodology: Number(scores.methodology),
          presentation: Number(scores.presentation),
          defense: Number(scores.defense),
          innovation: Number(scores.innovation),
          application: Number(scores.application),
          impact: Number(scores.impact),
        },
        subTotals: totals,
        verdict,
        workspaceId: groupDetails?.workspaceId,
        projectId: groupDetails?.projectId,
      });
      onClose();
    } catch (err) {
      setSubmitError('Failed to submit: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only render for proposal_defense type
  if (!isOpen || defenseType !== 'proposal_defense') return null;

  // ─── Success State ───────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 py-8 flex items-center justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="bg-white dark:bg-[#0e0f15] w-full max-w-md rounded-[5px] shadow-2xl p-10 flex flex-col items-center text-center border border-gray-200 dark:border-[#1c1d28]">
          <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-5">
            <ClipboardCheck className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Evaluation Submitted!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Your graded rubric has been recorded for this group's Proposal Defense.
          </p>
          <div className={`mt-4 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 ${
            verdict === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
            verdict === 'APPROVED_WITH_REVISIONS' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
            'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}>
            {verdict === 'APPROVED' && <CheckCircle className="w-4 h-4" />}
            {verdict === 'APPROVED_WITH_REVISIONS' && <AlertTriangle className="w-4 h-4" />}
            {verdict === 'DISAPPROVED' && <XCircle className="w-4 h-4" />}
            Verdict: {verdict === 'APPROVED' ? 'APPROVED' : verdict === 'APPROVED_WITH_REVISIONS' ? 'APPROVED WITH REVISIONS' : 'DISAPPROVED'} — {totals.overall.toFixed(1)} / 100
          </div>
          <Button onClick={onClose} variant="primary" className="mt-8 px-10 bg-blue-600 hover:bg-blue-700 text-white">
            Close
          </Button>
        </div>
      </div>
    );
  }

  // ─── Grading Form ────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 py-8"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="bg-white dark:bg-[#0e0f15] w-full max-w-4xl mx-auto rounded-[5px] shadow-2xl border border-gray-200 dark:border-[#1c1d28]">

        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#1c1d28] flex justify-between items-center bg-gray-50 dark:bg-[#12131b] shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-tight">
              Proposal Defense Rating Sheet
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              College of Computer Studies — Laguna State Polytechnic University
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-[#1c1d28] transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-300" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-6 space-y-8">

          {/* Already submitted notice */}
          {existingEval && (
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              You already submitted an evaluation for this defense. Re-submitting will overwrite your previous scores.
            </div>
          )}

          {/* ── Metadata ── */}
          <div className="bg-gray-50 dark:bg-[#12131b] rounded-xl border border-gray-100 dark:border-[#1c1d28] p-5">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Defense Information</p>

            {/* Row 1: Adviser + Date & Time */}
            <div className="grid grid-cols-2 gap-x-8 mb-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Adviser</p>
                <input type="text"
                  value={meta.adviser}
                  onChange={e => setMeta(m => ({ ...m, adviser: e.target.value }))}
                  placeholder="Adviser name"
                  className="w-full text-sm font-medium text-gray-900 dark:text-gray-100 bg-transparent border-0 border-b border-gray-200 dark:border-[#2a2c3d] focus:border-blue-400 focus:outline-none py-1 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Date &amp; Time</p>
                <div className="flex items-center gap-2">
                  <input type="text"
                    value={meta.date}
                    onChange={e => setMeta(m => ({ ...m, date: e.target.value }))}
                    placeholder="YYYY-MM-DD"
                    className="w-full text-sm font-medium text-gray-900 dark:text-gray-100 bg-transparent border-0 border-b border-gray-200 dark:border-[#2a2c3d] focus:border-blue-400 focus:outline-none py-1 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                  />
                  <span className="text-gray-300 dark:text-gray-600 shrink-0">|</span>
                  <input type="text"
                    value={meta.time}
                    onChange={e => setMeta(m => ({ ...m, time: e.target.value }))}
                    placeholder="--:-- AM"
                    className="w-32 text-sm font-medium text-gray-900 dark:text-gray-100 bg-transparent border-0 border-b border-gray-200 dark:border-[#2a2c3d] focus:border-blue-400 focus:outline-none py-1 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Specialization Expert + Group No */}
            <div className="grid grid-cols-2 gap-x-8 mb-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Specialization Expert</p>
                <input type="text"
                  value={meta.expert}
                  onChange={e => setMeta(m => ({ ...m, expert: e.target.value }))}
                  placeholder="e.g. Statistician, Subject Specialist, Technical"
                  className="w-full text-sm font-medium text-gray-900 dark:text-gray-100 bg-transparent border-0 border-b border-gray-200 dark:border-[#2a2c3d] focus:border-blue-400 focus:outline-none py-1 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Group No.</p>
                <input type="text"
                  value={meta.groupNo}
                  onChange={e => setMeta(m => ({ ...m, groupNo: e.target.value }))}
                  placeholder="Group number"
                  className="w-full text-sm font-medium text-gray-900 dark:text-gray-100 bg-transparent border-0 border-b border-gray-200 dark:border-[#2a2c3d] focus:border-blue-400 focus:outline-none py-1 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
              </div>
            </div>

            {/* Row 3: Research Title (full width) */}
            <div className="mb-4">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Research Title</p>
              <input type="text"
                value={meta.title}
                onChange={e => setMeta(m => ({ ...m, title: e.target.value }))}
                placeholder="Enter the research study title"
                className="w-full text-sm font-medium text-gray-900 dark:text-gray-100 bg-transparent border-0 border-b border-gray-200 dark:border-[#2a2c3d] focus:border-blue-400 focus:outline-none py-1 placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
            </div>

            {/* Row 4: Proponents (full width) */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Name of Proponents</p>
              <input type="text"
                value={meta.proponents}
                onChange={e => setMeta(m => ({ ...m, proponents: e.target.value }))}
                placeholder="Name1, Name2, Name3"
                className="w-full text-sm font-medium text-gray-900 dark:text-gray-100 bg-transparent border-0 border-b border-gray-200 dark:border-[#2a2c3d] focus:border-blue-400 focus:outline-none py-1 placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
              <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">Auto-filled from group members. You may edit if needed.</p>
            </div>
          </div>

          {/* ── FORM ── */}
          <form id="proposal-grading-form" onSubmit={handleSubmit} className="space-y-10">

            <div className="overflow-x-auto rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm">
              <table className="w-full border-collapse text-left bg-white dark:bg-[#0e0f15]">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="border-b border-r border-gray-300 dark:border-gray-600 p-3 text-center text-xs font-bold uppercase text-gray-700 dark:text-gray-300 w-[70%]">CRITERIA</th>
                    <th className="border-b border-r border-gray-300 dark:border-gray-600 p-3 text-center text-xs font-bold uppercase text-gray-700 dark:text-gray-300 w-[15%]">WEIGHT (%)</th>
                    <th className="border-b border-gray-300 dark:border-gray-600 p-3 text-center text-xs font-bold uppercase text-gray-700 dark:text-gray-300 w-[15%]">EVALUATED SCORE</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      title: 'MANUSCRIPT',
                      weight: '30%',
                      rows: [
                        { field: 'format', label: '1. Format', desc: 'documentation, chapter division, style including neatness and organization of details.' },
                        { field: 'researchProblems', label: '2. Research Problems and Objectives', desc: 'discuss the problems encountered by the client and answered with appropriate and adequate solutions' },
                        { field: 'relatedLiterature', label: '3. Related Literature and Studies', desc: 'includes 10 for literature and 10 studies and summarize the discussion on synthesis' },
                        { field: 'methodology', label: '4. Research Methodology', desc: 'appropriateness of methods of study, statistical treatment, analysis and interpretations' },
                      ],
                      subtotal: totals.manuscript,
                      subtotalMax: 30,
                    },
                    {
                      title: 'ORAL DEFENSE',
                      weight: '30%',
                      rows: [
                        { field: 'presentation', label: '1. Presentation', desc: 'content and creativity of visual aid and/or graphics and mastery of study evidenced by logical presentation of the conclusion' },
                        { field: 'defense', label: '2. Defense', desc: 'ability to answer reasoning capability and ability to justify interpretation and conclusion' },
                      ],
                      subtotal: totals.oral,
                      subtotalMax: 30,
                    },
                    {
                      title: 'CAPSTONE/THESIS PROJECT',
                      weight: '40%',
                      rows: [
                        { field: 'innovation', label: '1. Innovation', desc: '' },
                        { field: 'application', label: '2. Application and Relevance', desc: '' },
                        { field: 'impact', label: '3. Research Thrust Impact', desc: '' },
                      ],
                      subtotal: totals.project,
                      subtotalMax: 40,
                    },
                  ].map((section, idx) => (
                    <React.Fragment key={section.title}>
                      {/* Section Header Row */}
                      <tr className="bg-gray-800 text-white dark:bg-gray-700">
                        <td colSpan={3} className="border-b border-gray-300 dark:border-gray-600 p-2 text-center text-sm font-bold tracking-widest uppercase">
                          {section.title} ({section.weight})
                        </td>
                      </tr>
                      {/* Criteria Rows */}
                      {section.rows.map(({ field, label, desc }) => (
                        <tr key={field} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="border-b border-r border-gray-300 dark:border-gray-600 p-3 text-sm text-gray-800 dark:text-gray-200">
                            <span className="font-semibold">{label}</span>
                            {desc && <span className="font-normal text-gray-600 dark:text-gray-400"> ({desc})</span>}
                          </td>
                          <td className="border-b border-r border-gray-300 dark:border-gray-600 p-3 text-center text-sm font-bold text-gray-600 dark:text-gray-400">
                            {MAX_SCORES[field]}
                          </td>
                          <td className="border-b border-gray-300 dark:border-gray-600 p-2 align-middle">
                            <input type="number"
                              step="0.1"
                              min="0"
                              max={MAX_SCORES[field]}
                              value={scores[field]}
                              onChange={(e) => handleScoreChange(field, e.target.value)}
                                disabled={readOnly || isSubmitting}
                                placeholder={`0–${MAX_SCORES[field]}`}
                              className="w-full bg-gray-50 dark:bg-[#12131b] border border-gray-200 dark:border-[#2a2c3d] rounded px-2 py-1.5 text-center text-sm font-bold text-blue-600 dark:text-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </td>
                        </tr>
                      ))}
                      {/* Sub-Total Row */}
                      <tr className="bg-gray-100 dark:bg-gray-800/50">
                        <td className="border-b border-r border-gray-300 dark:border-gray-600 p-2 text-right text-xs font-bold uppercase text-gray-700 dark:text-gray-300 pr-4 tracking-widest">
                          SUB - TOTAL
                        </td>
                        <td className="border-b border-r border-gray-300 dark:border-gray-600 p-2 text-center text-sm font-bold text-gray-700 dark:text-gray-300">
                          {section.subtotalMax}
                        </td>
                        <td className="border-b border-gray-300 dark:border-gray-600 p-2 text-center font-bold text-lg text-blue-600 dark:text-blue-400">
                          {section.subtotal.toFixed(1)}
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                  {/* Overall Total Row (inside table, matching original) */}
                  <tr className="bg-gray-800 text-white dark:bg-gray-700">
                    <td className="p-2 text-right text-sm font-bold uppercase pr-4 tracking-widest">
                      OVER ALL TOTAL
                    </td>
                    <td className="border-l border-r border-gray-600 p-2 text-center text-sm font-bold">
                      100
                    </td>
                    <td className="p-2 text-center font-black text-xl text-emerald-400">
                      {totals.overall.toFixed(1)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-2 pt-6 flex flex-col md:flex-row gap-5">

              {/* Overall Score omitted here because it's now inside the table! */}

              {/* Verdict */}
              <div className="flex-1 bg-white dark:bg-[#0e0f15] border-2 border-gray-200 dark:border-[#222433] rounded-2xl p-6 flex flex-col justify-center shadow-sm relative overflow-hidden">
                {verdict === 'APPROVED' && <div className="absolute top-0 w-full h-1 bg-emerald-500" />}
                {verdict === 'APPROVED_WITH_REVISIONS' && <div className="absolute top-0 w-full h-1 bg-amber-500" />}
                {verdict === 'DISAPPROVED' && <div className="absolute top-0 w-full h-1 bg-rose-500" />}

                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Final Verdict</p>

                {verdict === 'APPROVED' ? (
                  <div className="flex items-start gap-3 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-8 h-8 shrink-0" />
                    <div>
                      <h4 className="text-xl font-bold uppercase leading-none mb-1">Approved</h4>
                      <p className="text-xs text-emerald-700 dark:text-emerald-500/80 font-medium">86–100 (Minor revisions necessary)</p>
                    </div>
                  </div>
                ) : verdict === 'APPROVED_WITH_REVISIONS' ? (
                  <div className="flex items-start gap-3 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-8 h-8 shrink-0" />
                    <div>
                      <h4 className="text-xl font-bold uppercase leading-none mb-1">Revisions Needed</h4>
                      <p className="text-xs text-amber-700 dark:text-amber-500/80 font-medium">75–85 (Major revisions required)</p>
                    </div>
                  </div>
                ) : verdict === 'DISAPPROVED' ? (
                  <div className="flex items-start gap-3 text-rose-600 dark:text-rose-400">
                    <XCircle className="w-8 h-8 shrink-0" />
                    <div>
                      <h4 className="text-xl font-bold uppercase leading-none mb-1">Disapproved</h4>
                      <p className="text-xs text-rose-700 dark:text-rose-500/80 font-medium">Below 75 (Failed to propose valid research)</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 text-gray-400">
                    <Calculator className="w-8 h-8 shrink-0 opacity-50" />
                    <div>
                      <h4 className="text-xl font-bold uppercase leading-none mb-1">Pending</h4>
                      <p className="text-xs font-medium">Fill in all scores to see verdict</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Evaluator Line */}
            <div className="pt-4 border-t border-gray-200 dark:border-[#1c1d28] flex items-center justify-between text-sm">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Evaluating as:</p>
                <p className="font-semibold text-gray-900 dark:text-white">{panelistName || 'Panelist'}</p>
              </div>
              <p className="text-xs text-gray-400 italic text-right max-w-xs">
                By submitting, your digital signature is attached to this evaluation.
              </p>
            </div>

            {/* Error */}
            {submitError && (
              <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {submitError}
              </div>
            )}
          </form>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-[#1c1d28] bg-gray-50 dark:bg-[#12131b] flex items-center justify-between shrink-0">
          {/* Left side: Download PDF */}
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 text-sm px-4 py-2 border-gray-300 dark:border-[#2a2c3d] hover:bg-gray-100 dark:hover:bg-[#1c1d28] text-gray-700 dark:text-gray-300 disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download as PDF
                </>
              )}
            </Button>
          )}

          {/* Right side: Cancel + Submit */}
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="px-6" disabled={isSubmitting}>
              {readOnly ? 'Close' : 'Cancel'}
            </Button>
            {!readOnly && (
              <Button
                form="proposal-grading-form"
                type="submit"
                variant="primary"
                className="px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
                disabled={!allFilled || !verdict || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-4 h-4" />
                    Submit Final Grade
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalGradingModal;
