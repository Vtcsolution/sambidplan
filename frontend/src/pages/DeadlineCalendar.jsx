// frontend/src/pages/DeadlineCalendar.jsx
// Monthly calendar showing all contract deadlines from the user's feed.
// Color-coded by urgency: red (≤3 days), orange (≤7), yellow (≤14), green (>14).
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, CalendarDays, DollarSign,
  Clock, AlertTriangle, CheckCircle, Building2,
  Bookmark, Loader2, Target, Download
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import { downloadICS } from '../utils/calendarUtils';
import { useUserPlan } from '../hooks/useUserPlan';
import PlanGate from '../components/PlanGate';

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const toKey = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const fmtVal = (v) => {
  if (!v) return null;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
};

const URGENCY = {
  critical: { dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700 border-red-200',    label: 'Critical — ≤3 days' },
  urgent:   { dot: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Urgent — ≤7 days' },
  soon:     { dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Soon — ≤14 days' },
  normal:   { dot: 'bg-green-400',  badge: 'bg-green-100 text-green-700 border-green-200',    label: 'On track — >14 days' },
  expired:  { dot: 'bg-gray-300',   badge: 'bg-gray-100 text-gray-500 border-gray-200',       label: 'Expired' },
};

const urgencyOf = (event) => {
  const dl = event.daysLeft;
  if (dl < 0)  return 'expired';
  if (dl <= 3) return 'critical';
  if (dl <= 7) return 'urgent';
  if (dl <= 14) return 'soon';
  return 'normal';
};

// ── Event dot stack (shown inside a calendar cell) ────────────────────────────
function EventDots({ events, max = 3 }) {
  const sorted = [...events].sort((a, b) => a.daysLeft - b.daysLeft);
  return (
    <div className="flex flex-wrap gap-0.5 mt-0.5">
      {sorted.slice(0, max).map((e, i) => {
        const u = urgencyOf(e);
        return (
          <span key={i} className={`inline-block w-2 h-2 rounded-full ${URGENCY[u].dot}`} title={e.title} />
        );
      })}
      {events.length > max && (
        <span className="text-[9px] text-gray-500 font-bold">+{events.length - max}</span>
      )}
    </div>
  );
}

// ── Side panel: events for the selected day ───────────────────────────────────
function DayPanel({ date, events, onClose }) {
  if (!events) return null;

  const label = date ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '';

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <div>
          <p className="text-xs opacity-80 font-medium">DEADLINES</p>
          <p className="font-bold text-lg leading-tight">{label}</p>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none p-1">×</button>
      </div>

      {events.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No deadlines on this day.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
          {events.map((e) => {
            const u = urgencyOf(e);
            return (
              <div key={e.id} className="p-4 hover:bg-gray-50 transition-colors">
                {/* Urgency + saved badge */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${URGENCY[u].badge}`}>
                    {u === 'expired' ? 'Expired' :
                     e.daysLeft === 0 ? 'Due TODAY' :
                     `${e.daysLeft}d left`}
                  </span>
                  {e.isSaved && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <Bookmark className="w-2.5 h-2.5" /> {e.savedStatus || 'Saved'}
                    </span>
                  )}
                  {e.matchScore != null && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      e.matchScore >= 70 ? 'bg-green-100 text-green-700' :
                      e.matchScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{e.matchScore}% match</span>
                  )}
                </div>

                {/* Title */}
                <p className="text-sm font-semibold text-gray-900 leading-snug mb-1 line-clamp-2">
                  {e.title}
                </p>

                {/* Meta */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {e.agency}
                  </span>
                  {e.estimatedValue > 0 && (
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <DollarSign className="w-3 h-3" /> {fmtVal(e.estimatedValue)}
                    </span>
                  )}
                  {e.naicsCode && (
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" /> {e.naicsCode}
                    </span>
                  )}
                </div>

                <Link
                  to={`/opportunity/${e.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 font-medium hover:underline"
                >
                  View details →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main calendar page ────────────────────────────────────────────────────────
export default function DeadlineCalendar() {
  const { plan: userPlan } = useUserPlan();
  const today      = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [events,   setEvents]   = useState({});
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [filter, setFilter] = useState('all'); // all | saved | urgent

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardAPI.getCalendar(monthKey);
      if (res.data.success) {
        setEvents(res.data.data.events);
        setStats(res.data.data.stats);
      }
    } catch (err) {
      console.error('Calendar load error:', err);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  // Navigate months
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(toKey(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();

  // cells: [{ day, month, year, key, isCurrentMonth, isToday }]
  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    const d = daysInPrev - firstDay + 1 + i;
    cells.push({ day: d, monthOffset: -1, key: toKey(year, month - 1, d) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, monthOffset: 0, key: toKey(year, month, d) });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, monthOffset: 1, key: toKey(year, month + 1, d) });
  }

  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  // Apply filter to events
  const filteredEvents = (dayKey) => {
    const raw = events[dayKey] || [];
    if (filter === 'saved')  return raw.filter(e => e.isSaved);
    if (filter === 'urgent') return raw.filter(e => ['critical','urgent'].includes(urgencyOf(e)));
    return raw;
  };

  if (!['starter', 'pro', 'enterprise'].includes(userPlan)) {
    return <PlanGate requiredPlan="starter"
      featureName="Deadline Calendar"
      description="See all contract submission deadlines in a monthly calendar view with urgency colour-coding. Available on Starter, Pro, and Enterprise plans." />;
  }

  const selectedEvents = selectedDate ? filteredEvents(selectedDate) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">

        {/* Header */}
        <div className="mb-5 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 shrink-0" />
            Deadline Calendar
          </h1>
          <p className="text-gray-500 mt-0.5 sm:mt-1 text-xs sm:text-sm">
            All contract response deadlines from your opportunity feed.
          </p>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Deadlines this month', value: stats.totalThisMonth, icon: CalendarDays, color: 'text-indigo-600' },
              { label: 'Due within 3 days',    value: stats.critical,       icon: AlertTriangle, color: 'text-red-600'   },
              { label: 'Due within 7 days',    value: stats.urgent,         icon: Clock,         color: 'text-orange-500'},
              { label: 'Total pipeline value', value: fmtVal(stats.totalValue) || '$0', icon: DollarSign, color: 'text-green-600' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                <s.icon className={`w-5 h-5 flex-shrink-0 ${s.color}`} />
                <div>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Calendar ──────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

              {/* Calendar toolbar */}
              <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 border-b border-gray-100">
                {/* Month navigation */}
                <div className="flex items-center gap-1.5">
                  <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 min-w-[8rem] text-center">
                    {MONTHS[month]} {year}
                  </h2>
                  <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* Today + Export */}
                <div className="flex items-center gap-1.5">
                  <button onClick={goToday} className="text-xs text-indigo-600 font-semibold px-3 py-1.5 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap">
                    Today
                  </button>
                  <button
                    onClick={() => {
                      const allEvents = Object.values(events).flat().filter(e => e.dueDate);
                      if (!allEvents.length) return;
                      downloadICS(allEvents, `deadlines-${MONTHS[month]}-${year}.ics`);
                    }}
                    title="Export all deadlines to calendar"
                    className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap">
                    <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export</span> .ics
                  </button>
                </div>

                {/* Filter */}
                <div className="flex gap-1 ml-auto">
                  {[
                    { id: 'all',    label: 'All'    },
                    { id: 'saved',  label: 'Saved'  },
                    { id: 'urgent', label: 'Urgent' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`text-xs px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        filter === f.id
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-gray-100">
                {DAYS.map(d => (
                  <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                </div>
              ) : (
                <div className="grid grid-cols-7">
                  {cells.map((cell, idx) => {
                    const isCurrentMonth = cell.monthOffset === 0;
                    const isToday        = cell.key === todayKey;
                    const isSelected     = cell.key === selectedDate;
                    const dayEvents      = filteredEvents(cell.key);
                    const hasEvents      = dayEvents.length > 0;
                    const maxUrgency     = hasEvents
                      ? dayEvents.reduce((acc, e) => {
                          const order = { critical: 0, urgent: 1, soon: 2, normal: 3, expired: 4 };
                          return order[urgencyOf(e)] < order[acc] ? urgencyOf(e) : acc;
                        }, 'expired')
                      : null;

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDate(isSelected ? null : cell.key)}
                        className={`min-h-[72px] p-1.5 border-b border-r border-gray-50 text-left transition-all hover:bg-indigo-50/50 ${
                          isSelected    ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-400' :
                          isToday       ? 'bg-blue-50/60' : ''
                        } ${!isCurrentMonth ? 'opacity-35' : ''}`}
                      >
                        {/* Day number */}
                        <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mb-0.5 ${
                          isToday   ? 'bg-indigo-600 text-white' :
                          isSelected ? 'bg-indigo-200 text-indigo-800' :
                          'text-gray-700'
                        }`}>
                          {cell.day}
                        </div>

                        {/* Event dots */}
                        {hasEvents && <EventDots events={dayEvents} />}

                        {/* Event count label on larger screens */}
                        {hasEvents && (
                          <div className={`hidden sm:block mt-0.5 text-[10px] font-medium truncate ${
                            maxUrgency === 'critical' ? 'text-red-600' :
                            maxUrgency === 'urgent'   ? 'text-orange-500' :
                            maxUrgency === 'soon'     ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {dayEvents.length} deadline{dayEvents.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-4 px-5 py-3 border-t border-gray-100 bg-gray-50">
                {Object.entries(URGENCY).filter(([k]) => k !== 'expired').map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className={`w-2.5 h-2.5 rounded-full ${val.dot}`} />
                    {val.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Day detail panel ───────────────────────────────────────────── */}
          <div className="lg:w-80 flex-shrink-0">
            {selectedDate ? (
              <DayPanel
                date={selectedDate}
                events={selectedEvents}
                onClose={() => setSelectedDate(null)}
              />
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 border-2 border-dashed border-gray-200">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Click any day</p>
                <p className="text-xs mt-1">to see that day's deadlines</p>
              </div>
            )}

            {/* Upcoming this month — quick list */}
            {!loading && stats?.upcoming > 0 && (
              <div className="mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    Upcoming deadlines
                  </h3>
                </div>
                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                  {Object.entries(events)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .flatMap(([key, evts]) =>
                      evts
                        .filter(e => e.daysLeft >= 0)
                        .map(e => ({ ...e, dateKey: key }))
                    )
                    .filter(e => e.daysLeft >= 0 && e.daysLeft <= 30)
                    .sort((a, b) => a.daysLeft - b.daysLeft)
                    .slice(0, 8)
                    .map((e, i) => {
                      const u = urgencyOf(e);
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedDate(e.dateKey)}
                          className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${URGENCY[u].dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{e.title}</p>
                            <p className="text-[10px] text-gray-400">{e.agency}</p>
                          </div>
                          <span className={`text-[10px] font-semibold flex-shrink-0 ${
                            u === 'critical' ? 'text-red-600' :
                            u === 'urgent'   ? 'text-orange-500' :
                            u === 'soon'     ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {e.daysLeft === 0 ? 'Today' : `${e.daysLeft}d`}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
