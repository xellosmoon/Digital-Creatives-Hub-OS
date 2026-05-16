import { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { format, addWeeks, addMonths } from 'date-fns';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface RecurringBookingModalProps {
  spaceId: string;
  spaceName: string;
  date: Date;
  startTime: string;
  endTime: string;
  attendees: number;
  purpose: string;
  totalCost: number;
  onClose: () => void;
  onSuccess: () => void;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
}

type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export default function RecurringBookingModal({
  spaceId,
  spaceName,
  date,
  startTime,
  endTime,
  attendees,
  purpose,
  totalCost,
  onClose,
  onSuccess,
  guestName,
  guestEmail,
  guestPhone
}: RecurringBookingModalProps): JSX.Element {
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('weekly');
  const [occurrences, setOccurrences] = useState(4);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Date[]>([]);

  // Generate preview dates
  const generateDates = (): void => {
    const dates: Date[] = [date];
    let currentDate = date;

    for (let i = 1; i < occurrences; i++) {
      switch (recurrenceType) {
        case 'daily':
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate = addWeeks(currentDate, 1);
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, 1);
          break;
      }
      dates.push(new Date(currentDate));
    }

    setPreview(dates);
  };

  useEffect(() => {
    generateDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurrenceType, occurrences]);

  const handleRecurrenceChange = (type: RecurrenceType): void => {
    setRecurrenceType(type);
    generateDates();
  };

  const handleOccurrencesChange = (value: number): void => {
    setOccurrences(value);
    generateDates();
  };

  const handleSubmit = async (): Promise<void> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create bookings for all dates
      const bookingPromises = preview.map(bookingDate => 
        supabase.from('bookings').insert({
          space_id: spaceId,
          user_id: user?.id || null,
          user_name: guestName || user?.user_metadata?.full_name || user?.email || 'Guest',
          user_email: guestEmail || user?.email || '',
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          date: format(bookingDate, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
          attendees,
          purpose,
          status: 'pending',
          total_cost: totalCost
        })
      );

      const results = await Promise.all(bookingPromises);
      
      // Check if any failed
      const failed = results.filter(r => r.error);
      if (failed.length > 0) {
        throw new Error(`Failed to create ${failed.length} bookings`);
      }

      toast.success(`Created ${preview.length} recurring bookings successfully!`);
      onSuccess();
    } catch (error) {
      console.error('Error creating recurring bookings:', error);
      toast.error('Failed to create recurring bookings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create Recurring Booking</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Booking Details */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Booking Details</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Space:</span> {spaceName}</p>
              <p><span className="font-medium">Time:</span> {startTime} - {endTime}</p>
              <p><span className="font-medium">Attendees:</span> {attendees}</p>
              <p><span className="font-medium">Cost per booking:</span> ₱{totalCost}</p>
            </div>
          </div>

          {/* Recurrence Options */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repeat
            </label>
            <select
              value={recurrenceType}
              onChange={(e) => handleRecurrenceChange(e.target.value as RecurrenceType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Occurrences
            </label>
            <input
              type="number"
              min="2"
              max="52"
              value={occurrences}
              onChange={(e) => handleOccurrencesChange(parseInt(e.target.value) || 2)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Preview */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Preview Dates</h3>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
              <div className="space-y-1">
                {preview.map((previewDate, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <span className={index === 0 ? 'font-medium' : ''}>
                      {format(previewDate, 'EEEE, MMMM d, yyyy')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Total Cost */}
          <div className="mb-6 p-4 bg-primary-50 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-primary-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-primary-900">
                  Total Cost: ₱{(totalCost * preview.length).toFixed(2)}
                </p>
                <p className="text-xs text-primary-700">
                  {preview.length} bookings × ₱{totalCost} each
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : `Create ${preview.length} Bookings`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
