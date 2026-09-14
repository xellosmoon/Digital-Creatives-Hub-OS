import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  X, Calendar, Clock, Users, CalendarPlus, Megaphone,
  Wrench, AlertTriangle, Sparkles,
} from 'lucide-react';
import type { CalendarEvent } from '../../types';
import { normalizeEventCategory, getEventCategoryLabel, getEventCategoryStyle } from '../../lib/eventCategories';

interface SimplifiedPackage {
  slug: string;
  name: string;
  is_bundle: boolean;
}

// Deliberately narrow — this comes from the public calendar's PII-free
// RPC, so there's no guest_name/guest_email/purpose to render here (see
// 062_fix_public_pii_exposure.sql).
interface TimelineBooking {
  id: string;
  start_time: string;
  end_time: string;
  is_workshop: boolean;
  seats_used: number;
  package?: SimplifiedPackage;
}

interface DayTimelineModalProps {
  date: Date;
  events: CalendarEvent[];
  bookings: TimelineBooking[];
  activeUsers: number;
  /** Whether this date can still be booked (today or later) — hides the
   *  booking/propose CTAs for past days instead of offering a dead end. */
  bookable: boolean;
  onClose: () => void;
  onEventClick: (event: CalendarEvent) => void;
  onBookSpace: () => void;
}

type AgendaItem =
  | { kind: 'event'; start: Date; event: CalendarEvent }
  | { kind: 'booking'; start: Date; booking: TimelineBooking };

/**
 * A day's full agenda, as a chronological card list — replaced the old
 * absolute-positioned hour-by-hour track (6 AM–10 PM grid lines with
 * floating blocks), which read as bland and didn't actually let you do
 * anything beyond look. Every event and booking is a real card now, and
 * the footer always offers a way to act on this date: book a seat, or
 * propose your own event here.
 */
export default function DayTimelineModal({
  date,
  events,
  bookings,
  activeUsers,
  bookable,
  onClose,
  onEventClick,
  onBookSpace,
}: DayTimelineModalProps): JSX.Element {
  const navigate = useNavigate();

  const agenda: AgendaItem[] = [
    ...events.map((event): AgendaItem => ({ kind: 'event', start: new Date(event.start_time), event })),
    ...bookings.map((booking): AgendaItem => ({ kind: 'booking', start: new Date(booking.start_time), booking })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  const bookingLabel = (booking: TimelineBooking): { label: string; icon: typeof Wrench; style: ReturnType<typeof getEventCategoryStyle> } => {
    if (booking.is_workshop) {
      return { label: 'Workshop / Event Block', icon: AlertTriangle, style: getEventCategoryStyle('workshops') };
    }
    if (booking.package?.is_bundle) {
      return { label: booking.package.name, icon: Wrench, style: getEventCategoryStyle('other') };
    }
    return { label: booking.package?.name ?? 'Coworking', icon: Users, style: getEventCategoryStyle('community') };
  };

  const handlePropose = (): void => {
    onClose();
    navigate('/propose-event');
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-800 shadow-2xl rounded-3xl overflow-hidden transition-all max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#0C2340] via-indigo-800 to-fuchsia-700 text-white px-6 py-6 flex-shrink-0 overflow-hidden">
          {/* Decorative glow — same trick EventDetailsModal uses for its
              poster fallback, so the two modals feel like one family. */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute -top-8 -right-8 w-48 h-48 bg-fuchsia-400/40 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-300/30 rounded-full blur-3xl" />
          </div>

          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-violet-200 font-bold mb-1">
                {format(date, 'MMMM yyyy')}
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight drop-shadow-sm">{format(date, 'EEEE, MMMM d')}</h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-bold">
                  {events.length} event{events.length !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-bold">
                  {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-bold">
                  {activeUsers > 0 && <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>}
                  {activeUsers} active on floor
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/80 hover:text-white flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Agenda */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {agenda.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30 rotate-3">
                <Sparkles className="w-9 h-9 text-white" />
              </div>
              <p className="font-extrabold text-lg text-slate-900 dark:text-white">This day is wide open</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Be the first to fill it — book a seat or bring your own event.</p>
            </div>
          ) : (
            agenda.map((item) => {
              if (item.kind === 'event') {
                const category = normalizeEventCategory(item.event.category);
                const style = getEventCategoryStyle(category);
                return (
                  <button
                    key={`event-${item.event.id}`}
                    onClick={() => onEventClick(item.event)}
                    className="group w-full text-left flex items-stretch gap-3 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] transition-all duration-200 overflow-hidden"
                  >
                    <div className={`w-1.5 flex-shrink-0 bg-gradient-to-b ${style.gradient}`} />
                    {item.event.poster_url ? (
                      <img src={item.event.poster_url} alt="" className="w-20 flex-shrink-0 object-cover group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <div className={`w-20 flex-shrink-0 bg-gradient-to-br ${style.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        {item.event.is_featured ? <Sparkles className="w-6 h-6 text-white" /> : <Calendar className="w-6 h-6 text-white" />}
                      </div>
                    )}
                    <div className="py-3 pr-4 pl-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.chip} ${style.text}`}>
                          {getEventCategoryLabel(category)}
                        </span>
                        {item.event.is_featured && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                            <Sparkles className="w-2.5 h-2.5" /> Featured
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.event.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(item.event.start_time), 'h:mm a')} – {format(new Date(item.event.end_time), 'h:mm a')}
                      </p>
                    </div>
                  </button>
                );
              }

              const { label, icon: Icon, style } = bookingLabel(item.booking);
              return (
                <div
                  key={`booking-${item.booking.id}`}
                  className="group w-full flex items-stretch gap-3 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                >
                  <div className={`w-14 flex-shrink-0 flex items-center justify-center ${style.chip} border-r group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-5 h-5 ${style.text}`} />
                  </div>
                  <div className="py-3 pr-4 flex-1 min-w-0 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(item.booking.start_time), 'h:mm a')} – {format(new Date(item.booking.end_time), 'h:mm a')}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border ${style.chip} ${style.text}`}>
                      <Users className="w-3 h-3" /> {item.booking.seats_used}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer — the calendar's own copy promises "click a date to book
            a seat," and now proposing an event is one tap away too. */}
        {bookable && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-700 flex-shrink-0 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={onBookSpace}
              className="group flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#0C2340] via-indigo-600 to-fuchsia-600 bg-[length:200%_auto] hover:bg-[right_center] shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-fuchsia-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              <CalendarPlus className="h-4 w-4 group-hover:rotate-6 transition-transform" />
              Book This Date
            </button>
            <button
              onClick={handlePropose}
              className="group flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-fuchsia-300 dark:hover:border-fuchsia-500 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              <Megaphone className="h-4 w-4 group-hover:rotate-6 transition-transform" />
              Propose an Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
