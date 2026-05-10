import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isAfter, startOfDay, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Clock, Users, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import QuickBookingModal from './QuickBookingModal';
import EventDetailsModal from './EventDetailsModal';

interface CalendarBooking {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  user_name?: string;
  guest_name?: string;
  attendees: number;
  purpose?: string;
  is_public_event?: boolean;
  event_title?: string;
  event_description?: string;
  event_poster_url?: string;
  event_registration_link?: string;
  event_organizer?: string;
  space: {
    id: string;
    name: string;
    type: string;
  };
}

export default function PublicCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('public-bookings')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'bookings',
          filter: 'status=eq.approved'
        }, 
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentDate]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'approved')
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Fetch space details for each booking
      if (data && data.length > 0) {
        const spaceIds = [...new Set(data.map(b => b.space_id))];
        const { data: spacesData } = await supabase
          .from('spaces')
          .select('id, name, type')
          .in('id', spaceIds);

        // Combine bookings with space data
        const bookingsWithSpaces = data.map(booking => ({
          ...booking,
          space: spacesData?.find(space => space.id === booking.space_id) || { name: 'Unknown Space', type: 'unknown' }
        }));

        setBookings(bookingsWithSpaces);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  };

  const getBookingsForDay = (date: Date) => {
    return bookings.filter(booking => 
      isSameDay(new Date(booking.start_time), date)
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'next') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const renderBookingInfo = (booking: CalendarBooking) => {
    // Default privacy settings - in production, these could be stored in the database
    const settings = {
      show_organizer_name: true,
      show_attendee_count: true,
      show_booking_purpose: false
    };

    // For coworking spaces, show anonymous info
    if (booking.space.type === 'coworking') {
      return (
        <div className="text-xs">
          <span className="font-medium">{booking.space.name}</span>
          {settings.show_attendee_count && (
            <span className="ml-1 text-gray-500">({booking.attendees} person)</span>
          )}
        </div>
      );
    }

    // For other spaces, show based on settings
    return (
      <div className="text-xs">
        <span className="font-medium">{booking.space.name}</span>
        {settings.show_organizer_name && booking.guest_name && (
          <div className="text-gray-600">{booking.guest_name}</div>
        )}
        {settings.show_booking_purpose && booking.purpose && (
          <div className="text-gray-500 truncate">{booking.purpose}</div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Calendar Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 hover:bg-gray-100 rounded-md text-sm font-medium"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-px mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-700 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {getDaysInMonth().map((day, idx) => {
                const dayBookings = getBookingsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      const publicEvents = dayBookings.filter(b => b.is_public_event);
                      
                      if (publicEvents.length > 0) {
                        // If there's a public event, show event details
                        setSelectedEvent(publicEvents[0]);
                        setShowEventModal(true);
                      } else if (isAfter(startOfDay(day), startOfDay(new Date())) || isSameDay(day, new Date())) {
                        // Otherwise, show booking modal for future dates
                        setSelectedDate(day);
                        setShowBookingModal(true);
                      }
                    }}
                    className={`
                      bg-white p-2 min-h-[100px] relative group
                      ${!isCurrentMonth ? 'text-gray-400' : ''}
                      ${isToday ? 'bg-primary-50' : ''}
                      ${isSelected ? 'ring-2 ring-primary-500' : ''}
                      ${isAfter(startOfDay(day), startOfDay(new Date())) || isSameDay(day, new Date()) 
                        ? 'cursor-pointer hover:bg-gray-50' 
                        : 'cursor-not-allowed opacity-60'}
                    `}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{format(day, 'd')}</span>
                      {(isAfter(startOfDay(day), startOfDay(new Date())) || isSameDay(day, new Date())) && (
                        <Plus className="w-4 h-4 text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayBookings.slice(0, 3).map((booking, bookingIdx) => (
                        <div
                          key={bookingIdx}
                          className={`px-1 py-0.5 rounded text-xs truncate ${
                            booking.is_public_event 
                              ? 'bg-amber-100 text-amber-800 font-medium' 
                              : 'bg-primary-100 text-primary-800'
                          }`}
                        >
                          {booking.is_public_event ? (
                            <>
                              <CalendarIcon className="inline w-3 h-3 mr-1" />
                              {booking.event_title || booking.purpose}
                            </>
                          ) : (
                            <>
                              {format(new Date(booking.start_time), 'HH:mm')} - 
                              {renderBookingInfo(booking)}
                            </>
                          )}
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{dayBookings.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="px-6 py-4 border-t border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          <div className="space-y-2">
            {getBookingsForDay(selectedDate).length === 0 ? (
              <p className="text-gray-500 text-sm">No bookings for this date</p>
            ) : (
              getBookingsForDay(selectedDate).map((booking, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm font-medium">
                          {booking.start_time} - {booking.end_time}
                        </span>
                      </div>
                      <div className="mt-1">
                        {renderBookingInfo(booking)}
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="h-4 w-4 mr-1" />
                      {booking.attendees}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Quick Booking Modal */}
      {showBookingModal && selectedDate && (
        <QuickBookingModal
          date={selectedDate}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedDate(null);
          }}
        />
      )}

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          onBookSpace={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
            setShowBookingModal(true);
            setSelectedDate(new Date(selectedEvent.start_time));
          }}
        />
      )}
    </div>
  );
}
