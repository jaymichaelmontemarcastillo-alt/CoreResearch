// src/utils/proposalPrintTemplate.js
// Generates a high-fidelity HTML string matching the LSPU Proposal Defense Rating Sheet.
// Page size: Letter 21.59 cm × 27.94 cm (8.5 × 11 in) — MUST fit cleanly on 1 page.
// Used by html2pdf.js to produce a pixel-perfect, professionally formatted PDF.

/**
 * @param {object} params
 * @param {object} params.meta         – { adviser, expert, date, time, groupNo, title, proponents }
 * @param {object} params.scores       – individual score values
 * @param {object} params.totals       – { manuscript, oral, project, overall }
 * @param {string} params.verdict      – 'APPROVED' | 'APPROVED_WITH_REVISIONS' | 'DISAPPROVED'
 * @param {string} params.panelistName
 * @param {string} [params.panelistRole]
 * @param {object} params.MAX_SCORES   – max score per field
 */
export function buildProposalPrintHTML({ meta, scores, totals, verdict, panelistName, panelistRole, MAX_SCORES }) {
  const s = (field) => {
    const v = scores?.[field];
    return v === '' || v === undefined || v === null ? '' : Number(v);
  };

  // Safely parse proponents into a trimmed list
  let proponentsArr = [];
  if (typeof meta?.proponents === 'string') {
    proponentsArr = meta.proponents.split(',').map(p => p.trim()).filter(Boolean);
  } else if (Array.isArray(meta?.proponents)) {
    proponentsArr = meta.proponents
      .map(p => (typeof p === 'string' ? p.trim() : (p?.name || p?.fullName || '')).trim())
      .filter(Boolean);
  }

  // Ensure 3 slots for official rating sheet format
  while (proponentsArr.length < 3) proponentsArr.push('');

  // Calculate dynamic title font size
  const titleText = meta?.title?.trim() || '&nbsp;';
  const titleLength = titleText.length;
  const titleFontSize = titleLength > 90 ? '7.5pt' : titleLength > 55 ? '8.5pt' : '9.5pt';

  // Determine role display above the signature line
  const displayRole = (
    panelistRole ||
    (panelistName && meta?.adviser && meta.adviser.toLowerCase().includes(panelistName.toLowerCase()) ? 'Adviser' : '') ||
    (panelistName && meta?.expert && meta.expert.toLowerCase().includes(panelistName.toLowerCase()) ? (meta.expert || 'Specialization Expert') : '') ||
    ''
  );

  return `
<div style="
  width: 100%;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 8.5pt;
  line-height: 1.35;
  color: #000000;
  background-color: #ffffff;
  box-sizing: border-box;
">

  <style>
    /* Scoped rules to ensure PDF isolation from host CSS frameworks */
    .eval-table {
      width: 100% !important;
      border-collapse: collapse !important;
      border: 1px solid #000000 !important;
      margin-top: 4px !important;
      margin-bottom: 4px !important;
      font-size: 8pt !important;
    }
    .eval-table th,
    .eval-table td {
      border: 1px solid #000000 !important;
      color: #000000 !important;
      box-sizing: border-box !important;
    }
    .eval-table th {
      background-color: #f3f4f6 !important;
      font-weight: bold !important;
      text-align: center !important;
      vertical-align: middle !important;
      padding: 5px 8px !important;
    }
    .eval-table td.criteria {
      padding: 6px 10px !important;
      vertical-align: middle !important;
      line-height: 1.35 !important;
      text-align: left !important;
    }
    .eval-table td.num {
      padding: 6px 4px !important;
      text-align: center !important;
      vertical-align: middle !important;
      font-weight: 600 !important;
      font-size: 8.5pt !important;
    }
    .eval-table td.subtotal-label {
      padding: 5px 12px !important;
      text-align: right !important;
      font-weight: bold !important;
      background-color: #f9fafb !important;
      font-size: 8pt !important;
    }
    .eval-table td.subtotal-val {
      padding: 5px 4px !important;
      text-align: center !important;
      vertical-align: middle !important;
      font-weight: bold !important;
      background-color: #f9fafb !important;
      font-size: 8.5pt !important;
    }
    .eval-table td.cat-header {
      background-color: #e5e7eb !important;
      font-weight: bold !important;
      text-align: center !important;
      padding: 5px 8px !important;
      font-size: 8pt !important;
      letter-spacing: 0.5px !important;
    }
  </style>

  <!-- ═══ HEADER ═══ -->
  <div style="text-align: center; margin-bottom: 8px; font-family: Calibri, Arial, sans-serif;">
    <div style="font-size: 8pt; color: #000; margin-bottom: 1px;">Republic of the Philippines</div>
    <div style="font-family: 'Old English Text MT', 'UnifrakturMaguntia', 'Times New Roman', serif; font-size: 15pt; font-weight: normal; color: #000; line-height: 1.1; margin-bottom: 2px;">Laguna State Polytechnic University</div>
    <div style="font-size: 8pt; color: #000; margin-bottom: 4px;">Province of Laguna</div>
    <div style="font-size: 8.5pt; font-weight: bold; color: #000; margin-bottom: 2px; letter-spacing: 0.3px;">COLLEGE OF COMPUTER STUDIES</div>
    <div style="font-size: 8.5pt; font-weight: bold; color: #000; letter-spacing: 0.3px;">PROPOSAL DEFENSE RATING SHEET</div>
  </div>

  <!-- ═══ METADATA SECTION ═══ -->
  <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 6px;" cellpadding="0" cellspacing="0">
    <!-- Row 1: Adviser + Specialization Expert -->
    <tr>
      <td style="white-space: nowrap; width: 60px; padding: 3px 6px 4px 0; vertical-align: bottom;">Adviser:</td>
      <td style="border-bottom: 1px solid #000; width: 38%; padding: 2px 6px 4px 6px; vertical-align: bottom; font-weight: 600;">
        ${meta?.adviser || '&nbsp;'}
      </td>
      <td style="white-space: nowrap; width: 140px; padding: 3px 6px 4px 16px; vertical-align: bottom;">Specialization Expert:</td>
      <td style="border-bottom: 1px solid #000; padding: 2px 6px 4px 6px; vertical-align: bottom; font-weight: 600;">
        ${meta?.expert || '&nbsp;'}
      </td>
    </tr>
    <tr><td colspan="4" style="height: 3px;"></td></tr>
    <!-- Row 2: Date + Group No. + Time -->
    <tr>
      <td style="white-space: nowrap; padding: 3px 6px 4px 0; vertical-align: bottom;">Date:</td>
      <td style="border-bottom: 1px solid #000; padding: 2px 6px 4px 6px; vertical-align: bottom; font-weight: 600;">
        ${meta?.date || '&nbsp;'}
      </td>
      <td colspan="2" style="padding: 0;">
        <table style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="white-space: nowrap; width: 70px; padding: 3px 6px 4px 16px; vertical-align: bottom;">Group No.</td>
            <td style="border-bottom: 1px solid #000; width: 25%; padding: 2px 6px 4px 6px; vertical-align: bottom; font-weight: 600;">
              ${meta?.groupNo || '&nbsp;'}
            </td>
            <td style="white-space: nowrap; width: 45px; padding: 3px 6px 4px 16px; vertical-align: bottom;">Time:</td>
            <td style="border-bottom: 1px solid #000; padding: 2px 6px 4px 6px; vertical-align: bottom; font-weight: 600;">
              ${meta?.time || '&nbsp;'}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td colspan="4" style="height: 3px;"></td></tr>
    <!-- Row 3: Name of Proponents -->
    <tr>
      <td style="white-space: nowrap; padding: 3px 6px 4px 0; vertical-align: top;">Name of Proponents:</td>
      <td colspan="3" style="padding: 0; vertical-align: top;">
        <div style="border-bottom: 1px solid #000; padding: 2px 6px 4px 6px; min-height: 16px; margin-bottom: 3px; font-weight: 600;">
          ${proponentsArr[0] || '&nbsp;'}
        </div>
        <div style="border-bottom: 1px solid #000; padding: 2px 6px 4px 6px; min-height: 16px; margin-bottom: 3px; font-weight: 600;">
          ${proponentsArr[1] || '&nbsp;'}
        </div>
        <div style="border-bottom: 1px solid #000; padding: 2px 6px 4px 6px; min-height: 16px; font-weight: 600;">
          ${proponentsArr[2] || '&nbsp;'}
        </div>
      </td>
    </tr>
    <tr><td colspan="4" style="height: 3px;"></td></tr>
    <!-- Row 4: Research Title -->
    <tr>
      <td style="white-space: nowrap; padding: 3px 6px 4px 0; vertical-align: top;">Research Title:</td>
      <td colspan="3" style="border-bottom: 1px solid #000; padding: 2px 6px 4px 6px; vertical-align: top; font-weight: 600; font-size: ${titleFontSize}; line-height: 1.3;">
        ${titleText}
      </td>
    </tr>
  </table>

  <!-- ═══ CRITERIA EVALUATION TABLE ═══ -->
  <table class="eval-table" cellpadding="0" cellspacing="0">
    <!-- Category 1: MANUSCRIPT (30%) -->
    <thead>
      <tr>
        <th colspan="3" class="cat-header">MANUSCRIPT (30%)</th>
      </tr>
      <tr>
        <th style="width: 72%;">CRITERIA</th>
        <th style="width: 13%;">WEIGHT<br/>(%)</th>
        <th style="width: 15%;">EVALUATED<br/>SCORE</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="criteria">1. Format (documentation, chapter division, style including neatness and organization of details.)</td>
        <td class="num">7</td>
        <td class="num">${s('format')}</td>
      </tr>
      <tr>
        <td class="criteria">2. Research Problems and Objectives (discuss the problems encountered by the client and answered with appropriate and adequate solutions)</td>
        <td class="num">8</td>
        <td class="num">${s('researchProblems')}</td>
      </tr>
      <tr>
        <td class="criteria">3. Related Literature and Studies (includes 10 for literature and 10 studies and summarize the discussion on synthesis)</td>
        <td class="num">7</td>
        <td class="num">${s('relatedLiterature')}</td>
      </tr>
      <tr>
        <td class="criteria">4. Research Methodology (appropriateness of methods of study, statistical treatment, analysis and interpretations)</td>
        <td class="num">8</td>
        <td class="num">${s('methodology')}</td>
      </tr>
      <tr>
        <td class="subtotal-label">SUB – TOTAL</td>
        <td class="subtotal-val">30</td>
        <td class="subtotal-val">${totals?.manuscript ?? ''}</td>
      </tr>

      <!-- Category 2: ORAL DEFENSE (30%) -->
      <tr>
        <td colspan="3" class="cat-header">ORAL DEFENSE (30%)</td>
      </tr>
      <tr>
        <td class="criteria">1. Presentation (content and creativity of visual aid and/ or graphics and mastery of study evidenced by logical presentation of the conclusion)</td>
        <td class="num">15</td>
        <td class="num">${s('presentation')}</td>
      </tr>
      <tr>
        <td class="criteria">2. Defense (Ability to answer reasoning capability and ability to justify interpretation and conclusion)</td>
        <td class="num">15</td>
        <td class="num">${s('defense')}</td>
      </tr>
      <tr>
        <td class="subtotal-label">SUB – TOTAL</td>
        <td class="subtotal-val">30</td>
        <td class="subtotal-val">${totals?.oral ?? ''}</td>
      </tr>

      <!-- Category 3: CAPSTONE/THESIS PROJECT (40%) -->
      <tr>
        <td colspan="3" class="cat-header">CAPSTONE/THESIS PROJECT (40%)</td>
      </tr>
      <tr>
        <td class="criteria">1. Innovation</td>
        <td class="num">15</td>
        <td class="num">${s('innovation')}</td>
      </tr>
      <tr>
        <td class="criteria">2. Application and Relevance</td>
        <td class="num">15</td>
        <td class="num">${s('application')}</td>
      </tr>
      <tr>
        <td class="criteria">3. Research Thrust Impact</td>
        <td class="num">10</td>
        <td class="num">${s('impact')}</td>
      </tr>
      <tr>
        <td class="subtotal-label">SUB – TOTAL</td>
        <td class="subtotal-val">40</td>
        <td class="subtotal-val">${totals?.project ?? ''}</td>
      </tr>

      <!-- Overall Total -->
      <tr>
        <td class="subtotal-label" style="font-size: 8.5pt; background-color: #f3f4f6;">OVER ALL TOTAL</td>
        <td class="subtotal-val" style="font-size: 8.5pt; background-color: #f3f4f6;">100</td>
        <td class="subtotal-val" style="font-size: 9pt; background-color: #f3f4f6; font-weight: bold;">${totals?.overall ?? ''}</td>
      </tr>
    </tbody>
  </table>

  <!-- ═══ FINAL VERDICT ═══ -->
  <div style="margin-top: 6px; margin-bottom: 8px;">
    <div style="text-align: center; font-weight: bold; font-size: 8.5pt; margin-bottom: 5px; letter-spacing: 0.3px;">FINAL VERDICT</div>
    <table style="width: 100%; border-collapse: collapse; font-size: 8pt; line-height: 1.35;" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width: 28px !important; white-space: nowrap !important; vertical-align: top !important; text-align: center; padding: 2px 4px 3px 8px;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 9.5pt; font-weight: bold; white-space: nowrap !important; letter-spacing: -1px; display: inline-block;">[${verdict === 'APPROVED' ? '✓' : '&nbsp;'}]</span>
        </td>
        <td style="vertical-align: top; padding: 2px 8px 3px 0; text-align: left; line-height: 1.35;">
          <strong>APPROVED.</strong> Minor revisions are necessary but they do not have to be presented in front of and checked by all panelists. <strong>86 – 100</strong>
        </td>
      </tr>
      <tr>
        <td style="width: 28px !important; white-space: nowrap !important; vertical-align: top !important; text-align: center; padding: 2px 4px 3px 8px;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 9.5pt; font-weight: bold; white-space: nowrap !important; letter-spacing: -1px; display: inline-block;">[${verdict === 'APPROVED_WITH_REVISIONS' ? '✓' : '&nbsp;'}]</span>
        </td>
        <td style="vertical-align: top; padding: 2px 8px 3px 0; text-align: left; line-height: 1.35;">
          <strong>APPROVED WITH REVISIONS.</strong> Major revisions shall be incorporated in the final copy of the revised Project Proposal summary. These must be checked by the panelists. <strong>75 – 85</strong>
        </td>
      </tr>
      <tr>
        <td style="width: 28px !important; white-space: nowrap !important; vertical-align: top !important; text-align: center; padding: 2px 4px 3px 8px;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 9.5pt; font-weight: bold; white-space: nowrap !important; letter-spacing: -1px; display: inline-block;">[${verdict === 'DISAPPROVED' ? '✓' : '&nbsp;'}]</span>
        </td>
        <td style="vertical-align: top; padding: 2px 8px 3px 0; text-align: left; line-height: 1.35;">
          <strong>DISAPPROVED.</strong> The Proponents/Researchers failed to propose a researchable or scholarly Thesis / Capstone Project. <strong>Below 75</strong>
        </td>
      </tr>
    </table>
  </div>

  <!-- ═══ SIGNATURE BLOCK ═══ -->
  <div style="margin-top: 24px; padding: 0 10px;">
    <table style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width: 44%; text-align: center; vertical-align: top;">
          <div style="min-height: 20px; line-height: 20px; font-size: 9.5pt; font-weight: bold; text-transform: uppercase; color: #000; padding-bottom: 4px;">
            ${displayRole || '&nbsp;'}
          </div>
          <div style="border-top: 1px solid #000; width: 230px; margin: 0 auto;"></div>
          <div style="font-size: 8.5pt; color: #000; text-align: center; padding-top: 5px;">
            Role on the Defense
          </div>
        </td>
        <td style="width: 12%;"></td>
        <td style="width: 44%; text-align: center; vertical-align: top;">
          <div style="min-height: 20px; line-height: 20px; font-size: 9.5pt; font-weight: bold; text-transform: uppercase; color: #000; padding-bottom: 4px;">
            ${panelistName ? panelistName : '&nbsp;'}
          </div>
          <div style="border-top: 1px solid #000; width: 230px; margin: 0 auto;"></div>
          <div style="font-size: 8.5pt; color: #000; text-align: center; padding-top: 5px;">
            Signature over Printed Name of Evaluator
          </div>
        </td>
      </tr>
    </table>
  </div>

</div>`;
}
