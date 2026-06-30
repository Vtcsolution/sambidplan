// frontend/src/utils/exportUtils.js
// Reusable PDF and CSV/Excel export helpers.
// PDF uses jsPDF + jspdf-autotable (both already installed).
// CSV uses a plain Blob download — opens natively in Excel.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Branding ──────────────────────────────────────────────────────────────────
const BRAND      = 'Sambid Notify';
const BRAND_COLOR = [79, 70, 229];   // indigo-600 in RGB
const GRAY        = [107, 114, 128];
const DARK        = [17, 24, 39];
const GREEN_BG    = [220, 252, 231];
const GREEN_TEXT  = [22, 101, 52];
const RED_BG      = [254, 226, 226];
const RED_TEXT    = [153, 27, 27];
const AMBER_BG    = [254, 243, 199];
const AMBER_TEXT  = [146, 64, 14];

// ── Shared helpers ────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
const fmtVal  = (v) => {
  if (!v) return '—';
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
};
const daysLeft = (due) => {
  if (!due) return null;
  return Math.ceil((new Date(due) - new Date()) / 86400000);
};
const daysLabel = (due) => {
  const d = daysLeft(due);
  if (d === null) return 'No deadline';
  if (d < 0)  return 'Expired';
  if (d === 0) return 'Due today';
  return `${d} days left`;
};

// Add a branded header to a PDF document
const addHeader = (doc, title, subtitle = '') => {
  const pageW = doc.internal.pageSize.getWidth();

  // Background strip
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageW, 28, 'F');

  // Brand name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(BRAND, 14, 18);

  // Title on right
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, pageW - 14, 18, { align: 'right' });

  // Subtitle + date line
  doc.setTextColor(...GRAY);
  doc.setFontSize(8);
  if (subtitle) doc.text(subtitle, 14, 36);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`, pageW - 14, 36, { align: 'right' });

  return 44; // y position after header
};

// Add page numbers to footer
const addFooter = (doc) => {
  const pages = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.text(`Page ${i} of ${pages}  |  ${BRAND} — Confidential`, pageW / 2, pageH - 8, { align: 'center' });
  }
};

// ── Escape CSV cell value ────────────────────────────────────────────────────
const csvCell = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val).replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
};

// Download a text blob
const downloadBlob = (content, filename, mime = 'text/csv;charset=utf-8;') => {
  // BOM for Excel UTF-8 compatibility
  const bom  = mime.includes('csv') ? '﻿' : '';
  const blob = new Blob([bom + content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ═════════════════════════════════════════════════════════════════════════════
// 1.  OPPORTUNITIES LIST  →  PDF
// ═════════════════════════════════════════════════════════════════════════════
export const exportOpportunitiesPDF = (opportunities, userName = '', naicsCodes = []) => {
  const doc      = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const subtitle = `${naicsCodes.length ? `NAICS: ${naicsCodes.join(', ')}  |  ` : ''}${opportunities.length} opportunities`;
  const startY   = addHeader(doc, 'Contract Opportunities Report', subtitle);

  if (userName) {
    doc.setTextColor(...DARK);
    doc.setFontSize(9);
    doc.text(`Prepared for: ${userName}`, 14, startY + 2);
  }

  autoTable(doc, {
    startY: startY + 14,
    head: [['Match', 'Title', 'Agency', 'NAICS', 'Value', 'Deadline', 'Days Left', 'Status']],
    body: opportunities.map(o => [
      o.aiMatchScore ? `${o.aiMatchScore}%` : '—',
      (o.title || '').substring(0, 60),
      (o.agency || '').substring(0, 35),
      o.naicsCode || '—',
      fmtVal(o.estimatedValue),
      fmtDate(o.dueDate),
      daysLabel(o.dueDate),
      o.status || 'active'
    ]),
    headStyles:     { fillColor: BRAND_COLOR, textColor: [255,255,255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles:     { fontSize: 7.5, textColor: DARK },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 38, halign: 'center' },
      1: { cellWidth: 170 },
      2: { cellWidth: 120 },
      3: { cellWidth: 55, halign: 'center' },
      4: { cellWidth: 60, halign: 'right' },
      5: { cellWidth: 70, halign: 'center' },
      6: { cellWidth: 60, halign: 'center' },
      7: { cellWidth: 50, halign: 'center' }
    },
    didDrawCell: (data) => {
      // Colour-code Days Left column (index 6)
      if (data.section === 'body' && data.column.index === 6) {
        const dl = daysLeft(opportunities[data.row.index]?.dueDate);
        if (dl !== null && dl >= 0 && dl <= 7) {
          doc.setFillColor(...(dl <= 3 ? RED_BG : AMBER_BG));
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(...(dl <= 3 ? RED_TEXT : AMBER_TEXT));
          doc.setFontSize(7.5);
          doc.text(data.cell.text[0] || '', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 2, { align: 'center' });
        }
      }
    },
    margin: { left: 14, right: 14 }
  });

  addFooter(doc);
  doc.save(`sambid-notify-opportunities-${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ═════════════════════════════════════════════════════════════════════════════
// 2.  OPPORTUNITIES LIST  →  CSV (Excel)
// ═════════════════════════════════════════════════════════════════════════════
export const exportOpportunitiesCSV = (opportunities) => {
  const headers = ['Match Score', 'Title', 'Agency', 'NAICS Code', 'Set-Aside', 'Estimated Value', 'Posted Date', 'Due Date', 'Days Left', 'Status', 'SAM URL'];
  const rows    = opportunities.map(o => [
    o.aiMatchScore ?? '',
    o.title        ?? '',
    o.agency       ?? '',
    o.naicsCode    ?? '',
    o.setAside     ?? '',
    o.estimatedValue ?? '',
    fmtDate(o.postedDate),
    fmtDate(o.dueDate),
    daysLabel(o.dueDate),
    o.status       ?? '',
    o.url          ?? ''
  ]);

  const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  downloadBlob(csv, `sambid-notify-opportunities-${new Date().toISOString().slice(0, 10)}.csv`);
};

// ═════════════════════════════════════════════════════════════════════════════
// 3.  SINGLE OPPORTUNITY  →  PDF (detailed report)
// ═════════════════════════════════════════════════════════════════════════════
export const exportSingleOpportunityPDF = (opp, matchReasons = []) => {
  const doc    = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW  = doc.internal.pageSize.getWidth();
  let   y      = addHeader(doc, 'Opportunity Detail Report', opp.agency || '');
  y += 10;

  // Title block
  doc.setFillColor(245, 247, 255);
  doc.roundedRect(14, y, pageW - 28, 52, 4, 4, 'F');
  doc.setTextColor(...BRAND_COLOR);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text((opp.title || '').substring(0, 80), 22, y + 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`${opp.agency || ''}  ·  NAICS ${opp.naicsCode || '—'}  ·  ${opp.setAside || 'Full & Open Competition'}`, 22, y + 36);
  y += 66;

  // Key details grid
  const details = [
    ['Estimated Value', fmtVal(opp.estimatedValue)],
    ['Posted Date',     fmtDate(opp.postedDate)],
    ['Response Due',    fmtDate(opp.dueDate)],
    ['Days Remaining',  daysLabel(opp.dueDate)],
    ['NAICS Code',      opp.naicsCode || '—'],
    ['PSC Code',        opp.pscCode   || '—'],
    ['Set-Aside',       opp.setAside  || 'None'],
    ['Source',          opp.source?.toUpperCase() || 'SAM.GOV'],
  ];

  autoTable(doc, {
    startY: y,
    head:   [['Field', 'Value', 'Field', 'Value']],
    body: [
      [details[0][0], details[0][1], details[1][0], details[1][1]],
      [details[2][0], details[2][1], details[3][0], details[3][1]],
      [details[4][0], details[4][1], details[5][0], details[5][1]],
      [details[6][0], details[6][1], details[7][0], details[7][1]],
    ],
    headStyles:  { fillColor: BRAND_COLOR, textColor: [255,255,255], fontSize: 8 },
    bodyStyles:  { fontSize: 8.5, textColor: DARK },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100, fillColor: [248,250,252] },
      1: { cellWidth: 155 },
      2: { fontStyle: 'bold', cellWidth: 100, fillColor: [248,250,252] },
      3: { cellWidth: 155 }
    },
    margin: { left: 14, right: 14 }
  });

  y = doc.lastAutoTable.finalY + 16;

  // Match reasons
  if (matchReasons.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Why This Matches You', 14, y);
    y += 12;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    matchReasons.forEach(r => {
      doc.text(`  ${r}`, 14, y);
      y += 12;
    });
    y += 6;
  }

  // Description
  if (opp.description) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Description', 14, y);
    y += 12;

    const maxChars = 1200;
    const desc     = opp.description.substring(0, maxChars) + (opp.description.length > maxChars ? '…' : '');
    const wrapped  = doc.splitTextToSize(desc, pageW - 28);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(wrapped, 14, y);
    y += wrapped.length * 11 + 8;
  }

  // URL
  if (opp.url && opp.url !== '#') {
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND_COLOR);
    doc.text(`Source: ${opp.url}`, 14, y + 6);
  }

  addFooter(doc);
  const filename = `opportunity-${(opp.title || 'detail').substring(0, 30).replace(/\s+/g, '-').toLowerCase()}.pdf`;
  doc.save(filename);
};

// ═════════════════════════════════════════════════════════════════════════════
// 4.  BID PIPELINE  →  PDF
// ═════════════════════════════════════════════════════════════════════════════
const STAGE_LABELS = {
  saved:          'Saved',
  researching:    'Researching',
  proposal_draft: 'Drafting Proposal',
  submitted:      'Submitted',
  won:            'Won',
  lost:           'Lost'
};

export const exportPipelinePDF = (columns, stats) => {
  const doc    = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const statsLine = `Total: ${stats?.total || 0}  |  Active: ${stats?.active || 0}  |  Submitted: ${stats?.submitted || 0}  |  Win Rate: ${stats?.winRate != null ? stats.winRate + '%' : '—'}`;
  let y = addHeader(doc, 'Bid Pipeline Report', statsLine);
  y += 14;

  const allRows = [];
  Object.entries(columns).forEach(([stageId, items]) => {
    items.forEach(item => {
      const opp = item.opportunity;
      if (!opp) return;
      allRows.push([
        STAGE_LABELS[stageId] || stageId,
        (opp.title || '').substring(0, 60),
        (opp.agency || '').substring(0, 35),
        fmtVal(opp.estimatedValue),
        fmtDate(opp.dueDate),
        daysLabel(opp.dueDate),
        item.pipelineNotes ? item.pipelineNotes.substring(0, 40) : '—'
      ]);
    });
  });

  const stageColors = {
    'Saved':            [229, 231, 235],
    'Researching':      [219, 234, 254],
    'Drafting Proposal':[224, 231, 255],
    'Submitted':        [254, 243, 199],
    'Won':              [220, 252, 231],
    'Lost':             [254, 226, 226],
  };

  autoTable(doc, {
    startY: y,
    head: [['Stage', 'Opportunity Title', 'Agency', 'Est. Value', 'Due Date', 'Days Left', 'Notes']],
    body: allRows,
    headStyles:  { fillColor: BRAND_COLOR, textColor: [255,255,255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles:  { fontSize: 7.5, textColor: DARK },
    columnStyles: {
      0: { cellWidth: 80  },
      1: { cellWidth: 165 },
      2: { cellWidth: 115 },
      3: { cellWidth: 60, halign: 'right' },
      4: { cellWidth: 70, halign: 'center' },
      5: { cellWidth: 65, halign: 'center' },
      6: { cellWidth: 95 }
    },
    willDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const color = stageColors[data.cell.text[0]] || [255,255,255];
        doc.setFillColor(...color);
      }
    },
    margin: { left: 14, right: 14 }
  });

  addFooter(doc);
  doc.save(`sambid-notify-pipeline-${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ═════════════════════════════════════════════════════════════════════════════
// 5.  BID PIPELINE  →  CSV (Excel)
// ═════════════════════════════════════════════════════════════════════════════
export const exportPipelineCSV = (columns) => {
  const headers = ['Stage', 'Title', 'Agency', 'NAICS', 'Est. Value', 'Due Date', 'Days Left', 'Notes', 'Saved Date'];
  const rows    = [];

  Object.entries(columns).forEach(([stageId, items]) => {
    items.forEach(item => {
      const opp = item.opportunity;
      if (!opp) return;
      rows.push([
        STAGE_LABELS[stageId] || stageId,
        opp.title          ?? '',
        opp.agency         ?? '',
        opp.naicsCode      ?? '',
        opp.estimatedValue ?? '',
        fmtDate(opp.dueDate),
        daysLabel(opp.dueDate),
        item.pipelineNotes ?? '',
        fmtDate(item.savedAt)
      ]);
    });
  });

  const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  downloadBlob(csv, `sambid-notify-pipeline-${new Date().toISOString().slice(0, 10)}.csv`);
};

// ═════════════════════════════════════════════════════════════════════════════
// 6a. SAVED OPPORTUNITIES  →  PDF
// ═════════════════════════════════════════════════════════════════════════════
export const exportSavedPDF = (saved) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, W, 52, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont(undefined, 'bold');
  doc.text(BRAND, 30, 24);
  doc.setFontSize(10); doc.setFont(undefined, 'normal');
  doc.text('Saved Opportunities Report', 30, 42);
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}`, W - 30, 42, { align: 'right' });
  doc.setTextColor(...DARK);

  const rows = saved.map(s => {
    const opp  = s.opportunity || s;
    const days = daysLeft(opp.dueDate);
    return [
      s.status ?? 'saved',
      opp.title ?? '',
      opp.agency ?? '',
      opp.naicsCode ?? '',
      fmtVal(opp.estimatedValue),
      fmtDate(opp.dueDate),
      daysLabel(opp.dueDate),
      s.notes ?? '',
    ];
  });

  autoTable(doc, {
    startY: 64,
    head: [['Status', 'Title', 'Agency', 'NAICS', 'Est. Value', 'Due Date', 'Days Left', 'Notes']],
    body: rows,
    styles: { fontSize: 7.5, cellPadding: 5, overflow: 'linebreak' },
    headStyles: { fillColor: BRAND_COLOR, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 52 },
      1: { cellWidth: 180 },
      2: { cellWidth: 110 },
      3: { cellWidth: 52 },
      4: { cellWidth: 64 },
      5: { cellWidth: 72 },
      6: { cellWidth: 68 },
      7: { cellWidth: 120 },
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const d = daysLeft(saved[data.row.index]?.opportunity?.dueDate ?? saved[data.row.index]?.dueDate);
        if (d !== null && d < 0)  { data.cell.styles.fillColor = RED_BG;   data.cell.styles.textColor = RED_TEXT; }
        else if (d !== null && d <= 7) { data.cell.styles.fillColor = AMBER_BG; data.cell.styles.textColor = AMBER_TEXT; }
        else if (d !== null)       { data.cell.styles.fillColor = GREEN_BG; data.cell.styles.textColor = GREEN_TEXT; }
      }
    },
  });

  doc.save(`sambid-notify-saved-${new Date().toISOString().slice(0, 10)}.pdf`);
};

// 6b. SAVED OPPORTUNITIES  →  CSV
// ═════════════════════════════════════════════════════════════════════════════
export const exportSavedCSV = (saved) => {
  const headers = ['Status', 'Title', 'Agency', 'NAICS', 'Est. Value', 'Due Date', 'Days Left', 'Notes', 'Saved Date'];
  const rows    = saved.map(s => {
    const opp = s.opportunity || s;
    return [
      s.status        ?? 'saved',
      opp.title       ?? '',
      opp.agency      ?? '',
      opp.naicsCode   ?? '',
      opp.estimatedValue ?? '',
      fmtDate(opp.dueDate),
      daysLabel(opp.dueDate),
      s.notes         ?? '',
      fmtDate(s.savedAt)
    ];
  });

  const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  downloadBlob(csv, `sambid-notify-saved-${new Date().toISOString().slice(0, 10)}.csv`);
};


// ═════════════════════════════════════════════════════════════════════════════
// 6.  SAMBID COMPETITIVE REPORT  →  PDF
// ═════════════════════════════════════════════════════════════════════════════

const WHITE = [255, 255, 255];
const LIGHT_BG = [248, 250, 252];
const RED_ICON = [220, 38, 38];
const GREEN_ICON = [22, 163, 74];

const addCoverPage = (doc) => {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Full indigo background
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, W, H, 'F');

  // Brand
  doc.setTextColor(...WHITE);
  doc.setFontSize(42);
  doc.setFont('helvetica', 'bold');
  doc.text('SamBid', W / 2, H * 0.32, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('The Only Platform That Finds, Wins & Delivers', W / 2, H * 0.39, { align: 'center' });
  doc.text('Federal Contracts', W / 2, H * 0.43, { align: 'center' });

  // Divider line
  doc.setDrawColor(255, 255, 255, 80);
  doc.setLineWidth(0.5);
  doc.line(W * 0.3, H * 0.48, W * 0.7, H * 0.48);

  // Stats
  doc.setFontSize(11);
  const stats = ['57 Features  |  10 AI Tools  |  20 Exclusive Features  |  4 Data Sources'];
  doc.text(stats[0], W / 2, H * 0.54, { align: 'center' });

  // Bottom
  doc.setFontSize(9);
  doc.text('Competitive Intelligence Report', W / 2, H * 0.72, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, W / 2, H * 0.76, { align: 'center' });
  doc.text('www.sambid.co', W / 2, H * 0.82, { align: 'center' });
  doc.setFontSize(7);
  doc.text('CONFIDENTIAL — For Authorized Recipients Only', W / 2, H * 0.92, { align: 'center' });
};

const addSectionTitle = (doc, y, title, icon) => {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(14, y, 4, 16, 'F');
  doc.setTextColor(...BRAND_COLOR);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`${icon}  ${title}`, 24, y + 12);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(14, y + 20, W - 14, y + 20);
  return y + 28;
};

const checkPage = (doc, y, need = 60) => {
  if (y + need > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    return 30;
  }
  return y;
};

export const exportSamBidReport = () => {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });

  // ── Page 1: Cover ────────────────────────────────────────────
  addCoverPage(doc);

  // ── Page 2: The 7-Step Gap ───────────────────────────────────
  doc.addPage();
  let y = addHeader(doc, 'Competitive Intelligence Report', 'What Competitors Do vs. What We Do');
  y = addSectionTitle(doc, y, 'The 7-Step Gap — Why Competitors Fall Short', '');

  autoTable(doc, {
    startY: y,
    head: [['Step', 'What Business Needs', 'Competitors', 'SamBid']],
    body: [
      ['1. Find', 'Contracts matched to my NAICS', 'Show a list, you figure it out', 'Auto-matched, AI-scored 0-100%'],
      ['2. Understand', 'Full contract details', 'Basic title + description', '40+ fields from SAM.gov'],
      ['3. Decide', 'Should I bid? Real data', 'Nothing — you guess', 'AI + real competitors from USASpending'],
      ['4. Write', 'Professional proposal', 'Nothing — hire $15K consultant', 'AI writes 7-section proposal'],
      ['5. Submit', 'Manage the bid process', 'Nothing — you do it alone', 'Managed service: we bid for you'],
      ['6. Deliver', 'Workforce & milestones', 'Nothing — platform disappears', 'Subcontracting: quotes, milestones, alerts'],
      ['7. Get Paid', 'Track Net-30 payment', 'Nothing', 'Gov payment tracker + auto-alerts'],
    ],
    headStyles: { fillColor: BRAND_COLOR, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold' }, 1: { cellWidth: 130 }, 2: { cellWidth: 155 }, 3: { cellWidth: 155 } },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 16;

  // Callout box
  y = checkPage(doc, y, 40);
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 28, 4, 4, 'F');
  doc.setTextColor(146, 64, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Competitors cover Step 1. SamBid covers all 7.', doc.internal.pageSize.getWidth() / 2, y + 17, { align: 'center' });

  // ── Page 3: Feature Count Comparison ─────────────────────────
  doc.addPage();
  y = addHeader(doc, 'Competitive Intelligence Report', 'Feature Count Comparison');
  y = addSectionTitle(doc, y, 'Total Feature Count: SamBid vs. Every Competitor', '');

  autoTable(doc, {
    startY: y,
    head: [['Category', 'SamBid', 'GovWin ($5K/mo)', 'GovTribe ($458/mo)', 'BidPrime ($995/mo)', 'GovDash (Custom)', 'SAM.gov (Free)']],
    body: [
      ['AI Tools', '10', '0', '0', '0', '2', '0'],
      ['Data Sources in AI', '4', '0', '0', '0', '1', '0'],
      ['Smart Filter Types', '10', '3', '4', '3', '2', '2'],
      ['Export Formats', '8', '2', '0', '1', '1', '0'],
      ['Alert Types', '8', '1', '1', '1', '1', '1'],
      ['Pipeline Features', '6', '0', '0', '0', '2', '0'],
      ['Post-Win Features', '8', '0', '0', '0', '0', '0'],
      ['Workspace Features', '7', '2', '0', '0', '0', '0'],
      ['TOTAL', '57', '8', '5', '5', '6', '3'],
    ],
    headStyles: { fillColor: BRAND_COLOR, textColor: WHITE, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: DARK, halign: 'center' },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 100 }, 1: { textColor: BRAND_COLOR, fontStyle: 'bold' } },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.row.index === 8) {
        doc.setFont('helvetica', 'bold');
      }
    },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 20;

  // SamBid bar highlight
  y = checkPage(doc, y, 50);
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 36, 4, 4, 'F');
  doc.setTextColor(...BRAND_COLOR);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SamBid: 57 Features', 30, y + 15);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('Next best competitor (GovWin): 8 features — SamBid has 7x more at 1/50th the price', 30, y + 28);

  // ── Page 4-5: Competitor Missing Features ────────────────────
  const competitors = [
    { name: 'GovWin IQ (Deltek)', price: '$2,000-$5,000/mo', have: 'Deep historical data, budget forecasts, agency contacts', missing: [
      'No AI analysis of any kind', 'No proposal writing', 'No match scoring', 'No calendar integration', 'No bid pipeline / kanban', 'No managed bidding', 'No subcontracting system',
      'No free tier', 'No capability statement generator', 'No RFP analyzer', 'No Go/No-Go tool', 'No sources sought generator', 'No certification expiry alerts',
      'No auto deadline alerts (7-day, 3-day)', 'No gov payment tracking', 'No vendor quote management', 'No milestone-based payments',
    ]},
    { name: 'GovTribe', price: '$150-$458/mo', have: 'Multi-source aggregation, clean UI, teaming data', missing: [
      'No AI match scoring', 'No AI bid/no-bid analysis', 'No AI proposal writing', 'No AI competitive intel', 'No AI risk assessment', 'No AI Go/No-Go matrix',
      'No AI capability statement', 'No AI sources sought', 'No AI RFP analyzer', 'No AI win predictions', 'No smart date presets', 'No calendar integration',
      'No kanban bid pipeline', 'No past performance repo (SF-330)', 'No managed bidding', 'No subcontracting', 'No vendor quotes', 'No milestone tracking',
      'No gov payment tracking', 'No cert expiry alerts', 'No push notifications', 'No proposal PDF themes', 'No free tier',
    ]},
    { name: 'BidPrime', price: '$495-$995/mo', have: 'Broadest coverage (110K agencies, state+local+tribal)', missing: [
      'No AI features (zero)', 'No match scoring', 'No competitor intelligence', 'No proposal writing', 'No RFP analysis', 'No Go/No-Go tool',
      'No capability statement', 'No sources sought', 'No smart filters with presets', 'No NAICS auto-dropdown', 'No active filter tags', 'No calendar integration',
      'No kanban pipeline', 'No past performance repo', 'No company workspace', 'No SAM.gov entity verification', 'No managed bidding', 'No subcontracting',
      'No deadline auto-alerts', 'No gov payment tracking', 'No referral program', 'No free tier',
    ]},
    { name: 'GovDash', price: 'Custom (Enterprise)', have: 'AI proposals (partial), capture management', missing: [
      'No AI bid analysis with real USASpending data', 'No AI Go/No-Go 12-factor matrix', 'No AI capability statement', 'No AI sources sought response',
      'No AI risk assessment with evidence', 'No company past wins auto-imported', 'No SAM.gov entity verification', 'No smart date presets', 'No active filter tags',
      'No kanban pipeline with win rate', 'No deadline calendar', 'No managed bidding', 'No subcontracting', 'No vendor quotes', 'No milestone tracking',
      'No gov payment tracking', 'No auto deadline alerts', 'No cert expiry alerts', 'No weekly project summaries', 'No free tier', 'No transparent pricing',
    ]},
    { name: 'SAM.gov', price: 'Free', have: 'Official government data source (required for registration)', missing: [
      'No AI (anything)', 'No match scoring', 'No smart filters', 'No competitor data (separate site)', 'No proposal tools', 'No export (PDF/CSV)',
      'No calendar integration', 'No bid pipeline', 'No custom alerts', 'No push notifications', 'No team workspace', 'No past performance repo',
      'No managed bidding', 'No subcontracting', 'Terrible user experience',
    ]},
  ];

  for (const comp of competitors) {
    doc.addPage();
    y = addHeader(doc, 'Competitive Intelligence Report', `vs. ${comp.name}`);
    y = addSectionTitle(doc, y, `${comp.name}  —  ${comp.price}`, '');

    // What they have (green box)
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 24, 3, 3, 'F');
    doc.setTextColor(22, 101, 52);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('What they have: ', 20, y + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(comp.have, 88, y + 15);
    y += 34;

    // Missing features title
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`What they're MISSING (${comp.missing.length} features SamBid has):`, 14, y + 4);
    y += 16;

    // Missing list in two columns
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);
    const colW = (doc.internal.pageSize.getWidth() - 28) / 2;
    const half = Math.ceil(comp.missing.length / 2);
    for (let i = 0; i < comp.missing.length; i++) {
      y = checkPage(doc, y, 14);
      const x = i < half ? 20 : 20 + colW;
      const row = i < half ? i : i - half;
      const ry = (i < half ? y : y - (half * 13)) + row * 13;

      doc.setTextColor(...RED_ICON);
      doc.text('✗', x, ry + 2);
      doc.setTextColor(...DARK);
      doc.text(comp.missing[i], x + 12, ry + 2);
    }
    if (comp.missing.length > half) y += half * 13 + 6;
    else y += comp.missing.length * 13 + 6;
  }

  // ── Page: 10 AI Tools ────────────────────────────────────────
  doc.addPage();
  y = addHeader(doc, 'Competitive Intelligence Report', '10 AI Tools — Powered by Real Government Data');
  y = addSectionTitle(doc, y, '10 AI Tools — Every One Uses 4 Real Data Sources', '');

  // Data sources box
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 44, 4, 4, 'F');
  doc.setTextColor(...BRAND_COLOR);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Before any AI generates anything, it pulls from:', 20, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  doc.text('1. SAM.gov Opportunities API — 40+ fields per contract (dates, contacts, office chain, award details)', 20, y + 26);
  doc.text('2. USASpending.gov API — Real companies who won similar contracts, actual dollar amounts', 20, y + 34);
  doc.text('3. SAM.gov Entity API — Your verified UEI, CAGE, certifications, business types', 322, y + 26);
  doc.text('4. Your Past Wins — Auto-imported contract history from USASpending', 322, y + 34);
  y += 54;

  const aiTools = [
    ['AI Summarize', 'Reads all 40+ fields → structured summary with dates, contacts, requirements, red flags'],
    ['AI Bid Analysis', 'Real competitors from USASpending → BID/NO-BID, win probability, suggested bid range with actual $ numbers'],
    ['AI Competitive Intel', 'Names REAL companies, their win counts, total values → compares against YOUR profile and past wins'],
    ['AI Risk Assessment', 'Rates 6 categories (Technical, Financial, Schedule, Competitive, Compliance, Performance) with real evidence'],
    ['AI Full Proposal', '7-section proposal using your real past wins, real competitor pricing, real contract data → PDF in 6 themes'],
    ['AI RFP Analyzer', 'Upload PDF → requirements extracted, compliance checklist (15-20 items), GO/NO-GO recommendation'],
    ['AI Go/No-Go', '12-factor scoring matrix (0-10 each) → GO / NO-GO / CONDITIONAL with total score'],
    ['AI Capability Statement', 'Professional one-pager with NAICS, certifications, competencies → hand to any contracting officer'],
    ['AI Sources Sought', '8-section pre-RFP response → get on agency radar BEFORE solicitation drops'],
    ['AI Win Predictions', 'Win probability scoring + urgency level + personalized 5-step bid strategy per contract'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['#', 'AI Tool', 'What It Does (Using Real Government Data)']],
    body: aiTools.map((t, i) => [String(i + 1), t[0], t[1]]),
    headStyles: { fillColor: BRAND_COLOR, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: { 0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 100, fontStyle: 'bold', textColor: BRAND_COLOR } },
    margin: { left: 14, right: 14 },
  });

  // ── Page: Managed Bidding + Subcontracting ───────────────────
  doc.addPage();
  y = addHeader(doc, 'Competitive Intelligence Report', 'Managed Bidding & Subcontracting');
  y = addSectionTitle(doc, y, 'Managed Bidding — We Bid For You (Zero Competitors Offer This)', '');

  const managedSteps = [
    ['1', 'You Sign Up', 'Apply for managed service from your company dashboard'],
    ['2', 'We Find Contracts', 'Our team identifies opportunities matching your NAICS, certs, past performance'],
    ['3', 'We Write Proposals', 'AI + GovCon team writes professional proposals using your real data'],
    ['4', 'We Submit Bids', 'We manage the entire submission process'],
    ['5', 'You Win', 'You pay commission (% of contract value) — ONLY when you win. No win = no fee'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Step', 'Action', 'Detail']],
    body: managedSteps.map(s => s),
    headStyles: { fillColor: [22, 163, 74], textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: DARK },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: { 0: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 110, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 16;

  y = addSectionTitle(doc, y, 'Subcontracting System — Post-Win Delivery (Zero Competitors)', '');

  const subSteps = [
    ['1', 'Create Project', 'Auto-copies all contract details from won bid'],
    ['2', 'Open RFQ', 'Post project for vendor quotations worldwide'],
    ['3', 'Compare Quotes', 'Side-by-side: amount, timeline, approach, cost breakdown, location'],
    ['4', 'Select Vendor', 'Accept best quote → all others auto-rejected → vendor gets email notification'],
    ['5', 'Set Milestones', 'Title, due date, payment amount, deliverables checklist'],
    ['6', 'Track Progress', '0-100% bar + timestamped notes. Auto-alerts at 7 and 3 days before deadline'],
    ['7', 'Delivery', 'Vendor delivers to government point. Full address + POC tracked in system'],
    ['8', 'Gov Payment', 'Net-30 auto-calculated. Track pending/received/partial. Auto-alert if overdue'],
    ['9', 'Pay Vendor', 'Per-milestone payments with reference numbers'],
    ['10', 'Auto-Complete', 'All milestones paid → project auto-completes → everyone notified'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Step', 'Action', 'Detail']],
    body: subSteps.map(s => s),
    headStyles: { fillColor: BRAND_COLOR, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: { 0: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 100, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });

  // ── Page: Pricing ────────────────────────────────────────────
  doc.addPage();
  y = addHeader(doc, 'Competitive Intelligence Report', 'Pricing Comparison');
  y = addSectionTitle(doc, y, 'Traditional Cost vs. SamBid', '');

  autoTable(doc, {
    startY: y,
    head: [['What You Need', 'Traditional Way', 'SamBid Way']],
    body: [
      ['Find matching contracts', 'SAM.gov (free but 40 hrs/mo manual)', 'Auto-matched, AI-scored ($0/mo)'],
      ['Know who won similar contracts', 'GovWin IQ ($5,000/mo)', 'Built-in from USASpending ($0/mo)'],
      ['Write one proposal', 'Consultant ($5,000-$20,000)', 'AI Proposal Writer ($99/mo unlimited)'],
      ['Bid/No-Bid decision', 'BD team ($120K/yr salary)', 'AI Bid Analysis ($99/mo)'],
      ['Competitive intelligence', 'Market research firm ($10K+)', 'AI Competitive Analysis ($99/mo)'],
      ['Someone to bid for you', 'GovCon consultant ($200/hr)', 'Managed Service (commission on win)'],
      ['Deliver the contract', 'Hire staff or scramble', 'Subcontracting system (built-in)'],
      ['TOTAL', '$200,000+/year', '$99/month'],
    ],
    headStyles: { fillColor: BRAND_COLOR, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 150 } },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.row.index === 7) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
      }
    },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 20;

  y = addSectionTitle(doc, y, 'SamBid Plans', '');
  autoTable(doc, {
    startY: y,
    head: [['', 'Free', 'Starter $49/mo', 'Pro $99/mo', 'Enterprise $499/mo']],
    body: [
      ['Contract matches', '50/mo', '500/mo', '3,000/mo', 'Unlimited'],
      ['Smart filters', 'Basic', 'Full', 'Full', 'Full'],
      ['AI tools (10)', '—', '—', 'All 10', 'All 10'],
      ['Proposal builder', '—', '—', 'Unlimited', 'Unlimited'],
      ['Pipeline + Calendar', '—', 'Yes', 'Yes', 'Yes'],
      ['Past performance repo', '—', '—', 'Yes', 'Yes'],
      ['Market research', '—', '—', '—', 'Yes'],
      ['Managed bidding', '—', '—', '—', 'Yes'],
      ['Subcontracting', '—', '—', '—', 'Yes'],
      ['Support', 'Email', 'Priority', 'Priority', 'Dedicated'],
    ],
    headStyles: { fillColor: BRAND_COLOR, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: DARK, halign: 'center' },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 110 }, 3: { textColor: BRAND_COLOR, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });

  // ── Final Page: Summary ──────────────────────────────────────
  doc.addPage();
  const FW = doc.internal.pageSize.getWidth();
  const FH = doc.internal.pageSize.getHeight();

  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, FW, FH, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('The Bottom Line', FW / 2, 80, { align: 'center' });

  const summaryStats = [
    ['57', 'Total Features'],
    ['10', 'AI Tools'],
    ['20', 'Exclusive Features'],
    ['4', 'Real Data Sources'],
    ['$99/mo', 'Full AI Suite'],
    ['$0', 'Starting Price'],
  ];

  const boxW = 150;
  const boxH = 60;
  const cols = 3;
  const startX = (FW - cols * boxW - (cols - 1) * 12) / 2;
  summaryStats.forEach((s, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const bx = startX + col * (boxW + 12);
    const by = 120 + row * (boxH + 12);
    doc.setFillColor(255, 255, 255, 25);
    doc.roundedRect(bx, by, boxW, boxH, 6, 6, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(s[0], bx + boxW / 2, by + 28, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(s[1], bx + boxW / 2, by + 44, { align: 'center' });
  });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Other platforms show you contracts.', FW / 2, 300, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('SamBid helps you find them, win them, and deliver them.', FW / 2, 320, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('FIND  →  ANALYZE  →  WRITE  →  WIN  →  DELIVER  →  GET PAID', FW / 2, 370, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('www.sambid.co', FW / 2, 430, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('From Discovery to Delivery — Powered by Real Government Data', FW / 2, 450, { align: 'center' });

  // ── Footers ──────────────────────────────────────────────────
  addFooter(doc);

  doc.save(`SamBid-Competitive-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
};
