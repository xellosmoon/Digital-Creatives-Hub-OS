import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  format, startOfMonth, endOfMonth, subMonths, subDays, startOfYear, endOfYear,
} from 'date-fns';
import { ArrowLeft, Download, CalendarCheck, Users, UserCheck, CalendarClock, Ban, ClipboardList, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DatePickerPopover from '../components/shared/DatePickerPopover';
import { getErrorMessage } from '../lib/getErrorMessage';
import { EVENT_CATEGORY_OPTIONS, getEventCategoryStyle, getEventCategoryLabel } from '../lib/eventCategories';
import {
  fetchEventReport, summarizeEvents, formatDateLines, timingLabel, rangeLabel, downloadEventReportCsv,
  type EventReportRow, type EventReportRange,
} from '../lib/eventReport';

type Preset = 'this_month' | 'last_month' | 'last_90' | 'this_year' | 'all' | 'custom';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'last_90', label: 'Last 90 days' },
  { key: 'this_year', label: 'This year' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom' },
];

const ymd = (d: Date): string => format(d, 'yyyy-MM-dd');

function presetRange(preset: Exclude<Preset, 'custom'>): EventReportRange {
  const now = new Date();
  switch (preset) {
    case 'this_month': return { start: ymd(startOfMonth(now)), end: ymd(endOfMonth(now)) };
    case 'last_month': { const m = subMonths(now, 1); return { start: ymd(startOfMonth(m)), end: ymd(endOfMonth(m)) }; }
    case 'last_90': return { start: ymd(subDays(now, 90)), end: ymd(now) };
    case 'this_year': return { start: ymd(startOfYear(now)), end: ymd(endOfYear(now)) };
    case 'all': return { start: null, end: null };
  }
}

const TIMING_STYLE: Record<string, string> = {
  completed: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300',
  upcoming: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  happening: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
};

/**
 * Admin report on events — what ran (or is running), who hosted it, how many
 * were expected, and how many actually checked in. Accessible at
 * /admin/event-report.
 */
export default function EventReport(): JSX.Element {
  const [preset, setPreset] = useState<Preset>('this_month');
  const [custom, setCustom] = useState<EventReportRange>({ start: ymd(startOfMonth(new Date())), end: ymd(new Date()) });
  const [category, setCategory] = useState<'all' | string>('all');
  const [allRows, setAllRows] = useState<EventReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const range: EventReportRange = preset === 'custom' ? custom : presetRange(preset);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchEventReport(range)
      .then((rows) => { if (!cancelled) setAllRows(rows); })
      .catch((err: unknown) => {
        console.error('Event report failed:', err);
        if (!cancelled) toast.error(getErrorMessage(err, 'Failed to load the event report'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end]);

  const rows = useMemo(
    () => (category === 'all' ? allRows : allRows.filter((r) => r.category === category)),
    [allRows, category],
  );
  const summary = useMemo(() => summarizeEvents(rows), [rows]);

  const handleExport = (): void => {
    if (rows.length === 0) { toast.error('No events to export for this selection'); return; }
    downloadEventReportCsv(rows, range, `Event_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success(`Exported ${rows.length} event${rows.length === 1 ? '' : 's'}`);
  };

  const cards = [
    { label: 'Events', value: summary.totalEvents, icon: CalendarCheck, tint: 'from-violet-500 to-indigo-600' },
    { label: 'Completed', value: summary.completed, icon: ClipboardList, tint: 'from-slate-500 to-slate-700' },
    { label: 'Upcoming', value: summary.upcoming + summary.happening, icon: CalendarClock, tint: 'from-emerald-500 to-teal-600' },
    { label: 'Check-ins', value: summary.checkIns, icon: UserCheck, tint: 'from-amber-500 to-orange-600' },
    { label: 'Unique people', value: summary.uniqueAttendees, icon: Users, tint: 'from-fuchsia-500 to-pink-600' },
    { label: 'Cancelled', value: summary.cancelled, icon: Ban, tint: 'from-rose-500 to-red-600' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/admin/events" className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Event Report</h1>
          </div>
          <p className="ml-8 text-gray-600 dark:text-gray-400">
            {rangeLabel(range)} · by event date · drafts not included
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={loading}
          className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#0C2340] to-fuchsia-600 hover:from-indigo-700 hover:to-fuchsia-700 shadow-sm disabled:opacity-50 transition-all"
        >
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </button>
      </div>

      {/* Period */}
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              preset === p.key
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md scale-105'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <DatePickerPopover label="From" value={custom.start ?? ''} onChange={(d) => setCustom((c) => ({ ...c, start: d }))} />
          <DatePickerPopover label="To" value={custom.end ?? ''} min={custom.start ?? undefined} onChange={(d) => setCustom((c) => ({ ...c, end: d }))} />
        </div>
      )}

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
            category === 'all' ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600'
          }`}
        >
          All categories
        </button>
        {EVENT_CATEGORY_OPTIONS.map((opt) => {
          const style = getEventCategoryStyle(opt.value);
          const active = category === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setCategory(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                active ? `bg-gradient-to-r ${style.gradient} text-white border-transparent` : `${style.chip} ${style.text}`
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm p-4">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${c.tint} text-white mb-2`}>
              <c.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{loading ? '–' : c.value}</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
          </div>
        ))}
      </div>

      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Check-ins only count visitors who picked the event at the check-in kiosk. Expected guests total: <span className="font-semibold">{summary.expectedGuests}</span>.
      </p>

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16">
            <CalendarCheck className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">No events in this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Event</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 font-semibold">Organizer</th>
                  <th className="px-4 py-3 font-semibold text-right">Expected</th>
                  <th className="px-4 py-3 font-semibold text-right">Check-ins</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {rows.map((r) => {
                  const style = getEventCategoryStyle(r.category);
                  const upcoming = r.timing === 'upcoming';
                  return (
                    <tr key={r.id} className={r.status === 'cancelled' ? 'opacity-60' : ''}>
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-gray-900 dark:text-white max-w-xs">{r.title}</p>
                        <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.chip} ${style.text}`}>
                          {getEventCategoryLabel(r.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatDateLines(r.dates).map((line, i) => <div key={i}>{line}</div>)}
                      </td>
                      <td className="px-4 py-3 align-top text-gray-700 dark:text-gray-300">
                        <div>{r.organization || r.organizer || '—'}</div>
                        {r.organization && r.organizer && <div className="text-xs text-gray-500 dark:text-gray-400">{r.organizer}</div>}
                      </td>
                      <td className="px-4 py-3 align-top text-right text-gray-700 dark:text-gray-300">{r.expectedGuests ?? '—'}</td>
                      <td className="px-4 py-3 align-top text-right font-semibold text-gray-900 dark:text-white">
                        {upcoming ? '—' : r.checkIns}
                        {!upcoming && r.expectedGuests ? (
                          <div className="text-xs font-normal text-gray-500 dark:text-gray-400">
                            {Math.round((r.uniqueAttendees / r.expectedGuests) * 100)}% of expected
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {r.status === 'cancelled' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Cancelled</span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TIMING_STYLE[r.timing]}`}>{timingLabel(r.timing)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
