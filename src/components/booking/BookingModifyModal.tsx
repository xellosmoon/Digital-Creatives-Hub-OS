import { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface BookingModifyModalProps {
  booking: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingModifyModal({ booking, onClose, onSuccess }: BookingModifyModalProps) {
  const [loading, setLoading] = useState(false);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    spaceId: booking.space_id,
    date: format(new Date(booking.start_time), 'yyyy-MM-dd'),
    startTime: format(new Date(booking.start_time), 'HH:mm'),
    endTime: format(new Date(booking.end_time), 'HH:mm'),
    attendees: booking.attendees,
    purpose: booking.purpose
  });

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSpaces(data || []);
    } catch (error) {
      console.error('Error fetching spaces:', error);
    }
  };

  const checkAvailability = async () => {
    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('space_id', formData.spaceId)
      .neq('id', booking.id)
      .in('status', ['approved', 'pending'])
      .or(`start_time.lt.${endDateTime.toISOString()},end_time.gt.${startDateTime.toISOString()}`);

    if (error) throw error;
    return data?.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate times
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      if (endDateTime <= startDateTime) {
        throw new Error('End time must be after start time');
      }

      // Check if modification is allowed (24 hours before booking)
      const now = new Date();
      const hoursUntilBooking = (startDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilBooking < 24) {
        throw new Error('Bookings cannot be modified within 24 hours of the start time');
      }

      // Check availability
      const isAvailable = await checkAvailability();
      if (!isAvailable) {
        throw new Error('The selected time slot is not available');
      }

      // Update booking
      const { error } = await supabase
        .from('bookings')
        .update({
          space_id: formData.spaceId,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          attendees: formData.attendees,
          purpose: formData.purpose,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Booking modified successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to modify booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Modify Booking</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Booking Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Current Booking</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Space:</strong> {booking.space.name}</p>
              <p><strong>Date:</strong> {format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}</p>
              <p><strong>Time:</strong> {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}</p>
              <p><strong>Reference:</strong> {booking.booking_reference}</p>
            </div>
          </div>

          {/* Space Selection */}
          <div>
            <label htmlFor="space" className="block text-sm font-medium text-gray-700">
              Space
            </label>
            <select
              id="space"
              value={formData.spaceId}
              onChange={(e) => setFormData({ ...formData, spaceId: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              required
            >
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name} - ₱{space.hourly_rate}/hour
                </option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              type="date"
              id="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              min={format(addDays(new Date(), 2), 'yyyy-MM-dd')} // At least 2 days in advance
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              required
            />
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                Start Time
              </label>
              <input
                type="time"
                id="startTime"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                End Time
              </label>
              <input
                type="time"
                id="endTime"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label htmlFor="attendees" className="block text-sm font-medium text-gray-700">
              Number of Attendees
            </label>
            <input
              type="number"
              id="attendees"
              value={formData.attendees}
              onChange={(e) => setFormData({ ...formData, attendees: parseInt(e.target.value) })}
              min="1"
              max="50"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              required
            />
          </div>

          {/* Purpose */}
          <div>
            <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">
              Purpose
            </label>
            <textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Brief description of your booking purpose"
            />
          </div>

          {/* Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Modification Policy</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  Bookings can only be modified at least 24 hours before the start time.
                  Changes are subject to availability.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Modifying...' : 'Modify Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
