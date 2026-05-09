import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Users, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CalendarBooking {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  user_name?: string;
  guest_name?: string;
  attendees: number;
  purpose?: string;
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
        .select(`
          *,
          space:spaces (*)
        `)
        .eq('status', 'approved')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
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
                    onClick={() => setSelectedDate(day)}
                    className={`
                      bg-white p-2 min-h-[100px] cursor-pointer hover:bg-gray-50
                      ${!isCurrentMonth ? 'text-gray-400' : ''}
                      ${isToday ? 'bg-primary-50' : ''}
                      ${isSelected ? 'ring-2 ring-primary-500' : ''}
                    `}
                  >
                    <div className="font-medium text-sm mb-1">
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayBookings.slice(0, 3).map((booking, bookingIdx) => (
                        <div
                          key={bookingIdx}
                          className="bg-primary-100 text-primary-800 px-1 py-0.5 rounded text-xs truncate"
                        >
                          {format(new Date(booking.start_time), 'HH:mm')} - 
                          {renderBookingInfo(booking)}
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
    </div>
  );
}
