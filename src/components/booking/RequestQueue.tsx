import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Armchair, PartyPopper, Package, Hourglass, Eye, CheckCircle, Activity, Radio } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface QueueRow {
  kind: 'booking' | 'event' | 'gadget';
  /** Anonymous — NOT the reference number (see migration 071). */
  code: string;
  status: string;
  request_date: string;
  starts_at: string | null;
  ends_at: string | null;
  label: string | null;
}

type Stage = 'waiting' | 'reviewing' | 'approved' | 'in_use';

// Bookings use pending/under_review, proposals pending_review/under_review,
// gadgets pending/approved/active — collapse them into one vocabulary.
function stageOf(status: string): Stage {
  if (status === 'under_review') return 'reviewing';
  if (status === 'approved') return 'approved';
  if (status === 'active') return 'in_use';
  return 'waiting';
}

const STAGE_STYLE: Record<Stage, { label: string; icon: typeof Hourglass; pill: string; chip: string }> = {
  waiting: {
    label: 'Waiting for review',
    icon: Hourglass,
    pill: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    chip: 'from-amber-400 to-orange-500',
  },
  reviewing: {
    label: 'Being reviewed',
    icon: Eye,
    pill: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
    chip: 'from-indigo-500 to-violet-600',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    pill: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    chip: 'from-emerald-500 to-teal-500',
  },
  in_use: {
    label: 'In use',
    icon: Activity,
    pill: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800',
    chip: 'from-cyan-500 to-blue-500',
  },
};

const KIND_ICON = { booking: Armchair, event: PartyPopper, gadget: Package } as const;
const KIND_LABEL = { booking: 'Space booking', event: 'Event proposal', gadget: 'Gadget' } as const;

// "Tue, Nov 17, 2026 · 9:00 AM – 5:00 PM · 8 hrs" — gadgets are charged and
// reported by the hour, so the window and its length matter. A borrow that
// spans days shows both ends.
function whenText(row: QueueRow): { when: string; hours: string | null } {
  const dateText = format(new Date(row.request_date + 'T00:00'), 'EEE, MMM d, yyyy');
  if (!row.starts_at) return { when: dateText, hours: null };
  const start = new Date(row.starts_at);
  if (!row.ends_at) return { when: `${dateText} · ${format(start, 'h:mm a')}`, hours: null };
  const end = new Date(row.ends_at);
  const hrs = (end.getTime() - start.getTime()) / 3_600_000;
  const hours = hrs > 0 ? `${Number.isInteger(hrs) ? hrs : hrs.toFixed(1)} hr${hrs === 1 ? '' : 's'}` : null;
  const sameDay = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd');
  const when = sameDay
    ? `${dateText} · ${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`
    : `${format(start, 'EEE, MMM d · h:mm a')} → ${format(end, 'EEE, MMM d · h:mm a')}`;
  return { when, hours };
}

function Row({ row }: { row: QueueRow }): JSX.Element {
  const stage = STAGE_STYLE[stageOf(row.status)];
  const StageIcon = stage.icon;
  const KindIcon = KIND_ICON[row.kind];
  const { when, hours } = whenText(row);
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
        <KindIcon className="h-4 w-4 text-[#0C2340] dark:text-slate-200" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          <span className="font-mono tracking-wider">{row.code}</span>
          <span className="font-normal text-gray-500 dark:text-gray-400"> · {row.label ?? KIND_LABEL[row.kind]}</span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {when}
          {hours && <span className="font-semibold text-gray-700 dark:text-gray-300"> · {hours}</span>}
        </p>
      </div>
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${stage.pill}`}>
        <StageIcon className="h-3 w-3" />
        {stage.label}
      </span>
    </li>
  );
}

/**
 * An anonymous glance at what's waiting at the Hub: a code, a status and a
 * date per request — no names, contact details or titles. The codes are
 * NOT reference numbers (a reference unlocks a full ticket), so they can
 * be shown to everyone safely.
 */
export default function RequestQueue(): JSX.Element | null {
  const [rows, setRows] = useState<QueueRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_public_request_queue');
        if (error) throw error;
        if (!cancelled) setRows((data as QueueRow[]) ?? []);
      } catch (err) {
        // A glance-only extra: if it can't load, just leave it out.
        console.error('Error loading request queue:', err);
        if (!cancelled) setRows(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (rows === null) return null;

  const spaceRows = rows.filter((r) => r.kind !== 'gadget');
  const gadgetRows = rows.filter((r) => r.kind === 'gadget');
  const count = (list: QueueRow[], stage: Stage): number => list.filter((r) => stageOf(r.status) === stage).length;
  const waiting = count(spaceRows, 'waiting');
  const reviewing = count(spaceRows, 'reviewing');
  const approved = count(spaceRows, 'approved');

  return (
    <div className="mt-12 space-y-6">
      {/* Spaces & events */}
      <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 bg-gradient-to-r from-[#0C2340] via-indigo-700 to-fuchsia-600 text-white">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-bold text-violet-200">
            <Radio className="h-3.5 w-3.5" /> Live at the Hub
          </p>
          <h2 className="text-xl font-extrabold mt-0.5">Bookings &amp; event proposals</h2>
          <p className="text-xs text-violet-100 mt-1">
            Anonymous — just a code, a status and a date. Use the search above to see your own.
          </p>
        </div>

        <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-slate-700 border-b border-gray-100 dark:border-slate-700">
          {([['waiting', waiting], ['reviewing', reviewing], ['approved', approved]] as const).map(([stage, n]) => (
            <div key={stage} className="px-3 py-3 text-center">
              <p className={`text-2xl font-extrabold bg-gradient-to-r ${STAGE_STYLE[stage].chip} bg-clip-text text-transparent`}>{n}</p>
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{STAGE_STYLE[stage].label}</p>
            </div>
          ))}
        </div>

        {spaceRows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Nothing in the queue — the Hub is wide open.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-700">
            {spaceRows.map((r) => <Row key={`${r.kind}-${r.code}`} row={r} />)}
          </ul>
        )}
      </section>

      {/* Gadgets */}
      <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
          <Package className="h-5 w-5 text-fuchsia-600" />
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Gadget borrowing</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Which gadgets are spoken for, and when.</p>
          </div>
        </div>
        {gadgetRows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No gadget requests right now.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-700">
            {gadgetRows.map((r) => <Row key={`${r.kind}-${r.code}`} row={r} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
