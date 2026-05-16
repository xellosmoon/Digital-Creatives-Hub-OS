import { useState } from 'react';
import { format } from 'date-fns';
import { Check, X, Clock, User, Mail, Phone, Calendar, Package, Users, PhoneCall } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface HubBookingRow {
  id: string;
  booking_reference: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  seats_used: number;
  total_price: number;
  status: string;
  purpose: string | null;
  notes: string | null;
  is_workshop: boolean;
  created_at: string;
  admin_contacted: boolean;
  admin_contacted_at: string | null;
  package?: {
    id: string;
    slug: string;
    name: string;
    hourly_rate: number | null;
    daily_rate: number | null;
    billing_mode: string;
    seats_consumed: number;
    is_bundle: boolean;
  } | null;
}

interface BookingApprovalCardProps {
  booking: HubBookingRow;
  onUpdate: () => void;
}

export default function BookingApprovalCard({ booking, onUpdate }: BookingApprovalCardProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const formatDate = (dateString: string | null | undefined, formatStr: string): string => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return format(date, formatStr);
    } catch {
      return 'Invalid date';
    }
  };

  const handleApproval = async (approved: boolean): Promise<void> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('hub_bookings')
        .update({
          status: approved ? 'approved' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;
      toast.success(`Booking ${approved ? 'approved' : 'rejected'} successfully`);
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error updating booking';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOverrideApprove = async (): Promise<void> => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase
        .from('hub_bookings')
        .update({
          status: 'approved',
          admin_override: true,
          override_by: session?.session?.user?.id || null,
          override_reason: overrideReason || 'Admin override approval',
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (error) throw error;
      toast.success('Booking approved with admin override!');
      setShowOverride(false);
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Override failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleContacted = async (): Promise<void> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('hub_bookings')
        .update({
          admin_contacted: !booking.admin_contacted,
          admin_contacted_at: !booking.admin_contacted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (error) throw error;
      toast.success(booking.admin_contacted ? 'Marked as not contacted' : 'Marked as contacted');
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error updating contact status';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s: string): string => {
    switch (s) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': case 'active': return 'bg-green-100 text-green-800';
      case 'rejected': case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Reference + Status */}
          <div className="flex items-center mb-2 flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-500">Ref:</span>
            <span className="text-sm font-mono text-gray-900">{booking.booking_reference}</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(booking.status)}`}>
              {booking.status}
            </span>
            {booking.is_workshop && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                Workshop
              </span>
            )}
            {booking.admin_contacted && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                <PhoneCall className="h-3 w-3 mr-1" />
                Contacted
              </span>
            )}
          </div>

          {/* Package Name */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Package className="h-5 w-5 text-violet-500" />
            {booking.package?.name || 'Unknown Package'}
            {booking.package?.is_bundle && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Bundle</span>
            )}
          </h3>

          {/* Date & Time */}
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <Calendar className="h-4 w-4 mr-1" />
            <span>
              {formatDate(booking.booking_date + 'T00:00', 'EEE, MMM d, yyyy')} &bull;{' '}
              {formatDate(booking.start_time, 'h:mm a')} –{' '}
              {formatDate(booking.end_time, 'h:mm a')}
            </span>
          </div>

          {/* Seats */}
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <Users className="h-4 w-4 mr-1" />
            <span>{booking.seats_used} seat{booking.seats_used > 1 ? 's' : ''}</span>
          </div>

          {/* Guest Info */}
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center text-sm">
              <User className="h-4 w-4 text-gray-400 mr-2" />
              <span className="font-medium">{booking.guest_name || 'No name'}</span>
            </div>
            {booking.guest_email && (
              <div className="flex items-center text-sm">
                <Mail className="h-4 w-4 text-gray-400 mr-2" />
                <a href={`mailto:${booking.guest_email}`} className="text-primary-600 hover:underline">
                  {booking.guest_email}
                </a>
              </div>
            )}
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
              <p className="text-sm font-medium text-gray-700 mb-0.5">Purpose:</p>
              <p className="text-sm text-gray-600">{booking.purpose}</p>
            </div>
          )}

          {/* Total Price */}
          <div className="flex items-center justify-between py-3 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">Total Price:</span>
            <span className="text-lg font-semibold text-gray-900">₱{booking.total_price?.toLocaleString() ?? '0'}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {booking.status === 'pending' && (
        <div className="space-y-3 mt-4">
          <div className="flex gap-3">
            <button
              onClick={() => handleApproval(true)}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Check className="h-4 w-4 mr-2" />
              Approve
            </button>
            <button
              onClick={() => handleApproval(false)}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </button>
          </div>
          <button
            onClick={handleToggleContacted}
            disabled={loading}
            className={`w-full inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md transition-colors ${
              booking.admin_contacted
                ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                : 'border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <PhoneCall className="h-4 w-4 mr-2" />
            {booking.admin_contacted ? 'Mark as Not Contacted' : 'Mark as Contacted'}
          </button>
          <button
            onClick={() => setShowOverride(!showOverride)}
            className="w-full inline-flex items-center justify-center px-4 py-2 border-2 border-dashed border-orange-300 text-sm font-semibold rounded-md text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            Override & Approve (Ignore Capacity)
          </button>
          {showOverride && (
            <div className="bg-orange-50 rounded-lg p-3 space-y-2 border border-orange-200">
              <input
                type="text"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Override reason (optional)"
                className="w-full rounded-md border-orange-200 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
              />
              <button
                onClick={handleOverrideApprove}
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-md text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 transition-colors"
              >
                Confirm Override Approval
              </button>
            </div>
          )}
        </div>
      )}

      {/* Actions for non-pending bookings */}
      {booking.status !== 'pending' && (
        <div className="space-y-3 mt-4">
          <button
            onClick={handleToggleContacted}
            disabled={loading}
            className={`w-full inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md transition-colors ${
              booking.admin_contacted
                ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                : 'border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <PhoneCall className="h-4 w-4 mr-2" />
            {booking.admin_contacted ? 'Mark as Not Contacted' : 'Mark as Contacted'}
          </button>
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-4 text-xs text-gray-500">
        <Clock className="h-3 w-3 inline mr-1" />
        Requested {formatDate(booking.created_at, 'MMM d, yyyy h:mm a')}
      </div>
    </div>
  );
}
