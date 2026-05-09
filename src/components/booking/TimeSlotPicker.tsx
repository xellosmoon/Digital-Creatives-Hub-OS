import { useState, useEffect } from 'react';
import { format, addDays, startOfDay, addHours, isBefore, isAfter, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TimeSlotPickerProps {
  spaceId: string;
  onSelect: (startTime: Date, endTime: Date) => void;
}

interface TimeSlot {
  time: Date;
  available: boolean;
}

export default function TimeSlotPicker({ spaceId, onSelect }: TimeSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExistingBookings();
  }, [selectedDate, spaceId]);

  useEffect(() => {
    generateTimeSlots();
  }, [selectedDate, existingBookings]);

  const fetchExistingBookings = async () => {
    setLoading(true);
    try {
      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = addDays(startOfSelectedDay, 1);

      const { data, error } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('space_id', spaceId)
        .in('status', ['approved', 'pending'])
        .gte('start_time', startOfSelectedDay.toISOString())
        .lt('start_time', endOfSelectedDay.toISOString());

      if (error) throw error;
      setExistingBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = () => {
    const slots: TimeSlot[] = [];
    const startHour = 8; // 8 AM
    const endHour = 20; // 8 PM
    const now = new Date();

    for (let hour = startHour; hour < endHour; hour++) {
      const slotTime = addHours(startOfDay(selectedDate), hour);
      
      // Check if slot is in the past
      if (isBefore(slotTime, now)) {
        slots.push({ time: slotTime, available: false });
        continue;
      }

      // Check if slot conflicts with existing bookings
      const isBooked = existingBookings.some(booking => {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);
        return (
          (slotTime >= bookingStart && slotTime < bookingEnd) ||
          (addHours(slotTime, 1) > bookingStart && addHours(slotTime, 1) <= bookingEnd)
        );
      });

      slots.push({ time: slotTime, available: !isBooked });
    }

    setTimeSlots(slots);
  };

  const handleTimeSelect = (slot: TimeSlot) => {
    if (!slot.available) return;

    if (!selectedStartTime) {
      setSelectedStartTime(slot.time);
      setSelectedEndTime(null);
    } else if (!selectedEndTime) {
      if (isBefore(slot.time, selectedStartTime)) {
        // If selected time is before start time, reset
        setSelectedStartTime(slot.time);
        setSelectedEndTime(null);
      } else {
        // Check if all slots between start and end are available
        const startIdx = timeSlots.findIndex(s => s.time.getTime() === selectedStartTime.getTime());
        const endIdx = timeSlots.findIndex(s => s.time.getTime() === slot.time.getTime());
        
        const allAvailable = timeSlots
          .slice(startIdx, endIdx + 1)
          .every(s => s.available);

        if (allAvailable) {
          setSelectedEndTime(addHours(slot.time, 1));
          onSelect(selectedStartTime, addHours(slot.time, 1));
        } else {
          // Reset if not all slots are available
          setSelectedStartTime(slot.time);
          setSelectedEndTime(null);
        }
      }
    } else {
      // Reset selection
      setSelectedStartTime(slot.time);
      setSelectedEndTime(null);
    }
  };

  const isSlotSelected = (slot: TimeSlot) => {
    if (!selectedStartTime) return false;
    if (!selectedEndTime) return slot.time.getTime() === selectedStartTime.getTime();
    
    return slot.time >= selectedStartTime && slot.time < selectedEndTime;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = direction === 'next' 
      ? addDays(selectedDate, 1)
      : addDays(selectedDate, -1);
    
    // Don't allow selecting past dates
    if (!isBefore(newDate, startOfDay(new Date()))) {
      setSelectedDate(newDate);
      setSelectedStartTime(null);
      setSelectedEndTime(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
        <button
          onClick={() => navigateDate('prev')}
          disabled={isSameDay(selectedDate, new Date())}
          className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <h3 className="text-lg font-medium">
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h3>
        
        <button
          onClick={() => navigateDate('next')}
          className="p-2 rounded-md hover:bg-gray-200"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Time Slots */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {timeSlots.map((slot, index) => (
            <button
              key={index}
              onClick={() => handleTimeSelect(slot)}
              disabled={!slot.available}
              className={`
                py-2 px-3 rounded-md text-sm font-medium transition-colors
                ${isSlotSelected(slot)
                  ? 'bg-primary-600 text-white'
                  : slot.available
                  ? 'bg-white border border-gray-300 hover:bg-gray-50'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {format(slot.time, 'h:mm a')}
            </button>
          ))}
        </div>
      )}

      {/* Selection Summary */}
      {selectedStartTime && (
        <div className="bg-primary-50 p-4 rounded-lg">
          <p className="text-sm text-primary-900">
            <span className="font-medium">Selected time:</span>{' '}
            {format(selectedStartTime, 'h:mm a')}
            {selectedEndTime && ` - ${format(selectedEndTime, 'h:mm a')}`}
          </p>
          {!selectedEndTime && (
            <p className="text-xs text-primary-700 mt-1">
              Click another time slot to select end time
            </p>
          )}
        </div>
      )}
    </div>
  );
}
