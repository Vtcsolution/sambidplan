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
