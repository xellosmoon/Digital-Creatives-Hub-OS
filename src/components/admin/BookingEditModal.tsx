import { useState } from 'react';
import { format } from 'date-fns';
import { X, Calendar, Clock, User, Mail, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Booking } from '../../types';
import TimeSlotPicker from '../booking/TimeSlotPicker';

interface BookingEditModalProps {
  booking: Booking & {
    space: {
      name: string;
      hourly_rate: number;
    };
  };
  onClose: () => void;
  onUpdate: () => void;
}

export default function BookingEditModal({ booking, onClose, onUpdate }: BookingEditModalProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState<'details' | 'reschedule' | 'event'>('details');
  const [formData, setFormData] = useState({
    guest_name: booking.guest_name || '',
    guest_email: booking.guest_email || '',
    guest_phone: booking.guest_phone || '',
    attendees: booking.attendees || 1,
    purpose: booking.purpose || '',
    status: booking.status
  });
  const [eventData, setEventData] = useState({
    is_public_event: booking.is_public_event || false,
    event_title: booking.event_title || '',
    event_description: booking.event_description || '',
    event_poster_url: booking.event_poster_url || '',
    event_registration_link: booking.event_registration_link || '',
    event_organizer: booking.event_organizer || '',
    event_contact_email: booking.event_contact_email || '',
    event_contact_phone: booking.event_contact_phone || '',
    is_featured_event: booking.is_featured_event || false
  });
  const [newStartTime, setNewStartTime] = useState<Date | null>(null);
  const [newEndTime, setNewEndTime] = useState<Date | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: Record<string, unknown> = {
        ...formData,
        updated_at: new Date().toISOString()
      };

      // If editing event details, add event data
      if (editMode === 'event') {
        Object.assign(updates, eventData);
      }

      // If rescheduling, add new times
      if (editMode === 'reschedule' && newStartTime && newEndTime) {
        updates.start_time = newStartTime.toISOString();
        updates.end_time = newEndTime.toISOString();
        updates.date = format(newStartTime, 'yyyy-MM-dd');
      }

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', booking.id);

      if (error) throw error;

      // Send notification email if rescheduled
      if (editMode === 'reschedule' && booking.guest_email) {
        // Email notification logic here
      }

      toast.success(editMode === 'reschedule' ? 'Booking rescheduled successfully' : 'Booking updated successfully');
      onUpdate();
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update booking';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSelect = (startTime: Date, endTime: Date): void => {
    setNewStartTime(startTime);
    setNewEndTime(endTime);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Edit Booking</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Tab Navigation */}
          <div className="flex space-x-4 mb-6 border-b border-gray-200">
            <button
              onClick={() => setEditMode('details')}
              className={`pb-2 px-1 text-sm font-medium ${
                editMode === 'details'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Edit Details
            </button>
            <button
              onClick={() => setEditMode('reschedule')}
              className={`pb-2 px-1 text-sm font-medium ${
                editMode === 'reschedule'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Reschedule
            </button>
            <button
              onClick={() => setEditMode('event')}
              className={`pb-2 px-1 text-sm font-medium ${
                editMode === 'event'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Event Settings
            </button>
          </div>

          {editMode === 'details' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="inline w-4 h-4 mr-1" />
                    Guest Name
                  </label>
                  <input
                    type="text"
                    value={formData.guest_name}
                    onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail className="inline w-4 h-4 mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.guest_email}
                    onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="inline w-4 h-4 mr-1" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.guest_phone}
                    onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Attendees
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.attendees}
                    onChange={(e) => setFormData({ ...formData, attendees: parseInt(e.target.value) })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purpose
                  </label>
                  <textarea
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    rows={3}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Booking['status'] })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Booking'}
                </button>
              </div>
            </form>
          ) : editMode === 'reschedule' ? (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">Current Schedule</h3>
                <p className="text-sm text-gray-600 mt-1">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  {format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  <Clock className="inline w-4 h-4 mr-1" />
                  {format(new Date(booking.start_time), 'h:mm a')} - 
                  {format(new Date(booking.end_time), 'h:mm a')}
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Select New Time</h3>
                <TimeSlotPicker
                  spaceId={booking.space_id}
                  onSelect={handleTimeSelect}
                />
              </div>

              {newStartTime && newEndTime && (
                <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                  <h4 className="font-medium text-primary-900">New Schedule:</h4>
                  <p className="text-sm text-primary-700 mt-1">
                    {format(newStartTime, 'EEEE, MMMM d, yyyy')} • 
                    {format(newStartTime, 'h:mm a')} - {format(newEndTime, 'h:mm a')}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-6">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!newStartTime || !newEndTime || loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            </div>
          ) : editMode === 'event' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Public Event Toggle */}
              <div className="flex items-center space-x-3 p-4 bg-amber-50 rounded-lg">
                <input
                  type="checkbox"
                  id="is_public_event"
                  checked={eventData.is_public_event}
                  onChange={(e) => setEventData({ ...eventData, is_public_event: e.target.checked })}
                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                />
                <label htmlFor="is_public_event" className="flex-1">
                  <span className="font-medium text-gray-900">Display as Public Event</span>
                  <p className="text-sm text-gray-600">Show this booking as an event on the public calendar</p>
                </label>
              </div>

              {eventData.is_public_event && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Event Title *
                      </label>
                      <input
                        type="text"
                        value={eventData.event_title}
                        onChange={(e) => setEventData({ ...eventData, event_title: e.target.value })}
                        placeholder="e.g., Cyber Hygiene Workshop"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        required={eventData.is_public_event}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organizer
                      </label>
                      <input
                        type="text"
                        value={eventData.event_organizer}
                        onChange={(e) => setEventData({ ...eventData, event_organizer: e.target.value })}
                        placeholder="e.g., Mayor's Office"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Event Poster URL
                      </label>
                      <input
                        type="url"
                        value={eventData.event_poster_url}
                        onChange={(e) => setEventData({ ...eventData, event_poster_url: e.target.value })}
                        placeholder="https://example.com/poster.jpg"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Event Description
                      </label>
                      <textarea
                        value={eventData.event_description}
                        onChange={(e) => setEventData({ ...eventData, event_description: e.target.value })}
                        rows={4}
                        placeholder="Describe the event, agenda, what attendees will learn..."
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Registration Link
                      </label>
                      <input
                        type="url"
                        value={eventData.event_registration_link}
                        onChange={(e) => setEventData({ ...eventData, event_registration_link: e.target.value })}
                        placeholder="Facebook event or Google Form link"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={eventData.event_contact_email}
                        onChange={(e) => setEventData({ ...eventData, event_contact_email: e.target.value })}
                        placeholder="event@example.com"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={eventData.event_contact_phone}
                        onChange={(e) => setEventData({ ...eventData, event_contact_phone: e.target.value })}
                        placeholder="+63 XXX XXX XXXX"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="is_featured_event"
                        checked={eventData.is_featured_event}
                        onChange={(e) => setEventData({ ...eventData, is_featured_event: e.target.checked })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_featured_event">
                        <span className="font-medium text-gray-700">Feature on Homepage</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Event Settings'}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
