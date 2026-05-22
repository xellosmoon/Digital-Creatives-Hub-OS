import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, ArrowRight, ExternalLink, Sparkles, ChevronLeft, ChevronRight, X, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CalendarEvent } from '../../types';

export default function EventCards(): JSX.Element {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const pastScrollRef = useRef<HTMLDivElement>(null);
  const upcomingScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async (): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('start_time', { ascending: false })
        .limit(12);

      if (error) throw error;
      setEvents((data as CalendarEvent[]) ?? []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const upcomingEvents = events
    .filter(e => new Date(e.start_time) >= now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const pastEvents = events
    .filter(e => new Date(e.start_time) < now)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const scrollPast = (direction: 'left' | 'right'): void => {
    const container = pastScrollRef.current;
    if (!container) return;
    const scrollAmount = 460;
    container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

  const scrollUpcoming = (direction: 'left' | 'right'): void => {
    const container = upcomingScrollRef.current;
    if (!container) return;
    const scrollAmount = 460;
    container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return <></>;
  }

  return (
    <>
      <div className="py-20 bg-gradient-to-b from-white via-violet-50/30 to-white relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-[#F59E0B]/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-20 right-10 w-64 h-64 bg-[#0C2340]/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-[#F59E0B]/10 to-[#0C2340]/10 text-[#0C2340] border border-[#F59E0B]/20">
                <Sparkles className="w-4 h-4 mr-2 text-[#F59E0B]" />
                Events at the Hub
              </span>
            </div>
            <h2 className="text-4xl font-bold text-[#0C2340] mb-4">
              Our Event Catalog
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Workshops, deliberations, and collaborative sessions hosted at the Digital Creatives Hub
            </p>
          </div>

          {/* ═══ UPCOMING EVENTS — horizontal scroll ═══ */}
          {upcomingEvents.length > 0 && (
            <div className="mb-16">
              <h3 className="text-2xl font-bold text-[#0C2340] mb-6 flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white">
                  <Calendar className="w-4 h-4" />
                </span>
                Upcoming Events
                <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  {upcomingEvents.length} event{upcomingEvents.length > 1 ? 's' : ''}
                </span>
              </h3>

              <div className="relative group/scroll">
                {/* Left Arrow */}
                <button
                  onClick={() => scrollUpcoming('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-20 bg-white/90 backdrop-blur-sm hover:bg-white shadow-xl rounded-full p-3 transition-all duration-300 hover:scale-110 border border-gray-200 opacity-0 group-hover/scroll:opacity-100"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-5 h-5 text-[#0C2340]" />
                </button>

                {/* Right Arrow */}
                <button
                  onClick={() => scrollUpcoming('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-20 bg-white/90 backdrop-blur-sm hover:bg-white shadow-xl rounded-full p-3 transition-all duration-300 hover:scale-110 border border-gray-200 opacity-0 group-hover/scroll:opacity-100"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-5 h-5 text-[#0C2340]" />
                </button>

                {/* Scrollable Upcoming Events */}
                <div
                  ref={upcomingScrollRef}
                  className="flex gap-6 overflow-x-auto scroll-smooth pb-4 snap-x"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {upcomingEvents.map((event, index) => (
                    <UpcomingEventCard key={event.id} event={event} index={index} onClick={() => setSelectedEvent(event)} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ PAST EVENTS — horizontal scroll catalog ═══ */}
          {pastEvents.length > 0 && (
            <div>
              <h3 className="text-2xl font-bold text-[#0C2340] mb-6 flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-500 text-white">
                  <Clock className="w-4 h-4" />
                </span>
                Past Events
                <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {pastEvents.length} event{pastEvents.length > 1 ? 's' : ''}
                </span>
              </h3>

              <div className="relative group/scroll">
                {/* Left Arrow */}
                <button
                  onClick={() => scrollPast('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-20 bg-white/90 backdrop-blur-sm hover:bg-white shadow-xl rounded-full p-3 transition-all duration-300 hover:scale-110 border border-gray-200 opacity-0 group-hover/scroll:opacity-100"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-5 h-5 text-[#0C2340]" />
                </button>

                {/* Right Arrow */}
                <button
                  onClick={() => scrollPast('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-20 bg-white/90 backdrop-blur-sm hover:bg-white shadow-xl rounded-full p-3 transition-all duration-300 hover:scale-110 border border-gray-200 opacity-0 group-hover/scroll:opacity-100"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-5 h-5 text-[#0C2340]" />
                </button>

                {/* Scrollable Past Events */}
                <div
                  ref={pastScrollRef}
                  className="flex gap-6 overflow-x-auto scroll-smooth pb-4 snap-x"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {pastEvents.map((event, index) => (
                    <PastEventCard key={event.id} event={event} index={index} onClick={() => setSelectedEvent(event)} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* View All Link */}
          <div className="text-center mt-10">
            <a
              href="/calendar"
              className="inline-flex items-center gap-2 text-[#0C2340] hover:text-[#F59E0B] font-semibold transition-colors group"
            >
              View Full Calendar
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>

      {/* ═══ EVENT DETAIL MODAL ═══ */}
      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Upcoming Event Card — horizontal scroll item
   ────────────────────────────────────────────────────────────────── */
interface UpcomingEventCardProps {
  event: CalendarEvent;
  index: number;
  onClick: () => void;
}

function UpcomingEventCard({ event, index, onClick }: UpcomingEventCardProps): JSX.Element {
  const gradients = [
    'from-emerald-500 to-teal-600',
    'from-green-500 to-emerald-600',
    'from-teal-500 to-cyan-600',
    'from-lime-500 to-green-600',
    'from-cyan-500 to-blue-600',
    'from-sky-500 to-indigo-600',
  ];
  const gradient = gradients[index % gradients.length];

  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-[420px] snap-start cursor-pointer group"
    >
      <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border-2 border-emerald-100 hover:border-emerald-300 hover:-translate-y-2">
        {/* Poster Image */}
        <div className="relative h-64 overflow-hidden">
          {event.poster_url ? (
            <img
              src={event.poster_url}
              alt={event.title}
              className="w-full h-full object-contain bg-gray-50 group-hover:scale-105 transition-transform duration-700"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <Calendar className="w-16 h-16 text-white/80" />
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
          
          {/* Badges */}
          <div className="absolute top-4 right-4 flex gap-1.5">
            {event.is_featured && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#F59E0B] text-white shadow-lg">
                <Sparkles className="w-3 h-3 mr-1" />
                Featured
              </span>
            )}
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-lg animate-pulse">
              Upcoming
            </span>
          </div>

          {/* Date on image */}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow">
            <p className="text-sm font-bold text-[#0C2340]">{format(new Date(event.start_time), 'MMM d, yyyy')}</p>
            <p className="text-xs text-gray-600">{format(new Date(event.start_time), 'h:mm a')}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-lg font-bold text-[#0C2340] mb-1 line-clamp-2 group-hover:text-emerald-600 transition-colors">
            {event.title}
          </h3>
          {event.description && (
            <p className="text-gray-600 text-sm line-clamp-2 mb-2 leading-relaxed">
              {event.description}
            </p>
          )}
          {event.organizer && (
            <p className="text-xs text-gray-500">
              Hosted by <span className="font-semibold text-gray-700">{event.organizer}</span>
            </p>
          )}
          <p className="text-xs text-emerald-600 font-medium mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to view full details →</p>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Past Event Card — horizontal scroll item
   ────────────────────────────────────────────────────────────────── */
interface PastEventCardProps {
  event: CalendarEvent;
  index: number;
  onClick: () => void;
}

function PastEventCard({ event, index, onClick }: PastEventCardProps): JSX.Element {
  const gradients = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-indigo-600',
    'from-amber-500 to-orange-600',
    'from-emerald-500 to-teal-600',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-blue-600',
  ];
  const gradient = gradients[index % gradients.length];

  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-[420px] snap-start cursor-pointer group"
    >
      <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 hover:border-[#F59E0B]/30 hover:-translate-y-2">
        {/* Poster Image — taller */}
        <div className="relative h-64 overflow-hidden">
          {event.poster_url ? (
            <img
              src={event.poster_url}
              alt={event.title}
              className="w-full h-full object-contain bg-gray-50 group-hover:scale-105 transition-transform duration-700"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <Calendar className="w-16 h-16 text-white/80" />
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
          
          {/* Badges */}
          <div className="absolute top-4 right-4 flex gap-1.5">
            {event.is_featured && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#F59E0B] text-white shadow-lg">
                <Sparkles className="w-3 h-3 mr-1" />
                Featured
              </span>
            )}
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-600 text-white shadow-lg">
              Concluded
            </span>
          </div>

          {/* Date on image */}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow">
            <p className="text-sm font-bold text-[#0C2340]">{format(new Date(event.start_time), 'MMM d, yyyy')}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-lg font-bold text-[#0C2340] mb-1 line-clamp-2 group-hover:text-[#F59E0B] transition-colors">
            {event.title}
          </h3>
          {event.description && (
            <p className="text-gray-600 text-sm line-clamp-2 mb-2 leading-relaxed">
              {event.description}
            </p>
          )}
          {event.organizer && (
            <p className="text-xs text-gray-500">
              Hosted by <span className="font-semibold text-gray-700">{event.organizer}</span>
            </p>
          )}
          <p className="text-xs text-[#0C2340] font-medium mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to read more →</p>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Event Detail Modal — full details popup
   ────────────────────────────────────────────────────────────────── */
interface EventDetailModalProps {
  event: CalendarEvent;
  onClose: () => void;
}

function EventDetailModal({ event, onClose }: EventDetailModalProps): JSX.Element {
  const isPast = new Date(event.end_time) < new Date();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all hover:scale-110"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>

        <div className="overflow-y-auto max-h-[90vh]">
          {/* Poster */}
          {event.poster_url && (
            <div className="w-full bg-gray-100">
              <img
                src={event.poster_url}
                alt={event.title}
                className="w-full h-auto object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}

          {/* Content */}
          <div className="p-8">
            {/* Status + Date */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {isPast ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                  Concluded
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                  Upcoming
                </span>
              )}
              {event.is_featured && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Featured
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-2xl md:text-3xl font-bold text-[#0C2340] mb-4">
              {event.title}
            </h2>

            {/* Meta info */}
            <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#F59E0B]" />
                {format(new Date(event.start_time), 'EEEE, MMMM d, yyyy')}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0C2340]" />
                {format(new Date(event.start_time), 'h:mm a')} – {format(new Date(event.end_time), 'h:mm a')}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Digital Creatives Hub Iligan
              </span>
            </div>

            {/* Organizer */}
            {event.organizer && (
              <p className="text-sm text-gray-600 mb-6">
                Hosted by <span className="font-bold text-[#0C2340]">{event.organizer}</span>
              </p>
            )}

            {/* Description */}
            {event.description && (
              <div className="mb-8">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">About this Event</h4>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
              {(event as any).facebook_post_url && (
                <a
                  href={(event as any).facebook_post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  View on Facebook
                </a>
              )}
              {event.registration_link && !isPast && (
                <a
                  href={event.registration_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#0C2340] to-[#0C2340]/90 hover:from-[#F59E0B] hover:to-[#F59E0B]/90 text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Learn More
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-semibold text-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
