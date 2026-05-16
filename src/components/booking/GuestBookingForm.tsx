import { useState } from 'react';
import { Mail, Phone, User, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { notifyAdminsOfNewBooking } from '../../lib/emailService';
import RecurringBookingModal from './RecurringBookingModal';

interface GuestBookingFormProps {
  spaceId: string;
  spaceName: string;
  startTime: Date;
  endTime: Date;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function GuestBookingForm({
  spaceId,
  spaceName,
  startTime,
  endTime,
  onSuccess,
  onCancel
}: GuestBookingFormProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    purpose: '',
    attendees: 1,
    createAccount: false,
    isRecurring: false
  });

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    // If recurring is selected, show the recurring modal
    if (formData.isRecurring) {
      setShowRecurring(true);
      return;
    }
    
    setLoading(true);

    try {
      // Create booking with full timestamps
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          space_id: spaceId,
          guest_name: formData.guestName,
          guest_email: formData.guestEmail,
          guest_phone: formData.guestPhone,
          date: format(startTime, 'yyyy-MM-dd'),
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          purpose: formData.purpose,
          attendees: formData.attendees,
          status: 'pending'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Insert admin notification
      const { error: notificationError } = await supabase
        .from('admin_notifications')
        .insert({
          type: 'new_booking',
          title: 'New Booking Request',
          message: `New booking request from ${formData.guestName} for ${spaceName}`,
          data: { booking_id: bookingData.id },
          read: false
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      // Send email notifications to admins
      await notifyAdminsOfNewBooking(bookingData.id);

      toast.success('Booking request submitted successfully! You will receive an email confirmation.');
      onSuccess();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit booking';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Booking Details</h3>
        <p className="mt-1 text-sm text-gray-600">
          {spaceName} • {startTime.toLocaleString()} - {endTime.toLocaleTimeString()}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="guestName" className="block text-sm font-medium text-gray-700">
            Full Name *
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="guestName"
              required
              value={formData.guestName}
              onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="John Doe"
            />
          </div>
        </div>

        <div>
          <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700">
            Email Address *
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              id="guestEmail"
              required
              value={formData.guestEmail}
              onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="john@example.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700">
            Phone Number *
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="tel"
              id="guestPhone"
              required
              value={formData.guestPhone}
              onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        <div>
          <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">
            Purpose of Booking
          </label>
          <textarea
            id="purpose"
            rows={3}
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            placeholder="Brief description of your booking purpose..."
          />
        </div>

        <div>
          <label htmlFor="attendees" className="block text-sm font-medium text-gray-700">
            Number of Attendees
          </label>
          <input
            type="number"
            id="attendees"
            min="1"
            value={formData.attendees}
            onChange={(e) => setFormData({ ...formData, attendees: parseInt(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>

        <div className="flex items-center">
          <input
            id="isRecurring"
            type="checkbox"
            checked={formData.isRecurring}
            onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-900">
            <span className="flex items-center">
              <Repeat className="h-4 w-4 mr-1" />
              Make this a recurring booking
            </span>
          </label>
        </div>

        <div className="flex items-center">
          <input
            id="createAccount"
            type="checkbox"
            checked={formData.createAccount}
            onChange={(e) => setFormData({ ...formData, createAccount: e.target.checked })}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="createAccount" className="ml-2 block text-sm text-gray-900">
            Create an account for faster future bookings
          </label>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Booking Request'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Cancel
        </button>
      </div>
    </form>

    {/* Recurring Booking Modal */}
    {showRecurring && (
      <RecurringBookingModal
        spaceId={spaceId}
        spaceName={spaceName}
        date={startTime}
        startTime={startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        endTime={endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        attendees={formData.attendees}
        purpose={formData.purpose}
        totalCost={0} // You'll need to calculate this based on space hourly rate
        guestName={formData.guestName}
        guestEmail={formData.guestEmail}
        guestPhone={formData.guestPhone}
        onClose={() => setShowRecurring(false)}
        onSuccess={onSuccess}
      />
    )}
    </>
  );
}
