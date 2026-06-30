import { useState, useRef, useEffect, useCallback } from 'react';
import { FileEdit, Sparkles, Copy, Download, CheckCircle, Loader2, Lock,
         Search, ChevronDown, ChevronUp, Building2, DollarSign,
         RefreshCw, BookOpen, Target, Briefcase, Users, TrendingUp, FileText,
         Palette, Upload, X, Pencil, Pipette, User, MapPin,
         Calendar, Hash, Mail, Phone, UserCheck } from 'lucide-react';
import { aiAPI, savedAPI } from '../services/api';
import { AICreditsBar } from '../components/AICreditsBar';
import { useUserPlan } from '../hooks/useUserPlan';
import { usePlans } from '../hooks/usePlans';
import HowItWorks from '../components/HowItWorks';
import jsPDF from 'jspdf';
import AIResponseRenderer from '../components/AIResponseRenderer';

// ── Section meta ──────────────────────────────────────────────────────────────
const SECTION_META = [
  { key: 'COVER LETTER',       icon: FileText,   color: 'text-indigo-500' },
  { key: 'EXECUTIVE SUMMARY',  icon: Target,     color: 'text-blue-500'   },
  { key: 'TECHNICAL APPROACH', icon: Sparkles,   color: 'text-violet-500' },
  { key: 'MANAGEMENT PLAN',    icon: Users,      color: 'text-green-500'  },
  { key: 'PAST PERFORMANCE',   icon: TrendingUp, color: 'text-emerald-500'},
  { key: 'PRICING STRATEGY',   icon: DollarSign, color: 'text-yellow-500' },
  { key: 'CONCLUSION',         icon: BookOpen,   color: 'text-rose-500'   },
];

const PRESET_THEMES = [
  { name: 'Indigo',  primary: '#4f46e5', accent: '#818cf8' },
  { name: 'Navy',    primary: '#1e3a8a', accent: '#3b82f6' },
  { name: 'Forest',  primary: '#166534', accent: '#4ade80' },
  { name: 'Crimson', primary: '#9b1c1c', accent: '#f87171' },
  { name: 'Slate',   primary: '#1e293b', accent: '#94a3b8' },
  { name: 'Teal',    primary: '#0f766e', accent: '#2dd4bf' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = (hex || '#4f46e5').replace('#', '');
  return [parseInt(h.slice(0,2),16)||79, parseInt(h.slice(2,4),16)||70, parseInt(h.slice(4,6),16)||229];
}
function lightenRgb(hex, amt = 0.88) {
  return hexToRgb(hex).map(c => Math.round(c + (255-c)*amt));
}

function parseSections(proposal) {
  if (!proposal) return [];
  const sections = [];
  const lines = proposal.split('\n');
  let current = null;
  for (const line of lines) {
    const upper = line.trim().toUpperCase().replace(/[#*:\-\.]/g, '').trim();
    const match = SECTION_META.find(s => upper.startsWith(s.key));
    if (match) {
      if (current) sections.push(current);
      current = { ...match, title: line.trim().replace(/^#+\s*/,'').replace(/\*\*/g,''), body: '' };
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line;
    } else {
      if (!sections.length) sections.push({ key:'PREAMBLE', icon:FileText, color:'text-gray-500', title:'Introduction', body:line });
      else sections[0].body += '\n' + line;
    }
  }
  if (current) sections.push(current);
  return sections.filter(s => s.body?.trim());
}

// Comprehensive placeholder replacement
function applyEdits(text, f) {
  if (!text) return text;
  const name     = f.senderName      || '';
  const title    = f.senderTitle     || '';
  const contact  = f.agencyContact   || '';
  const recTitle = f.recipientTitle  || '';
  const addr1    = f.agencyAddr1     || '';
  const addr2    = f.agencyAddr2     || '';
  const date     = f.date            || '';
  const email    = f.email           || '';
  const phone    = f.phone           || '';
  const biz      = localStorage.getItem('businessName') || name;
  const fullAddr = [addr1, addr2].filter(Boolean).join(', ');
  const contactInfo = [name, title].filter(Boolean).join(', ');

  return text
    // Date
    .replace(/\[Date\]/gi,             date || '[Date]')
    .replace(/\[Today'?s? ?Date\]/gi,  date || '[Date]')
    // Recipient / Agency contact
    .replace(/\[Federal Agency Contact Name\]/gi,        contact || '[Contact Name]')
    .replace(/\[Agency Contact Name\]/gi,                contact || '[Contact Name]')
    .replace(/\[Recipient Name\]/gi,                     contact || '[Contact Name]')
    .replace(/\[Contracting Officer(?:'s)? ?Name?\]/gi,  contact || '[Contact Name]')
    .replace(/\[Program Manager\]/gi,                    contact || '[Contact Name]')
    .replace(/Dear \[Contracting Officer(?:'s)? ?Name?\],?/gi, contact ? `Dear ${contact},` : 'Dear Contracting Officer,')
    // Recipient title
    .replace(/\[Recipient Title\]/gi,             recTitle || '[Recipient Title]')
    .replace(/\[Contracting Officer Title\]/gi,   recTitle || '[Recipient Title]')
    // Agency address
    .replace(/\[Address Line 1\]/gi,              addr1 || '[Address Line 1]')
    .replace(/\[Address Line 2\]/gi,              addr2 || '[Address Line 2]')
    .replace(/\[Street Address\]/gi,              addr1 || '[Street Address]')
    .replace(/\[Agency Address\]/gi,              fullAddr || '[Agency Address]')
    .replace(/\[City,? State,? ZIP(?: Code)?\]/gi, addr2 || '[City, State, ZIP]')
    .replace(/\[City,? State(?: Zip(?: Code)?)?\]/gi, addr2 || '[City, State]')
    // Sender address (use agency addr as fallback for sender address placeholders)
    .replace(/\[Your Address\]/gi,                addr1 || '[Your Address]')
    .replace(/\[Sender Address\]/gi,              addr1 || '[Your Address]')
    // Sender name
    .replace(/\[Your Full Name\]/gi,              name || '[Your Name]')
    .replace(/\[Your Name\]/gi,                   name || '[Your Name]')
    .replace(/\[Sender'?s? Name\]/gi,             name || '[Your Name]')
    .replace(/\[Name\]/gi,                        name || '[Your Name]')
    // Sender title
    .replace(/\[Your Position\]/gi,               title || '[Your Title]')
    .replace(/\[Your Title\]/gi,                  title || '[Your Title]')
    .replace(/\[Position\]/gi,                    title || '[Your Title]')
    .replace(/\[Job Title\]/gi,                   title || '[Your Title]')
    // Contact info
    .replace(/\[Contact Information\]/gi,         contactInfo || '[Contact Information]')
    .replace(/\[Signature\]/gi,                   name || '[Your Name]')
    // Email / Phone
    .replace(/\[Email Address\]/gi,               email || '[Email Address]')
    .replace(/\[Your Email\]/gi,                  email || '[Email Address]')
    .replace(/\[Phone Number\]/gi,                phone || '[Phone Number]')
    .replace(/\[Your Phone(?: Number)?\]/gi,      phone || '[Phone Number]')
    // Company
    .replace(/\[Company Name\]/gi,                biz || '[Company Name]')
    .replace(/\[Your Company\]/gi,                biz || '[Company Name]');
}

// Extract dominant color from image via canvas
function extractDominantColor(file, onColor) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale  = Math.min(1, 200 / Math.max(img.width, img.height));
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const headerH = Math.max(1, Math.round(canvas.height * 0.25));
      const { data } = ctx.getImageData(0, 0, canvas.width, headerH);
      const buckets = {};
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b, a] = [data[i], data[i+1], data[i+2], data[i+3]];
        if (a < 128) continue;
        const lum = (r+g+b)/3;
        if (lum > 235 || lum < 20) continue;
        const key = `${Math.round(r/24)*24},${Math.round(g/24)*24},${Math.round(b/24)*24}`;
        buckets[key] = (buckets[key]||0)+1;
      }
      const top = Object.entries(buckets).sort((a,b)=>b[1]-a[1])[0];
      if (top) {
        const hex = '#'+top[0].split(',').map(v=>Number(v).toString(16).padStart(2,'0')).join('');
        onColor(hex);
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Pro Gate ──────────────────────────────────────────────────────────────────
function ProGate() {
  const { getMonthly } = usePlans();
  const proPrice = getMonthly('pro');
  const ctaText = proPrice != null ? `Upgrade to Pro — $${proPrice}/mo` : 'Upgrade to Pro';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
        <Lock className="w-10 h-10 text-indigo-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Pro Feature</h2>
      <p className="text-gray-500 max-w-md mb-6">
        The Full AI Proposal Builder generates complete, personalized government proposals with branded PDF export.
        Available on Pro and Enterprise plans.
      </p>
      <a href="/pricing" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
        <Sparkles className="w-4 h-4" />{ctaText}
      </a>
    </div>
  );
}

// ── StepHeader ────────────────────────────────────────────────────────────────
function StepHeader({ n, title, subtitle, color = 'bg-indigo-600' }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-8 h-8 ${color} text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0`}>
        {n}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Saved Opportunity Selector ─────────────────────────────────────────────────
function OpportunitySelector({ selected, onSelect }) {
  const [saved, setSaved]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState('');
  const ref = useRef(null);

  useEffect(() => {
    savedAPI.getAll()
      .then(r => setSaved(r.data?.data || r.data?.saved || []))
      .catch(() => setSaved([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = saved.filter(s => {
    const opp = s.opportunity || s;
    return opp.title?.toLowerCase().includes(search.toLowerCase()) ||
           opp.agency?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 border border-gray-200 rounded-xl text-sm hover:border-indigo-300 transition-colors bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
          {selected ? <span className="truncate text-gray-900">{selected.title}</span>
                    : <span className="text-gray-400">Select from your saved contracts…</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-64 flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search contracts…"
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400" />
            </div>
          </div>
          <div className="overflow-y-auto">
            {loading
              ? <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
              : filtered.length === 0
                ? <p className="text-center py-6 text-gray-400 text-sm">{saved.length === 0 ? 'No saved contracts yet.' : 'No matches.'}</p>
                : filtered.map((item, i) => {
                    const opp = item.opportunity || item;
                    return (
                      <button key={opp._id||i}
                        onClick={() => { onSelect({ id: opp._id||opp.id, title: opp.title, agency: opp.agency }); setOpen(false); setSearch(''); }}
                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{opp.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{opp.agency}</p>
                      </button>
                    );
                  })
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── Individual input — module-level to prevent remount on each keystroke ───────
function ProposalField({ icon: Icon, label, fieldKey, value, placeholder, fields, onChange, type = 'text' }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}{label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange({ ...fields, [fieldKey]: e.target.value })}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
      />
    </div>
  );
}

// ── Section preview card with inline editing ─────────────────────────────────
function SectionCard({ section, index, editFields, onBodyChange }) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState('');
  const textareaRef = useRef(null);
  const Icon = section.icon;

  const startEdit = () => {
    setDraft(applyEdits(section.body, editFields).trim());
    setEditing(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        textareaRef.current.focus();
      }
    }, 50);
  };

  const saveEdit = () => {
    onBodyChange(index, draft);
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft('');
  };

  const handleTextareaInput = (e) => {
    setDraft(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
            <Icon className={`w-4 h-4 ${section.color}`} />
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-400 font-medium">Section {index + 1}</p>
            <p className="text-sm font-semibold text-gray-900">{section.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing && expanded && (
            <span onClick={(e) => { e.stopPropagation(); startEdit(); }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer">
              <Pencil className="w-3 h-3" /> Edit
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-50">
          {editing ? (
            <div className="mt-3">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={handleTextareaInput}
                className="w-full text-sm text-gray-700 leading-relaxed border border-indigo-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-indigo-50/30 font-[inherit]"
                style={{ minHeight: '120px' }}
              />
              <div className="flex items-center gap-2 mt-3">
                <button onClick={saveEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                  <CheckCircle className="w-3.5 h-3.5" /> Save Changes
                </button>
                <button onClick={cancelEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <span className="text-xs text-gray-400 ml-2">Edit the text directly — changes apply to PDF export</span>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <AIResponseRenderer content={applyEdits(section.body, editFields).trim()} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── PDF generation ─────────────────────────────────────────────────────────────
function generateProposalPDF({ proposal, fields, theme, selected, aiProvider, sectionEdits = {} }) {
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' });
  const W     = doc.internal.pageSize.getWidth();
  const H     = doc.internal.pageSize.getHeight();
  const ML    = 22, MR = 22, MB = 14;
  const CW    = W - ML - MR;
  const biz   = localStorage.getItem('businessName') || fields.senderName || 'Company';

  const [pr, pg, pb] = hexToRgb(theme.primaryColor);
  const [lr, lg, lb] = lightenRgb(theme.primaryColor, 0.91);
  const [mr2, mg2, mb2] = lightenRgb(theme.primaryColor, 0.70);

  // ════════════════════════════════════════════════════════════
  // PAGE 1 — PROFESSIONAL COVER PAGE
  // ════════════════════════════════════════════════════════════

  // Colored top band
  const topH = H * 0.44;
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, W, topH, 'F');

  // Decorative circles top-right
  doc.setFillColor(Math.min(255,pr+22), Math.min(255,pg+22), Math.min(255,pb+22));
  doc.circle(W + 10, -8, 52, 'F');
  doc.circle(W - 8, 28, 30, 'F');
  doc.setFillColor(Math.min(255,pr+40), Math.min(255,pg+40), Math.min(255,pb+40));
  doc.circle(W - 2, 8, 18, 'F');

  // "GOVERNMENT CONTRACT PROPOSAL" watermark label (top right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('GOVERNMENT CONTRACT PROPOSAL', W - MR, 14, { align: 'right' });

  // Company logo or name
  let logoBottom = 22;
  if (theme.logoDataUrl) {
    try {
      doc.addImage(theme.logoDataUrl, 'JPEG', ML, 12, 48, 20);
      logoBottom = 36;
    } catch {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(255, 255, 255);
      doc.text(biz, ML, 28);
    }
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(255, 255, 255);
    doc.text(biz, ML, 28);
    logoBottom = 32;
  }

  // Thin white rule under logo
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(ML, logoBottom + 4, ML + 60, logoBottom + 4);

  // "Proposal for" label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('PROPOSAL FOR:', ML, topH - 58);

  // Contract title — big, white, bold
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(255, 255, 255);
  const contractTitle = selected?.title || 'Federal Contract Proposal';
  const titleLines = doc.splitTextToSize(contractTitle, CW - 10);
  titleLines.slice(0, 3).forEach((line, i) => {
    doc.text(line, ML, topH - 47 + i * 11);
  });

  // Agency under title
  if (selected?.agency) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text(selected.agency, ML, topH - 47 + titleLines.slice(0,3).length * 11 + 5);
  }

  // ── Info card (white box) ──────────────────────────────────────────────────
  const cardY = topH + 7;
  const cardH = 52;

  doc.setFillColor(248, 249, 252);
  doc.setDrawColor(lr, lg, lb);
  doc.setLineWidth(0.4);
  doc.roundedRect(ML, cardY, CW, cardH, 3, 3, 'FD');

  // Divider line in card
  doc.setDrawColor(225, 225, 235);
  doc.setLineWidth(0.25);
  doc.line(W/2, cardY + 7, W/2, cardY + cardH - 7);

  // Left: Submitted To
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(pr, pg, pb);
  doc.text('SUBMITTED TO', ML + 8, cardY + 10);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(25, 25, 25);
  doc.text('Federal Agency', ML + 8, cardY + 18);
  if (fields.agencyContact) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(70, 70, 70);
    doc.text(fields.agencyContact + (fields.recipientTitle ? ', ' + fields.recipientTitle : ''), ML + 8, cardY + 25);
  }
  if (fields.agencyAddr1) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 100, 100);
    doc.text(fields.agencyAddr1, ML + 8, cardY + 32);
    if (fields.agencyAddr2) doc.text(fields.agencyAddr2, ML + 8, cardY + 38);
  }

  // Right: Submitted By
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(pr, pg, pb);
  doc.text('SUBMITTED BY', W/2 + 8, cardY + 10);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(25, 25, 25);
  doc.text(biz, W/2 + 8, cardY + 18);
  if (fields.senderName) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(70, 70, 70);
    doc.text(fields.senderName, W/2 + 8, cardY + 25);
    if (fields.senderTitle) doc.text(fields.senderTitle, W/2 + 8, cardY + 31);
    if (fields.email) { doc.setFontSize(8.5); doc.text(fields.email, W/2 + 8, cardY + 38); }
    if (fields.phone) { doc.setFontSize(8.5); doc.text(fields.phone, W/2 + 8, fields.email ? cardY + 44 : cardY + 38); }
  }

  // ── Date / reference strip ─────────────────────────────────────────────────
  const stripY = cardY + cardH + 6;
  doc.setFillColor(pr, pg, pb);
  doc.roundedRect(ML, stripY, CW, 13, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
  doc.text('DATE SUBMITTED:', ML + 6, stripY + 8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(fields.date || new Date().toLocaleDateString(), ML + 46, stripY + 8.5);
  if (aiProvider) {
    doc.setFontSize(7);
    doc.text(aiProvider, W - MR, stripY + 8.5, { align: 'right' });
  }

  // ── Proposal sections list (fills white space between date strip and footer) ─
  const sectListY = stripY + 18;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(110, 110, 120);
  doc.text('THIS PROPOSAL INCLUDES:', ML, sectListY);

  const sectionNames = ['Cover Letter', 'Executive Summary', 'Technical Approach', 'Management Plan', 'Past Performance', 'Pricing Strategy', 'Conclusion'];
  const cols = 3;
  const chipW = (CW - (cols - 1) * 3) / cols;
  sectionNames.forEach((name, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx  = ML + col * (chipW + 3);
    const cy  = sectListY + 7 + row * 13;
    doc.setFillColor(lr, lg, lb);
    doc.roundedRect(cx, cy, chipW, 9, 1.5, 1.5, 'F');
    doc.setFillColor(pr, pg, pb);
    doc.rect(cx, cy, 3, 9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(pr, pg, pb);
    doc.text(String(i + 1).padStart(2, '0'), cx + 5, cy + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(40, 40, 50);
    doc.text(name, cx + 12, cy + 6);
  });

  // ── Confidential notice ────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(140, 140, 150);
  doc.text('CONFIDENTIAL — FOR OFFICIAL USE ONLY', W/2, H - 14, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(175, 175, 185);
  doc.text('This document contains proprietary and confidential information. Unauthorized distribution is prohibited.', W/2, H - 9, { align: 'center' });

  // ════════════════════════════════════════════════════════════
  // PAGES 2+ — CONTENT
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  let y = 20;
  const lineH    = 5.6;
  const paraGap  = 3.5;
  const secGap   = 8;

  // Top accent line on first content page
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, W, 2.5, 'F');
  y = 16;

  // Check and add new page if needed
  const maybeNewPage = (needed = 25) => {
    if (y + needed > H - MB - 14) {
      doc.addPage();
      y = 16;
      // Thin top accent line
      doc.setFillColor(pr, pg, pb);
      doc.rect(0, 0, W, 2.5, 'F');
      return true;
    }
    return false;
  };

  // ── Render body text with bullets + inline bold ────────────────────────────
  const renderBody = (rawText) => {
    if (!rawText?.trim()) return;
    const paras = rawText.split('\n');

    for (const rawLine of paras) {
      const trimmed = rawLine.trim();
      if (!trimmed) { y += paraGap; continue; }

      // Bullet detection: -, •, *, ·, or numbered list
      const bulletMatch = trimmed.match(/^([-•*·]|\d+[.)]) (.+)/);

      if (bulletMatch) {
        const bulletText = bulletMatch[2].trim();
        const wrapped    = doc.splitTextToSize(bulletText, CW - 9);
        maybeNewPage(wrapped.length * lineH + 2);

        // Filled circle bullet
        doc.setFillColor(pr, pg, pb);
        doc.circle(ML + 2.8, y - 1.4, 1.4, 'F');

        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(45, 45, 50);
        wrapped.forEach((wl, wi) => {
          if (wi > 0) { y += lineH; maybeNewPage(lineH); }
          doc.text(wl, ML + 8, y);
        });
        y += lineH + 1.5;

      } else {
        // Normal paragraph — detect **bold** spans
        const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
        const fullText = trimmed.replace(/\*\*/g, '');
        const wrapped  = doc.splitTextToSize(fullText, CW);
        maybeNewPage(wrapped.length * lineH + paraGap);

        // Simple approach: if has bold markers, render word by word; otherwise straight text
        if (parts.length > 1) {
          // Inline bold rendering — render line by line
          doc.setFontSize(10); doc.setTextColor(45, 45, 50);
          let xPos = ML;
          let lineCount = 0;
          parts.forEach(part => {
            const isBold = part.startsWith('**') && part.endsWith('**');
            const content = isBold ? part.slice(2,-2) : part;
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            const words = content.split(/(\s+)/);
            words.forEach(word => {
              const ww = doc.getTextWidth(word);
              if (xPos + ww > ML + CW) {
                y += lineH; xPos = ML; lineCount++;
                maybeNewPage(lineH);
              }
              if (word.trim()) doc.text(word, xPos, y);
              xPos += ww;
            });
          });
          y += lineH + paraGap;
        } else {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(45, 45, 50);
          wrapped.forEach(wl => { doc.text(wl, ML, y); y += lineH; });
          y += paraGap;
        }
      }
    }
  };

  // ── Render each section ────────────────────────────────────────────────────
  const sections = parseSections(proposal);
  sections.forEach((section, idx) => {
    maybeNewPage(65);

    // Section header band
    doc.setFillColor(lr, lg, lb);
    doc.rect(0, y - 6, W, 17, 'F');
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, y - 6, 5, 17, 'F');

    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(mr2, mg2, mb2);
    doc.text(String(idx + 1).padStart(2, '0'), 9, y + 4);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(pr, pg, pb);
    doc.text(section.title.toUpperCase(), 21, y + 4);

    y += 20;

    const body = sectionEdits[idx] !== undefined ? sectionEdits[idx] : applyEdits(section.body, fields).trim();
    renderBody(body);

    y += secGap;
  });

  // ── Footer on all content pages ────────────────────────────────────────────
  const total = doc.internal.getNumberOfPages();
  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, H - 12, W, 12, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
    doc.text(biz, ML, H - 4.5);
    doc.setFont('helvetica', 'bold');
    doc.text('CONFIDENTIAL PROPOSAL', W/2, H - 4.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${p - 1} of ${total - 1}`, W - MR, H - 4.5, { align: 'right' });
  }

  const filename = `proposal-${(selected?.title||'contract').substring(0,40).replace(/\s+/g,'-').replace(/[^a-z0-9-]/gi,'')}.pdf`;
  doc.save(filename);
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProposalBuilder() {
  const { plan: userPlan, loading: planLoading } = useUserPlan();
  const isPro = ['pro', 'enterprise'].includes(userPlan);

  const defaultName  = localStorage.getItem('userName')    || '';
  const defaultEmail = localStorage.getItem('userEmail')   || '';
  const defaultBiz   = localStorage.getItem('businessName') || defaultName;

  const [fields, setFields] = useState({
    date:          new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    // Agency / recipient
    agencyContact:  '',
    recipientTitle: '',
    agencyAddr1:    '',
    agencyAddr2:    '',
    // Sender
    senderName:     defaultName,
    senderTitle:    '',
    email:          defaultEmail,
    phone:          '',
  });

  const [theme, setTheme] = useState({
    primaryColor: '#4f46e5',
    accentColor:  '#818cf8',
    logoDataUrl:  null,
    sampleName:   '',
  });

  const [selected, setSelected] = useState(null);
  const [manualId, setManualId] = useState('');
  const [proposal,   setProposal]   = useState('');
  const [sectionEdits, setSectionEdits] = useState({});
  const [aiProvider, setAiProvider] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [copied,     setCopied]     = useState(false);
  const [themeOpen,  setThemeOpen]  = useState(false);
  const [extracting, setExtracting] = useState(false);

  const logoInputRef   = useRef(null);
  const sampleInputRef = useRef(null);
  const resultRef      = useRef(null);

  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const idParam = params.get('opportunityId');
    if (idParam) setSelected({ id: idParam, title: params.get('title') || 'Selected Opportunity', agency: '' });
  }, []);

  const opportunityId = selected?.id || manualId.trim();

  const handleGenerate = async () => {
    if (!opportunityId) { setError('Please select a contract or enter an opportunity ID.'); return; }
    setLoading(true); setError(''); setProposal(''); setSectionEdits({});
    try {
      const res = await aiAPI.fullProposal(opportunityId);
      setProposal(res.data.data.proposal);
      setAiProvider(res.data.data.aiProvider || 'AI');
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionBodyChange = (sectionIndex, newBody) => {
    setSectionEdits(prev => ({ ...prev, [sectionIndex]: newBody }));
  };

  const getEditedProposal = () => {
    if (Object.keys(sectionEdits).length === 0) return applyEdits(proposal, fields);
    const sections = parseSections(proposal);
    return sections.map((s, i) => {
      const body = sectionEdits[i] !== undefined ? sectionEdits[i] : applyEdits(s.body, fields).trim();
      return `## ${s.title}\n${body}`;
    }).join('\n\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getEditedProposal());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogoUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setTheme(t => ({ ...t, logoDataUrl: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSampleUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    extractDominantColor(file, color => {
      const [r,g,b] = hexToRgb(color);
      const accent = '#'+[r,g,b].map(c=>Math.min(255,Math.round(c+(255-c)*0.35)).toString(16).padStart(2,'0')).join('');
      setTheme(t => ({ ...t, primaryColor: color, accentColor: accent, sampleName: file.name }));
      setExtracting(false);
    });
    setTimeout(() => setExtracting(false), 5000);
  };

  const handleDownloadPDF = useCallback(() => {
    generateProposalPDF({ proposal, fields, theme, selected, aiProvider, sectionEdits });
  }, [proposal, fields, theme, selected, aiProvider, sectionEdits]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (planLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
    </div>
  );
  if (!isPro) return <ProGate />;

  const sections = parseSections(proposal);
  const [lr2, lg2, lb2] = lightenRgb(theme.primaryColor, 0.88);
  const previewBg = '#' + [lr2,lg2,lb2].map(v=>v.toString(16).padStart(2,'0')).join('');

  return (
    <div className="min-h-screen bg-gray-50">
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
      <AICreditsBar feature="full_proposal" />

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <FileEdit className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Full AI Proposal Builder</h1>
              <HowItWorks
                title="AI Proposal Builder"
                steps={[
                  { title: 'Select or enter opportunity', description: 'Choose from saved opportunities (auto-fills all fields) or enter contract details manually' },
                  { title: 'AI generates 7-section proposal', description: 'Cover Letter, Executive Summary, Technical Approach, Management Plan, Past Performance, Pricing Strategy, Conclusion' },
                  { title: 'Uses your REAL data', description: 'Your actual past wins from USASpending, real competitor pricing, verified company profile — not generic templates' },
                  { title: 'Export branded PDF', description: 'Choose from 6 color themes (Indigo, Navy, Forest, Crimson, Slate, Teal) and download professional PDF' },
                ]}
                dataUsed={['SAM.gov (full SOW)', 'USASpending (competitors)', 'Your Past Wins', 'Your Certifications']}
              >
                <p className="text-sm font-semibold text-gray-700 mt-2">Connected to:</p>
                <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5 mt-1">
                  <li><strong>Opportunity Detail</strong> → "Write Full Proposal" button sends you here with data pre-loaded</li>
                  <li><strong>Past Performance</strong> → your stored contracts appear in the Past Performance section of the proposal</li>
                  <li><strong>Winning Bids</strong> → competitor pricing data informs the Pricing Strategy section</li>
                  <li><strong>Company Profile</strong> → your UEI, CAGE, certifications auto-fill the Cover Letter</li>
                  <li>Run <strong>Go/No-Go</strong> first → only build proposals for contracts scored GO</li>
                  <li>Run <strong>RFP Analyzer</strong> first → get the compliance checklist before writing</li>
                </ul>
              </HowItWorks>
            </div>
            <p className="text-sm text-gray-500">Fill in the 3 steps below, then generate and download your branded PDF</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['Cover Letter','Executive Summary','Technical Approach','Management Plan','Past Performance','Pricing Strategy','Conclusion'].map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
              <CheckCircle className="w-3 h-3" />{s}
            </span>
          ))}
        </div>
      </div>

      {/* ── STEP 1: Contract ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <StepHeader n="1" title="Select a Contract" subtitle="Choose the federal contract you want to write a proposal for" />

        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-1.5 font-medium">From your saved contracts</label>
          <OpportunitySelector selected={selected} onSelect={opp => { setSelected(opp); setManualId(''); }} />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 font-medium">or paste an ID manually</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5 font-medium">
            <Hash className="w-3.5 h-3.5" />Opportunity ID
          </label>
          <input
            type="text"
            value={selected ? '' : manualId}
            onChange={e => { setManualId(e.target.value); setSelected(null); }}
            placeholder="e.g. 64f1a2b3c4d5e6f7a8b9c0d1"
            disabled={!!selected}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        {selected && (
          <div className="mt-4 p-4 bg-indigo-50 rounded-xl flex items-start gap-3">
            <Briefcase className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-indigo-900 truncate">{selected.title}</p>
              {selected.agency && <p className="text-xs text-indigo-600 mt-0.5">{selected.agency}</p>}
            </div>
            <button onClick={() => setSelected(null)} className="text-indigo-300 hover:text-indigo-500 transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── STEP 2: Your Details ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <StepHeader n="2" title="Proposal Details" subtitle="These are inserted automatically into every section of the proposal and PDF" />

        {/* Agency info */}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Agency / Recipient</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <ProposalField icon={User}      label="Contact Name"       fieldKey="agencyContact"  value={fields.agencyContact}  fields={fields} onChange={setFields} placeholder="e.g. Jane Smith" />
          <ProposalField icon={UserCheck} label="Contact Title"      fieldKey="recipientTitle" value={fields.recipientTitle} fields={fields} onChange={setFields} placeholder="e.g. Contracting Officer" />
          <ProposalField icon={MapPin}    label="Agency Address"     fieldKey="agencyAddr1"    value={fields.agencyAddr1}    fields={fields} onChange={setFields} placeholder="e.g. 1234 Defense Way" />
          <ProposalField icon={MapPin}    label="City, State, ZIP"   fieldKey="agencyAddr2"    value={fields.agencyAddr2}    fields={fields} onChange={setFields} placeholder="e.g. Washington, DC 20001" />
        </div>

        {/* Sender info */}
        <div className="border-t border-gray-100 pt-4 mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProposalField icon={Calendar}  label="Proposal Date"       fieldKey="date"        value={fields.date}        fields={fields} onChange={setFields} placeholder="e.g. July 1, 2026" />
            <ProposalField icon={User}      label="Your Full Name"       fieldKey="senderName"  value={fields.senderName}  fields={fields} onChange={setFields} placeholder="e.g. John Doe" />
            <ProposalField icon={Briefcase} label="Your Title / Position" fieldKey="senderTitle" value={fields.senderTitle} fields={fields} onChange={setFields} placeholder="e.g. CEO" />
            <ProposalField icon={Mail}      label="Your Email"           fieldKey="email"       value={fields.email}       fields={fields} onChange={setFields} placeholder="e.g. john@company.com" type="email" />
            <ProposalField icon={Phone}     label="Your Phone"           fieldKey="phone"       value={fields.phone}       fields={fields} onChange={setFields} placeholder="e.g. +1 202 555 0100" />
          </div>
        </div>

        {/* Live confirmation */}
        {(fields.senderName || fields.agencyContact) && (
          <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-xl">
            <p className="text-xs font-semibold text-green-700 mb-1.5">✓ Will be auto-filled throughout the proposal:</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-green-700">
              {fields.date          && <span><strong>Date:</strong> {fields.date}</span>}
              {fields.agencyContact && <span><strong>To:</strong> {fields.agencyContact}{fields.recipientTitle ? `, ${fields.recipientTitle}` : ''}</span>}
              {fields.agencyAddr1   && <span><strong>Agency Addr:</strong> {fields.agencyAddr1}</span>}
              {fields.senderName    && <span><strong>From:</strong> {fields.senderName}{fields.senderTitle ? ` — ${fields.senderTitle}` : ''}</span>}
              {fields.email         && <span><strong>Email:</strong> {fields.email}</span>}
              {fields.phone         && <span><strong>Phone:</strong> {fields.phone}</span>}
            </div>
          </div>
        )}
      </div>

      {/* ── STEP 3: PDF Branding ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
        <button onClick={() => setThemeOpen(!themeOpen)}
          className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">PDF Branding <span className="text-xs font-normal text-gray-400 ml-1">optional — already looks great with defaults</span></p>
              <p className="text-xs text-gray-400">Set brand color, logo, and PDF style</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full border border-gray-200 shrink-0" style={{ background: theme.primaryColor }} />
            {themeOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>

        {themeOpen && (
          <div className="px-6 pb-6 border-t border-gray-50 space-y-5 pt-5">
            {/* Presets */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Preset Themes</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_THEMES.map(t => (
                  <button key={t.name} onClick={() => setTheme(th => ({ ...th, primaryColor: t.primary, accentColor: t.accent, sampleName: '' }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${theme.primaryColor===t.primary ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                    <span className="w-3 h-3 rounded-full" style={{ background: t.primary }} />{t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom color */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Custom Brand Color</p>
              <div className="flex items-center gap-3">
                <input type="color" value={theme.primaryColor}
                  onChange={e => setTheme(t => ({ ...t, primaryColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white" />
                <input type="text" value={theme.primaryColor}
                  onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setTheme(t => ({ ...t, primaryColor: e.target.value })); }}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="#4f46e5" />
                <div className="w-10 h-10 rounded-lg shrink-0 border border-gray-100" style={{ background: theme.primaryColor }} />
              </div>
            </div>

            {/* Sample upload */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Auto-Extract Color from Image</p>
              <p className="text-xs text-gray-400 mb-2">Upload a letterhead or brochure — we detect your brand color automatically.</p>
              <div onClick={() => sampleInputRef.current?.click()}
                className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                {extracting
                  ? <><Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" /><span className="text-sm text-gray-500">Extracting colors…</span></>
                  : theme.sampleName
                    ? <><Pipette className="w-5 h-5 text-green-500 shrink-0" /><div className="min-w-0"><p className="text-sm text-gray-700 truncate">{theme.sampleName}</p><p className="text-xs text-green-600">Color → {theme.primaryColor}</p></div><span className="w-5 h-5 rounded-full shrink-0 border border-gray-200" style={{ background: theme.primaryColor }} /></>
                    : <><Upload className="w-5 h-5 text-gray-400 shrink-0" /><span className="text-sm text-gray-500">Click to upload image</span></>
                }
              </div>
              <input ref={sampleInputRef} type="file" accept="image/*" className="hidden" onChange={handleSampleUpload} />
            </div>

            {/* Logo */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Company Logo <span className="font-normal text-gray-400">(appears in PDF cover page)</span></p>
              {theme.logoDataUrl ? (
                <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <img src={theme.logoDataUrl} alt="Logo" className="h-10 max-w-[120px] object-contain rounded" />
                  <span className="text-xs text-gray-500 flex-1">Logo uploaded</span>
                  <button onClick={() => setTheme(t => ({ ...t, logoDataUrl: null }))} className="p-1 rounded-md hover:bg-gray-200 text-gray-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                  <Upload className="w-4 h-4 text-gray-400" />Upload Logo (PNG / JPG)
                </button>
              )}
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>

            {/* Preview */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">PDF Cover Preview</p>
              <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm max-w-xs">
                <div className="px-4 py-5" style={{ background: theme.primaryColor, minHeight: 56 }}>
                  {theme.logoDataUrl
                    ? <img src={theme.logoDataUrl} alt="" className="h-7 max-w-[90px] object-contain" style={{ filter: 'brightness(10)' }} />
                    : <span className="text-white font-bold text-sm">{defaultBiz || 'Your Company'}</span>}
                  <div className="mt-2">
                    <p className="text-white/60 text-xs">PROPOSAL FOR:</p>
                    <p className="text-white font-bold text-sm mt-0.5 leading-tight">Federal Contract</p>
                  </div>
                </div>
                <div className="px-4 py-3 bg-white">
                  <div className="flex gap-3 text-xs mb-2">
                    <div className="flex-1">
                      <p className="font-bold text-xs mb-1" style={{ color: theme.primaryColor }}>SUBMITTED TO</p>
                      <div className="h-1.5 rounded-full w-3/4 mb-1" style={{ background: previewBg }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-xs mb-1" style={{ color: theme.primaryColor }}>SUBMITTED BY</p>
                      <div className="h-1.5 rounded-full w-3/4 mb-1" style={{ background: previewBg }} />
                    </div>
                  </div>
                  <div className="h-5 rounded" style={{ background: theme.primaryColor, opacity: 0.9 }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Generate button ──────────────────────────────────────────────────── */}
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      <button onClick={handleGenerate} disabled={loading || !opportunityId}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-colors text-base shadow-sm mb-2">
        {loading
          ? <><Loader2 className="w-5 h-5 animate-spin" />Generating your proposal…</>
          : <><Sparkles className="w-5 h-5" />{proposal ? 'Regenerate Full Proposal' : 'Generate Full Proposal'}</>}
      </button>
      {loading && <p className="text-xs text-center text-gray-400 mb-6">This takes 15–30 seconds — AI is writing all 7 sections with your details…</p>}

      {/* ── Result ──────────────────────────────────────────────────────────── */}
      {proposal && (
        <div ref={resultRef} className="mt-8 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Generated Proposal</h2>
              <p className="text-xs text-gray-400 mt-0.5">All your details have been applied</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy All'}
              </button>
              <button onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-sm"
                style={{ background: theme.primaryColor }}>
                <Download className="w-4 h-4" />Download PDF
              </button>
              <button onClick={handleGenerate} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                <RefreshCw className="w-3.5 h-3.5" />Regenerate
              </button>
            </div>
          </div>

          {sections.length > 0 ? (
            <div className="space-y-3">
              {sections.map((section, i) => (
                <SectionCard key={i}
                  section={sectionEdits[i] !== undefined ? { ...section, body: sectionEdits[i] } : section}
                  index={i}
                  editFields={sectionEdits[i] !== undefined ? {} : fields}
                  onBodyChange={handleSectionBodyChange}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <AIResponseRenderer content={applyEdits(proposal, fields)} />
            </div>
          )}

          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            <button onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Full Proposal'}
            </button>
            <button onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors shadow-sm"
              style={{ background: theme.primaryColor }}>
              <Download className="w-4 h-4" />Download Branded PDF
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
