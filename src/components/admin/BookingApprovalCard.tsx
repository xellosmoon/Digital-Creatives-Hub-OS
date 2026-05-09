import { useState } from 'react';
import { format } from 'date-fns';
import { Check, X, Clock, User, Mail, Phone, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { notifyGuestOfBookingUpdate } from '../../lib/emailService';
import toast from 'react-hot-toast';
import { Booking } from '../../types';

interface BookingApprovalCardProps {
  booking: Booking & {
    space: {
      name: string;
      hourly_rate: number;
    };
  };
  onUpdate: () => void;
}

export default function BookingApprovalCard({ booking, onUpdate }: BookingApprovalCardProps) {
  const [loading, setLoading] = useState(false);

  const handleApproval = async (approved: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: approved ? 'approved' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;

      // Send email notification
      await notifyGuestOfBookingUpdate(booking.id, approved);
      
      toast.success(`Booking ${approved ? 'approved' : 'rejected'} successfully`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Error updating booking');
    } finally {
      setLoading(false);
    }
  };

  const totalCost = () => {
    const hours = (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / (1000 * 60 * 60);
    return hours * booking.space.hourly_rate;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Booking Reference */}
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-500">Reference:</span>
            <span className="ml-2 text-sm font-mono text-gray-900">{booking.booking_reference}</span>
            <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                booking.status === 'approved' ? 'bg-green-100 text-green-800' : 
                'bg-red-100 text-red-800'}`}>
              {booking.status}
            </span>
          </div>

          {/* Space Info */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {booking.space.name}
          </h3>

          {/* Time Info */}
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <Calendar className="h-4 w-4 mr-1" />
            <span>
              {format(new Date(booking.start_time), 'MMM d, yyyy')} • 
              {format(new Date(booking.start_time), 'h:mm a')} - 
              {format(new Date(booking.end_time), 'h:mm a')}
            </span>
          </div>

          {/* Guest Info */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm">
              <User className="h-4 w-4 text-gray-400 mr-2" />
              <span className="font-medium">{booking.guest_name || 'No name provided'}</span>
            </div>
            <div className="flex items-center text-sm">
              <Mail className="h-4 w-4 text-gray-400 mr-2" />
              <a href={`mailto:${booking.guest_email}`} className="text-primary-600 hover:underline">
                {booking.guest_email}
              </a>
            </div>
            {booking.guest_phone && (
              <div className="flex items-center text-sm">
                <Phone className="h-4 w-4 text-gray-400 mr-2" />
                <a href={`tel:${booking.guest_phone}`} className="text-primary-600 hover:underline">
                  {booking.guest_phone}
                </a>
              </div>
            )}
          </div>

          {/* Purpose */}
          {booking.purpose && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Purpose:</p>
              <p className="text-sm text-gray-600">{booking.purpose}</p>
            </div>
          )}

          {/* Cost Info */}
          <div className="flex items-center justify-between py-3 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">Total Cost:</span>
            <span className="text-lg font-semibold text-gray-900">₱{totalCost().toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {booking.status === 'pending' && (
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => handleApproval(true)}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            <Check className="h-4 w-4 mr-2" />
            Approve
          </button>
          <button
            onClick={() => handleApproval(false)}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            <X className="h-4 w-4 mr-2" />
            Reject
          </button>
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-4 text-xs text-gray-500">
        <Clock className="h-3 w-3 inline mr-1" />
        Requested {format(new Date(booking.created_at), 'MMM d, yyyy h:mm a')}
      </div>
    </div>
  );
}
