// frontend/src/pages/BidPipeline.jsx
// Kanban board: track bids from Saved → Researching → Drafting → Submitted → Won / Lost
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Kanban, Bookmark, Search, FileText, Send, Trophy, XCircle,
  DollarSign, Clock, ChevronRight, AlertTriangle, Loader2,
  MoreVertical, Trash2, StickyNote, CheckCircle, TrendingUp,
  ExternalLink, Plus
} from 'lucide-react';
import { savedAPI } from '../services/api';
import { useUserPlan } from '../hooks/useUserPlan';
import PlanGate from '../components/PlanGate';
import ExportButton from '../components/ExportButton';
import { exportPipelinePDF, exportPipelineCSV } from '../utils/exportUtils';
import HowItWorks from '../components/HowItWorks';

// ── Column definitions ────────────────────────────────────────────────────────
const COLUMNS = [
  { id: 'saved',         label: 'Saved',            icon: Bookmark,  color: 'border-gray-400',  bg: 'bg-gray-50',   badge: 'bg-gray-200 text-gray-700'   },
  { id: 'researching',   label: 'Researching',      icon: Search,    color: 'border-blue-400',  bg: 'bg-blue-50',   badge: 'bg-blue-200 text-blue-700'   },
  { id: 'proposal_draft',label: 'Drafting Proposal', icon: FileText,  color: 'border-indigo-400',bg: 'bg-indigo-50', badge: 'bg-indigo-200 text-indigo-700'},
  { id: 'submitted',     label: 'Submitted',        icon: Send,      color: 'border-amber-400', bg: 'bg-amber-50',  badge: 'bg-amber-200 text-amber-700' },
  { id: 'won',           label: 'Won ✅',            icon: Trophy,    color: 'border-green-400', bg: 'bg-green-50',  badge: 'bg-green-200 text-green-700' },
  { id: 'lost',          label: 'Lost',             icon: XCircle,   color: 'border-red-400',   bg: 'bg-red-50',    badge: 'bg-red-200 text-red-700'     },
];

const fmtVal = (v) => {
  if (!v) return null;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
};

const daysLeftColor = (days) => {
  if (days === null) return 'text-gray-400';
  if (days < 0)  return 'text-gray-400';
  if (days <= 3) return 'text-red-600 font-bold';
  if (days <= 7) return 'text-orange-600';
  return 'text-gray-500';
};

// ── Single card ───────────────────────────────────────────────────────────────
function PipelineCard({ item, onMove, onDelete, onNotesChange, isDragging }) {
  const [showMenu,    setShowMenu]    = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteVal,     setNoteVal]     = useState(item.pipelineNotes || '');
  const menuRef = useRef(null);
  const opp = item.opportunity;
  if (!opp) return null;

  const now      = new Date();
  const daysLeft = opp.dueDate
    ? Math.ceil((new Date(opp.dueDate) - now) / 86400000)
    : null;
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

  const saveNote = async () => {
    setEditingNote(false);
    if (noteVal !== item.pipelineNotes) {
      onNotesChange(item._id, noteVal);
    }
  };

  const colIdx       = COLUMNS.findIndex(c => c.id === item.status);
  const canMoveLeft  = colIdx > 0;
  const canMoveRight = colIdx < COLUMNS.length - 1;

  // close menu on outside click
  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('cardId', item._id);
        e.dataTransfer.setData('fromCol', item.status);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all select-none ${
        isDragging ? 'opacity-50 rotate-1' : ''
      } ${isUrgent ? 'border-l-4 border-l-orange-400' : ''}`}
    >
      {/* Match score + menu */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
          (opp.aiMatchScore || 0) >= 70 ? 'bg-green-100 text-green-700' :
          (opp.aiMatchScore || 0) >= 40 ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {opp.aiMatchScore || 0}%
        </span>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(v => !v)}
            className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-6 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-36 text-sm">
              <Link
                to={`/opportunity/${opp._id}`}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700"
                onClick={() => setShowMenu(false)}
              >
                <ExternalLink className="w-3.5 h-3.5" /> View Details
              </Link>
              <button
                onClick={() => { setEditingNote(true); setShowMenu(false); }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700"
              >
                <StickyNote className="w-3.5 h-3.5" /> Add Note
              </button>
              <button
                onClick={() => { onDelete(item._id); setShowMenu(false); }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <p className="text-xs font-semibold text-gray-900 leading-snug mb-1 line-clamp-2">
        {opp.title}
      </p>
      <p className="text-xs text-gray-500 truncate mb-2">{opp.agency}</p>

      {/* Meta row */}
      <div className="flex flex-wrap gap-2 text-xs mb-2">
        {opp.estimatedValue > 0 && (
          <span className="flex items-center gap-0.5 text-green-600 font-medium">
            <DollarSign className="w-3 h-3" /> {fmtVal(opp.estimatedValue)}
          </span>
        )}
        {daysLeft !== null && (
          <span className={`flex items-center gap-0.5 ${daysLeftColor(daysLeft)}`}>
            <Clock className="w-3 h-3" />
            {daysLeft < 0 ? 'Expired' : daysLeft === 0 ? 'Due today!' : `${daysLeft}d left`}
          </span>
        )}
      </div>

      {/* Notes */}
      {editingNote ? (
        <div className="mb-2">
          <textarea
            value={noteVal}
            onChange={e => setNoteVal(e.target.value)}
            rows={2}
            autoFocus
            className="w-full text-xs border border-indigo-300 rounded-lg p-2 resize-none focus:ring-1 focus:ring-indigo-500 outline-none"
            placeholder="Add a note…"
          />
          <div className="flex gap-1 mt-1">
            <button onClick={saveNote} className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-lg hover:bg-indigo-700">Save</button>
            <button onClick={() => setEditingNote(false)} className="text-xs text-gray-500 px-2 py-0.5 rounded-lg hover:bg-gray-100">Cancel</button>
          </div>
        </div>
      ) : noteVal ? (
        <p
          className="text-xs text-gray-400 italic bg-gray-50 rounded-lg px-2 py-1 mb-2 cursor-pointer hover:bg-gray-100 line-clamp-2"
          onClick={() => setEditingNote(true)}
        >
          📝 {noteVal}
        </p>
      ) : null}

      {/* Move arrows */}
      <div className="flex gap-1 mt-2 pt-2 border-t border-gray-50">
        {canMoveLeft && (
          <button
            onClick={() => onMove(item._id, COLUMNS[colIdx - 1].id)}
            className="flex-1 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg py-1 transition-colors text-center"
            title={`Move to ${COLUMNS[colIdx - 1].label}`}
          >
            ← {COLUMNS[colIdx - 1].label.split(' ')[0]}
          </button>
        )}
        {canMoveRight && (
          <button
            onClick={() => onMove(item._id, COLUMNS[colIdx + 1].id)}
            className="flex-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg py-1 font-medium transition-colors text-center"
            title={`Move to ${COLUMNS[colIdx + 1].label}`}
          >
            {COLUMNS[colIdx + 1].label.split(' ')[0]} →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────
function KanbanColumn({ col, cards, onDrop, onMove, onDelete, onNotesChange, dragOverCol, setDragOverCol }) {
  const isEmpty = cards.length === 0;

  return (
    <div
      className={`flex-shrink-0 w-64 flex flex-col rounded-2xl transition-all ${
        dragOverCol === col.id ? 'ring-2 ring-indigo-400 scale-[1.01]' : ''
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
      onDragLeave={() => setDragOverCol(null)}
      onDrop={(e) => { e.preventDefault(); setDragOverCol(null); onDrop(e, col.id); }}
    >
      {/* Column header */}
      <div className={`${col.bg} rounded-t-2xl px-4 py-3 border-t-4 ${col.color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <col.icon className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-800">{col.label}</span>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
            {cards.length}
          </span>
        </div>
      </div>

      {/* Cards area */}
      <div className={`flex-1 p-2 space-y-2 min-h-24 rounded-b-2xl ${col.bg} border border-t-0 ${col.color.replace('border-', 'border-')}`}>
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-300">
            <col.icon className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs text-center">Drag cards here</p>
          </div>
        )}
        {cards.map(item => (
          <PipelineCard
            key={item._id}
            item={item}
            onMove={onMove}
            onDelete={onDelete}
            onNotesChange={onNotesChange}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BidPipeline() {
  const { plan: userPlan } = useUserPlan();
  const [columns,     setColumns]     = useState({});
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [dragOverCol, setDragOverCol] = useState(null);

  useEffect(() => {
    if (!['starter', 'pro', 'enterprise'].includes(userPlan)) return;
    loadPipeline();
  }, [userPlan]);

  const loadPipeline = async () => {
    setLoading(true);
    try {
      const res = await savedAPI.getPipeline();
      if (res.data.success) {
        setColumns(res.data.data.columns);
        setStats(res.data.data.stats);
      }
    } catch (err) {
      console.error('Pipeline load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const moveCard = async (cardId, newStatus) => {
    // Optimistic update
    setColumns(prev => {
      const next = { ...prev };
      let movedCard = null;
      COLUMNS.forEach(col => {
        next[col.id] = next[col.id]?.filter(c => {
          if (c._id === cardId) { movedCard = { ...c, status: newStatus }; return false; }
          return true;
        }) || [];
      });
      if (movedCard) next[newStatus] = [movedCard, ...(next[newStatus] || [])];
      return next;
    });
    // Persist
    try {
      await savedAPI.updateCard(cardId, { status: newStatus });
    } catch {
      loadPipeline(); // rollback on failure
    }
  };

  const handleDrop = (e, targetColId) => {
    const cardId = e.dataTransfer.getData('cardId');
    if (cardId) moveCard(cardId, targetColId);
  };

  const deleteCard = async (cardId) => {
    setColumns(prev => {
      const next = { ...prev };
      COLUMNS.forEach(col => { next[col.id] = next[col.id]?.filter(c => c._id !== cardId) || []; });
      return next;
    });
    try { await savedAPI.unsave(cardId); } catch { loadPipeline(); }
  };

  const updateNotes = async (cardId, pipelineNotes) => {
    setColumns(prev => {
      const next = { ...prev };
      COLUMNS.forEach(col => {
        next[col.id] = next[col.id]?.map(c => c._id === cardId ? { ...c, pipelineNotes } : c) || [];
      });
      return next;
    });
    try { await savedAPI.updateCard(cardId, { pipelineNotes }); } catch {}
  };

  if (!['starter', 'pro', 'enterprise'].includes(userPlan)) {
    return <PlanGate requiredPlan="starter"
      featureName="Bid Pipeline"
      description="Track every bid from research through submission with a Kanban board. Available on Starter, Pro, and Enterprise plans." />;
  }

  const totalCards = Object.values(columns).flat().length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 shrink-0" />
              Bid Pipeline
              <HowItWorks
                title="Bid Pipeline"
                steps={[
                  { title: 'Save opportunities', description: 'Save contracts from your feed to start tracking them' },
                  { title: 'Drag through stages', description: 'Move cards: Saved → Researching → Drafting Proposal → Submitted → Won/Lost' },
                  { title: 'Track win rate', description: 'See your conversion stats — how many bids become wins' },
                  { title: 'Add notes', description: 'Attach private notes to each opportunity for your team' },
                ]}
                dataUsed={['Your Saved Opportunities', 'Status Tracking']}
              >
                <p className="text-sm font-semibold text-gray-700 mt-2">Connected to:</p>
                <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5 mt-1">
                  <li><strong>Saved Opportunities</strong> → saving a contract creates a card in your pipeline</li>
                  <li><strong>Opportunity Detail</strong> → click any card to view full details and run AI analysis</li>
                  <li><strong>Go/No-Go</strong> → run bid decision before moving from "Researching" to "Drafting"</li>
                  <li><strong>Proposal Builder</strong> → move to "Drafting" stage, then write the proposal</li>
                  <li><strong>Dashboard</strong> → pipeline stats (active bids, win rate) show on your dashboard</li>
                </ul>
                <p className="text-sm font-semibold text-gray-700 mt-2">Recommended workflow:</p>
                <ol className="text-xs text-gray-500 list-decimal list-inside space-y-0.5 mt-1">
                  <li>Save opportunity from feed → card appears in "Saved"</li>
                  <li>Research → run AI Summarize + Competitive Analysis → move to "Researching"</li>
                  <li>Decide → run Go/No-Go → if GO, move to "Drafting"</li>
                  <li>Write → use Proposal Builder → move to "Submitted"</li>
                  <li>Track → update to "Won" or "Lost" when agency decides</li>
                </ol>
              </HowItWorks>
            </h1>
            <p className="text-gray-500 mt-0.5 sm:mt-1 text-xs sm:text-sm">
              Track your bids from research to award. Drag cards between columns or use the arrow buttons.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ExportButton
              label="Export"
              disabled={totalCards === 0}
              onExportPDF={() => exportPipelinePDF(columns, stats)}
              onExportCSV={() => exportPipelineCSV(columns)}
            />
            <Link
              to="/saved"
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add from Saved</span><span className="sm:hidden">Add</span>
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5 sm:mb-6">
            {[
              { label: 'Total in Pipeline', value: totalCards,                         icon: Kanban,       color: 'text-indigo-600' },
              { label: 'Pipeline Value',    value: fmtVal(stats.pipelineValue) || '$0', icon: DollarSign,   color: 'text-green-600'  },
              { label: 'Active Bids',       value: stats.active,                       icon: FileText,     color: 'text-blue-600'   },
              { label: 'Submitted',         value: stats.submitted,                    icon: Send,         color: 'text-amber-600'  },
              { label: 'Win Rate',
                value: stats.winRate !== null ? `${stats.winRate}%` : '—',
                icon: Trophy,
                color: stats.winRate >= 50 ? 'text-green-600' : 'text-gray-500'
              },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                <s.icon className={`w-5 h-5 flex-shrink-0 ${s.color}`} />
                <div>
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Urgent alert */}
        {stats?.urgentCount > 0 && (
          <div className="mb-5 flex items-center gap-3 bg-orange-50 border border-orange-200 px-4 py-3 rounded-xl text-sm text-orange-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>{stats.urgentCount}</strong> active bid{stats.urgentCount !== 1 ? 's' : ''} due within 7 days!
              Move urgent cards to <strong>Submitted</strong> before the deadline.
            </span>
          </div>
        )}

        {/* Empty state */}
        {totalCards === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
            <TrendingUp className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Your pipeline is empty</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              Save opportunities from the Opportunities page, then move them through your pipeline here to track your bids.
            </p>
            <Link
              to="/opportunities"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" /> Browse Opportunities
            </Link>
          </div>
        )}

        {/* Kanban board — horizontal scroll */}
        {totalCards > 0 && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4" style={{ minWidth: `${COLUMNS.length * 272}px` }}>
              {COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  cards={columns[col.id] || []}
                  onDrop={handleDrop}
                  onMove={moveCard}
                  onDelete={deleteCard}
                  onNotesChange={updateNotes}
                  dragOverCol={dragOverCol}
                  setDragOverCol={setDragOverCol}
                />
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4 text-center">
          💡 Drag cards between columns or use the ← → buttons on each card to move stages
        </p>
      </div>
    </div>
  );
}
