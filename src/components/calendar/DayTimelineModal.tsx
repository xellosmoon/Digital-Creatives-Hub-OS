import { format } from 'date-fns';
import { X, Calendar, Clock, Users, MapPin, User } from 'lucide-react';
import type { CalendarEvent } from '../../types';
import type { HubBooking } from '../../types/hub';

interface SimplifiedPackage {
  slug: string;
  name: string;
  is_bundle: boolean;
}

interface TimelineBooking extends Omit<HubBooking, 'package'> {
  package?: SimplifiedPackage;
}

interface DayTimelineModalProps {
  date: Date;
  events: CalendarEvent[];
  bookings: TimelineBooking[];
  activeUsers: number;
  onClose: () => void;
  onEventClick: (event: CalendarEvent) => void;
  getEventCategory: (event: CalendarEvent) => string;
}

export default function DayTimelineModal({
  date,
  events,
  bookings,
  activeUsers,
  onClose,
  onEventClick,
  getEventCategory,
}: DayTimelineModalProps): JSX.Element {
  // Hour slots from 6 AM to 10 PM
  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6-22

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'Tech & Dev':
        return 'bg-cyan-500 text-white border-cyan-400 shadow-cyan-200/50';
      case 'Workshops':
        return 'bg-amber-500 text-white border-amber-400 shadow-amber-200/50';
      case 'Community':
        return 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-200/50';
      default:
        return 'bg-blue-500 text-white border-blue-400 shadow-blue-200/50';
    }
  };

  const getBookingStyle = (booking: TimelineBooking) => {
    if (booking.is_workshop) {
      return 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-red-400 shadow-red-200/50';
    }
    if (booking.package?.is_bundle) {
      return 'bg-gradient-to-r from-purple-500 to-violet-500 text-white border-purple-400 shadow-purple-200/50';
    }
    return 'bg-gradient-to-r from-slate-500 to-gray-500 text-white border-slate-400 shadow-slate-200/50';
  };

  // Calculate position and height for a block
  const getBlockStyle = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const duration = endHour - startHour;
    
    // Each hour is 60px tall
    const top = (startHour - 6) * 60;
    const height = Math.max(duration * 60, 30); // Minimum 30px height
    
    return { top: `${Math.max(0, top)}px`, height: `${height}px` };
  };

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0C2340] via-[#0C2340] to-blue-600 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-violet-200" />
              <div>
                <h2 className="text-xl font-bold">{format(date, 'EEEE, MMMM d, yyyy')}</h2>
                <p className="text-sm text-violet-200 mt-0.5">
                  {events.length} event{events.length !== 1 ? 's' : ''} · {bookings.length} booking{bookings.length !== 1 ? 's' : ''} · {activeUsers} active user{activeUsers !== 1 ? 's' : ''} on floor
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/80 hover:text-white"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="relative">
            {/* Time slots */}
            <div className="absolute left-0 top-0 bottom-0 w-16 space-y-0">
              {hours.map(hour => (
                <div key={hour} className="h-[60px] flex items-center justify-end pr-3 text-xs text-gray-400 font-medium">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
              ))}
            </div>

            {/* Timeline content */}
            <div className="ml-16 relative h-[1020px]">
              {/* Hour lines */}
              {hours.map(hour => (
                <div key={hour} className="absolute w-full border-t border-gray-100" style={{ top: `${(hour - 6) * 60}px` }} />
              ))}

              {/* Events */}
              {events.map(ev => {
                const category = getEventCategory(ev);
                const style = getBlockStyle(ev.start_time, ev.end_time);
                const catStyle = getCategoryStyles(category);
                
                return (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className={`absolute left-2 right-2 rounded-xl border-2 p-3 text-left transition-all hover:scale-[1.02] hover:shadow-lg ${catStyle}`}
                    style={style}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{ev.title}</p>
                        <p className="text-xs opacity-90 mt-0.5">
                          {format(new Date(ev.start_time), 'h:mm a')} – {format(new Date(ev.end_time), 'h:mm a')}
                        </p>
                        {ev.organization || ev.organizer ? (
                          <p className="text-xs opacity-80 mt-0.5 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {ev.organization || ev.organizer}
                          </p>
                        ) : null}
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/30 ${catStyle}`}>
                        {category}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Bookings */}
              {bookings.map(b => {
                const style = getBlockStyle(b.start_time, b.end_time);
                const bookingStyle = getBookingStyle(b);
                
                return (
                  <div
                    key={b.id}
                    className={`absolute left-2 right-2 rounded-xl border-2 p-3 transition-all ${bookingStyle}`}
                    style={style}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate">{b.package?.name ?? 'Coworking'}</p>
                          {b.is_workshop && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/20 border border-white/30">
                              Workshop
                            </span>
                          )}
                          {b.package?.is_bundle && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/20 border border-white/30">
                              Bundle
                            </span>
                          )}
                        </div>
                        <p className="text-xs opacity-90 mt-0.5">
                          {format(new Date(b.start_time), 'h:mm a')} – {format(new Date(b.end_time), 'h:mm a')}
                        </p>
                        {b.guest_name && (
                          <p className="text-xs opacity-80 mt-0.5 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {b.guest_name}
                          </p>
                        )}
                        {b.purpose && Array.isArray(b.purpose) && b.purpose.length > 0 && (
                          <p className="text-[10px] opacity-70 mt-0.5">
                            {b.purpose.slice(0, 2).join(', ')}
                            {b.purpose.length > 2 && ` +${b.purpose.length - 2} more`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center text-xs font-semibold bg-white/20 px-2 py-1 rounded-lg">
                        <Users className="w-3 h-3 mr-1" />
                        {b.seats_used}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty state */}
              {events.length === 0 && bookings.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">No events or bookings</p>
                    <p className="text-xs mt-1">This day is free</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
