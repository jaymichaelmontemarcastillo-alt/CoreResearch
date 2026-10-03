// src/utils/proposalPrintTemplate.js
// Generates a high-fidelity HTML string matching the LSPU Proposal Defense Rating Sheet.
// Page size: Letter 21.59 cm × 27.94 cm (8.5 × 11 in) — MUST fit on 1 page.
// Used by html2pdf.js to produce a pixel-perfect PDF.

/**
 * @param {object} params
 * @param {object} params.meta       – { adviser, expert, date, time, groupNo, title, proponents }
 * @param {object} params.scores     – individual score values
 * @param {object} params.totals     – { manuscript, oral, project, overall }
 * @param {string} params.verdict    – 'APPROVED' | 'APPROVED_WITH_REVISIONS' | 'DISAPPROVED'
 * @param {string} params.panelistName
 * @param {object} params.MAX_SCORES – max score per field
 */
export function buildProposalPrintHTML({ meta, scores, totals, verdict, panelistName, MAX_SCORES }) {
  const s = (field) => {
    const v = scores[field];
    return v === '' || v === undefined || v === null ? '' : Number(v);
  };

  const checkMark = (v) => (verdict === v ? ' ✓ ' : '&nbsp;&nbsp;&nbsp;');

  const proponentsArr = typeof meta.proponents === 'string'
    ? meta.proponents.split(',').map(p => p.trim()).filter(Boolean)
    : Array.isArray(meta.proponents) ? meta.proponents : [];

  while (proponentsArr.length < 3) proponentsArr.push('');

  // Calculate dynamic title font size
  const titleText = meta.title || '&nbsp;';
  const titleLength = titleText.length;
  const titleFontSize = titleLength > 90 ? '7.5pt' : titleLength > 55 ? '8.5pt' : '10pt';

  return `
<div style="
  width: 100%;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10pt;
  line-height: 1.2;
  color: #000;
  background: #fff;
">

  <!-- ═══ HEADER ═══ -->
  <div style="text-align:center; margin-bottom:6px; font-family: Calibri, sans-serif;">
    <div style="font-size:8pt; margin-bottom:1px;">Republic of the Philippines</div>
    <div style="font-family:'Old English Text MT', 'UnifrakturMaguntia', 'Times New Roman', serif; font-size:15pt; font-weight:normal; letter-spacing:0.3pt; line-height:1.0; margin-bottom:1px;">Laguna State Polytechnic University</div>
    <div style="font-size:8pt; margin-bottom:5px;">Province of Laguna</div>
    <div style="font-size:8pt; font-weight:bold; margin-bottom:2px;">COLLEGE OF COMPUTER STUDIES</div>
    <div style="font-size:8pt; font-weight:bold; margin-bottom:2px;">PROPOSAL DEFENSE RATING SHEET</div>
  </div>

  <!-- ═══ METADATA ═══ -->
  <div style="font-size:9pt; margin-bottom:2px; line-height:1.3;">
    <!-- Row 1: Adviser + Specialization Expert -->
    <div style="display:flex; align-items:baseline; gap:0; margin-bottom:2px;">
      <span style="white-space:nowrap;">Adviser:</span>
      <span style="flex:1; border-bottom:0.5pt solid #000; min-height:12px; padding:0 3px; margin-left:4px; margin-right:8px;">
        <div style="position:relative; top:-3px;">${meta.adviser || '&nbsp;'}</div>
      </span>
      <span style="white-space:nowrap;">Specialization Expert:</span>
      <span style="flex:1; border-bottom:0.5pt solid #000; min-height:12px; padding:0 3px; margin-left:4px;">
        <div style="position:relative; top:-3px;">${meta.expert || '&nbsp;'}</div>
      </span>
    </div>

    <!-- Row 2: Date + Group No. + Time -->
    <div style="display:flex; align-items:baseline; gap:0; margin-bottom:2px;">
      <span style="white-space:nowrap;">Date:</span>
      <span style="flex:1; border-bottom:0.5pt solid #000; min-height:12px; padding:0 3px; margin-left:4px; margin-right:8px;">
        <div style="position:relative; top:-3px;">${meta.date || '&nbsp;'}</div>
      </span>
      <span style="white-space:nowrap;">Group No.</span>
      <span style="flex:1; border-bottom:0.5pt solid #000; min-height:12px; padding:0 3px; margin-left:4px; margin-right:8px;">
        <div style="position:relative; top:-3px;">${meta.groupNo || '&nbsp;'}</div>
      </span>
      <span style="white-space:nowrap;">Time:</span>
      <span style="flex:1; border-bottom:0.5pt solid #000; min-height:12px; padding:0 3px; margin-left:4px;">
        <div style="position:relative; top:-3px;">${meta.time || '&nbsp;'}</div>
      </span>
    </div>

    <!-- Row 3: Name of Proponents -->
    <div style="display:flex; align-items:baseline; margin-bottom:2px;">
      <span style="white-space:nowrap;">Name of Proponents:</span>
      <span style="flex:1; border-bottom:0.5pt solid #000; min-height:12px; padding:0 3px; margin-left:4px;">
        <div style="position:relative; top:-3px;">${proponentsArr[0] || '&nbsp;'}</div>
      </span>
    </div>
    <div style="border-bottom:0.5pt solid #000; min-height:12px; padding:0 3px; margin-left:125px; margin-bottom:2px;">
      <div style="position:relative; top:-3px;">${proponentsArr[1] || '&nbsp;'}</div>
    </div>
    <div style="border-bottom:0.5pt solid #000; min-height:12px; padding:0 3px; margin-left:125px; margin-bottom:2px;">
      <div style="position:relative; top:-3px;">${proponentsArr[2] || '&nbsp;'}</div>
    </div>

    <!-- Row 4: Research Title -->
    <div style="display:flex; align-items:baseline; margin-top:2px;">
      <span style="white-space:nowrap;">Research Title:</span>
      <span style="flex:1; border-bottom:0.5pt solid #000; min-height:12px; padding:0 3px; margin-left:4px; font-size:${titleFontSize}; line-height:1.3;">
        <div style="position:relative; top:-3px;">${titleText}</div>
      </span>
    </div>
  </div>

  <!-- 
    ========================================================================
    🚩 FLAG: TABLE SETTINGS (BORDER THICKNESS & COLORS)
    ========================================================================
    To change the table border thickness, change ALL instances of "border:0.5pt  #000;" 
    below to whatever you like (e.g. "border:0.5px solid #000;" for thinner lines).
  -->
  <table style="width:100%; border-collapse:collapse; font-size:8pt; margin-top:4px; margin-bottom:4px;" cellpadding="0" cellspacing="0">
    <!-- MANUSCRIPT (30%) -->
    <tr>
      <!-- 🚩 FLAG: MANUSCRIPT HEADER COLOR (Change background:#404040 to something else if needed) -->
      <td colspan="3" style="border:0.5px solid #000; background:#fff; color:#000; font-weight:bold; text-align:center; padding:2px 4px; font-size:8pt;">MANUSCRIPT (30%)</td>
    </tr>
    <tr>
      <th style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px; font-weight:normal; width:70%;">CRITERIA</th>
      <th style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px; font-weight:normal; width:12%; line-height:1.0;">WEIGHT<br/>(%)</th>
      <th style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px; font-weight:normal; width:18%; line-height:1.0;">EVALUATED<br/>SCORE</th>
    </tr>
    <tr>
      <!-- 🚩 FLAG: TEXT CONTENT (Criteria 1) - You can edit the text "1. Format..." right here -->
      <td style="border:0.5px solid #000; padding:2px 4px; vertical-align:top; line-height:1.0;">1. Format (documentation, chapter division, style including neatness and organization of details.)</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">7</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">${s('format')}</td>
    </tr>
    <tr>
      <!-- 🚩 FLAG: TEXT CONTENT (Criteria 2) -->
      <td style="border:0.5px solid #000; padding:2px 4px; vertical-align:top; line-height:1.0;">2. Research Problems and Objectives (discuss the problems encountered by the client and answered with appropriate and adequate solutions)</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">8</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">${s('researchProblems')}</td>
    </tr>
    <tr>
      <!-- 🚩 FLAG: TEXT CONTENT (Criteria 3) -->
      <td style="border:0.5px solid #000; padding:2px 4px; vertical-align:top; line-height:1.0;">3. Related Literature and Studies (includes 10 for literature and 10 studies and summarize the discussion on synthesis)</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">7</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">${s('relatedLiterature')}</td>
    </tr>
    <tr>
      <!-- 🚩 FLAG: TEXT CONTENT (Criteria 4) -->
      <td style="border:0.5px solid #000; padding:2px 4px; vertical-align:top; line-height:1.0;">4. Research Methodology (appropriateness of methods of study, statistical treatment, analysis and interpretations)</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">8</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">${s('methodology')}</td>
    </tr>
    <tr>
      <!-- 🚩 FLAG: SUB-TOTAL ROW (Change background:#e0e0e0 to edit the light gray color) -->
      <td style="border:0.5px solid #000; background:#fff; text-align:right; padding:2px 5px 2px 4px;">SUB – TOTAL</td>
      <td style="border:0.5px solid #000; background:#fff; text-align:center; vertical-align:middle; padding:2px 4px;">30</td>
      <td style="border:0.5px solid #000; background:#fff; text-align:center; vertical-align:middle; padding:2px 4px;">${totals.manuscript || ''}</td>
    </tr>

    <!-- ORAL DEFENSE (30%) -->
    <tr>
      <td colspan="3" style="border:0.5px solid #000; background:#fff; color:#000; font-weight:bold; text-align:center; padding:2px 4px; font-size:8pt;">ORAL DEFENSE (30%)</td>
    </tr>
    <tr>
      <td style="border:0.5px solid #000; padding:2px 4px; vertical-align:top; line-height:1.0;">1. Presentation (content and creativity of visual aid and/ or graphics and mastery of study evidenced by logical presentation of the conclusion)</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">15</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">${s('presentation')}</td>
    </tr>
    <tr>
      <td style="border:0.5px solid #000; padding:2px 4px; vertical-align:top; line-height:1.0;">2. Defense (Ability to answer reasoning capability and ability to justify interpretation and conclusion)</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">15</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">${s('defense')}</td>
    </tr>
    <tr>
      <td style="border:0.5px solid #000; background:#fff; text-align:right; padding:2px 5px 2px 4px;">SUB – TOTAL</td>
      <td style="border:0.5px solid #000; background:#fff; text-align:center; vertical-align:middle; padding:2px 4px;">30</td>
      <td style="border:0.5px solid #000; background:#fff; text-align:center; vertical-align:middle; padding:2px 4px;">${totals.oral || ''}</td>
    </tr>

    <!-- CAPSTONE/THESIS PROJECT (40%) -->
    <tr>
      <td colspan="3" style="border:0.5px solid #000; background:#fff; color:#000; font-weight:bold; text-align:center; padding:2px 4px; font-size:8pt;">CAPSTONE/THESIS PROJECT (40%)</td>
    </tr>
    <tr>
      <td style="border:0.5px solid #000; padding:2px 4px; vertical-align:top; line-height:1.0;">1. Innovation</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">15</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">${s('innovation')}</td>
    </tr>
    <tr>
      <td style="border:0.5px solid #000; padding:2px 4px; vertical-align:top; line-height:1.0;">2. Application and Relevance</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">15</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">${s('application')}</td>
    </tr>
    <tr>
      <td style="border:0.5px solid #000; padding:2px 4px; vertical-align:top; line-height:1.0;">3. Research Thrust Impact</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">10</td>
      <td style="border:0.5px solid #000; text-align:center; vertical-align:middle; padding:2px 4px;">${s('impact')}</td>
    </tr>
    <tr>
      <td style="border:0.5px solid #000; background:#fff; text-align:right; padding:2px 5px 2px 4px;">SUB – TOTAL</td>
      <td style="border:0.5px solid #000; background:#fff; text-align:center; vertical-align:middle; padding:2px 4px;">40</td>
      <td style="border:0.5px solid #000; background:#fff; text-align:center; vertical-align:middle; padding:2px 4px;">${totals.project || ''}</td>
    </tr>
    <tr>
      <td style="border:0.5px solid #000; background:#fff; color:#000; font-weight:bold; text-align:right; padding:2px 5px 2px 4px;">OVER ALL TOTAL</td>
      <td style="border:0.5px solid #000; background:#fff; color:#000; text-align:center; font-weight:bold; vertical-align:middle; padding:2px 4px;">100</td>
      <td style="border:0.5px solid #000; background:#fff; color:#000; text-align:center; font-weight:bold; font-size:8pt; vertical-align:middle; padding:2px 4px;">${totals.overall || ''}</td>
    </tr>
  </table>

  <!-- ═══ FINAL VERDICT ═══ -->
  <div style="margin-top:10px; font-size:8pt;">
    <div style="text-align:center; font-weight:bold; font-size:8pt; margin-bottom:8px;">FINAL VERDICT</div>

    <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:5px; margin-left:16px; margin-right:24px; font-size:8pt; line-height:1.35;">
      <span style="font-size:8pt; font-weight:bold; white-space:nowrap; flex-shrink:0; min-width:26px; text-align:center;">[${checkMark('APPROVED')}]</span>
      <span style="flex:1; text-align:justify;">
        <strong>APPROVED</strong>. Minor revisions are necessary but they do not have to be presented in front of and checked by all panelists. <strong>86 – 100</strong>
      </span>
    </div>

    <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:5px; margin-left:16px; margin-right:24px; font-size:8pt; line-height:1.35;">
      <span style="font-size:8pt; font-weight:bold; white-space:nowrap; flex-shrink:0; min-width:26px; text-align:center;">[${checkMark('APPROVED_WITH_REVISIONS')}]</span>
      <span style="flex:1; text-align:justify;">
        <strong>APPROVED WITH REVISIONS</strong>. Major revisions shall be incorporated in the final copy of the revised Project Proposal summary. These must be checked by the panelists. <strong>75 – 85</strong>
      </span>
    </div>

    <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:0; margin-left:16px; margin-right:24px; font-size:8pt; line-height:1.35;">
      <span style="font-size:8pt; font-weight:bold; white-space:nowrap; flex-shrink:0; min-width:26px; text-align:center;">[${checkMark('DISAPPROVED')}]</span>
      <span style="flex:1; text-align:justify;">
        <strong>DISAPPROVED</strong>. The Proponents/Researchers failed to propose a researchable or scholarly Thesis / Capstone Project. <strong>Below 75</strong>
      </span>
    </div>
  </div>

  <!-- ═══ SIGNATURE ═══ -->
  <div style="display:flex; justify-content:space-between; margin-top:30px; padding:0 16px; font-size:8pt;">
    <div style="text-align:center;">
      <div style="border-top:1px solid #000; min-width:150px; padding-top:3px; font-size:9.5pt; margin-top:20px;">Role on the Defense</div>
    </div>
    <div style="text-align:center;">
      <div style="border-top:1px solid #000; min-width:200px; padding-top:3px; font-size:9.5pt; margin-top:20px;">${panelistName ? panelistName + '<br/>' : ''}Signature over Printed Name of Evaluator</div>
    </div>
  </div>

</div>`;
}
