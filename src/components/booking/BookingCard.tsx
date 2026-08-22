import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, Users, Edit, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Booking } from '../../types';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import BookingModifyModal from './BookingModifyModal';

interface BookingCardProps {
  booking: Booking & {
    space?: {
      name: string;
      location?: string;
      hourly_rate: number;
    };
    spaces?: {
      name: string;
      location?: string;
      hourly_rate: number;
    };
  };
  onUpdate: () => void;
  isGuest?: boolean;
}

export default function BookingCard({ booking, onUpdate, isGuest = false }: BookingCardProps): JSX.Element {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  
  // Handle both 'space' and 'spaces' property names
  const spaceData = booking.space || booking.spaces || { name: 'Unknown Space', location: '', hourly_rate: 0 };

  const getStatusIcon = (): JSX.Element => {
    switch (booking.status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (): string => {
    switch (booking.status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending Approval';
    }
  };

  const canCancel = (): boolean => {
    if (booking.status !== 'approved') return false;
    const now = new Date();
    const bookingStart = new Date(booking.start_time);
    const hoursUntilBooking = (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilBooking > 24; // 24 hour cancellation policy
  };

  const handleCancel = async (): Promise<void> => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Booking cancelled successfully');
      setShowCancelModal(false);
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel booking';
      toast.error(errorMessage);
    } finally {
      setCancelling(false);
    }
  };

  const totalCost = (): number => {
    const hours = (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / (1000 * 60 * 60);
    return hours * spaceData.hourly_rate;
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{spaceData.name}</h3>
            <div className="flex items-center mt-1 space-x-2">
              {getStatusIcon()}
              <span className={`text-sm font-medium ${
                booking.status === 'approved' ? 'text-green-700 dark:text-green-400' :
                booking.status === 'rejected' ? 'text-red-700 dark:text-red-400' :
                booking.status === 'cancelled' ? 'text-gray-700 dark:text-gray-300' :
                'text-yellow-700 dark:text-yellow-400'
              }`}>
                {getStatusText()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Reference</p>
            <p className="font-mono text-sm">{booking.booking_reference}</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4 mr-2" />
            {format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4 mr-2" />
            {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
          </div>
          {spaceData.location && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="h-4 w-4 mr-2" />
              {spaceData.location}
            </div>
          )}
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Users className="h-4 w-4 mr-2" />
            {booking.attendees} {booking.attendees === 1 ? 'person' : 'people'}
          </div>
        </div>

        {booking.purpose && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Purpose</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{booking.purpose}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Cost</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">₱{totalCost().toFixed(2)}</p>
          </div>
          
          {booking.status === 'approved' && (
            <div className="flex space-x-2">
              {!isGuest && (
                <button
                  onClick={() => setShowModifyModal(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Modify
                </button>
              )}
              {canCancel() && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-800 text-sm font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>

        {booking.status === 'approved' && !canCancel() && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Cancellation not available within 24 hours of booking
          </p>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Cancel Booking?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-md p-4 mb-6">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{spaceData.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')} at{' '}
                {format(new Date(booking.start_time), 'h:mm a')}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modify Modal */}
      {showModifyModal && (
        <BookingModifyModal
          booking={booking}
          onClose={() => setShowModifyModal(false)}
          onSuccess={() => {
            setShowModifyModal(false);
            onUpdate();
          }}
        />
      )}
    </>
  );
}
