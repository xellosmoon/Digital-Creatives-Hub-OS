import { useState } from 'react';
import { format } from 'date-fns';
import { Check, X, Clock, User, Mail, Phone, Calendar, Package, Users, PhoneCall, Ban } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import EventFormModal, { type EventFormPrefill } from './EventFormModal';
import type { AdminBookingRow } from '../../types/hub';

interface BookingApprovalCardProps {
  booking: AdminBookingRow;
  onUpdate: () => void;
}

export default function BookingApprovalCard({ booking, onUpdate }: BookingApprovalCardProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  const suggestedEventTitle = [booking.organization, booking.gathering_type].filter(Boolean).join(' ');

  const equipmentSummary: { name: string; quantity: number }[] = [];
  for (const b of booking.borrowings ?? []) {
    const name = b.asset?.name || 'Unknown item';
    const existing = equipmentSummary.find((e) => e.name === name);
    if (existing) existing.quantity += 1;
    else equipmentSummary.push({ name, quantity: 1 });
  }

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

  // Promoting now opens the same EventFormModal the proposal-publish flow
  // uses, pre-filled from this booking, instead of a bespoke title-only
  // mini-form — the admin gets the full event form (poster, registration
  // link, featured, multiple dates) rather than a stripped-down version.
  const bookingPrefill: EventFormPrefill = {
    title: suggestedEventTitle,
    description: [
      booking.notes,
      equipmentSummary.length > 0
        ? `Equipment: ${equipmentSummary.map((e) => `${e.name}${e.quantity > 1 ? ` ×${e.quantity}` : ''}`).join(', ')}`
        : null,
    ].filter(Boolean).join('\n\n') || `Promoted from booking ${booking.booking_reference}`,
    organizer: booking.guest_name || 'Unknown',
    organization: booking.organization || '',
    contact_email: booking.guest_email || '',
    contact_phone: booking.guest_phone || '',
    expected_guests: booking.group_size || booking.seats_used || 0,
    eventDates: [{
      date: format(new Date(booking.start_time), 'yyyy-MM-dd'),
      start_time: format(new Date(booking.start_time), 'HH:mm'),
      end_time: format(new Date(booking.end_time), 'HH:mm'),
    }],
    promotedBookingId: booking.id,
  };

  const handleEventPublished = async (eventId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('hub_bookings')
        .update({
          status: 'approved',
          promoted_to_event_id: eventId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (error) throw error;
      toast.success('Booking promoted to event successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Event was published, but failed to resolve the original booking request';
      toast.error(errorMessage);
    } finally {
      setShowPromoteModal(false);
      onUpdate();
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

  // Frees up the seats an approved/active booking was holding — there was
  // previously no way to do this short of rejecting it while still
  // pending, so an approved booking that later fell through kept counting
  // against capacity forever.
  const handleCancel = async (): Promise<void> => {
    if (!window.confirm('Cancel this booking? This frees up its reserved seats.')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('hub_bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (error) throw error;
      toast.success('Booking cancelled');
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error cancelling booking';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s: string): string => {
    switch (s) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'approved': case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected': case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Reference + Status */}
          <div className="flex items-center mb-2 flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Ref:</span>
            <span className="text-sm font-mono text-gray-900 dark:text-white">{booking.booking_reference}</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(booking.status)}`}>
              {booking.status}
            </span>
            {booking.is_workshop && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                Workshop
              </span>
            )}
            {booking.booking_type === 'group' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                <Users className="h-3 w-3 mr-1" />
                Group Booking{booking.gathering_type ? ` · ${booking.gathering_type}` : ''}
              </span>
            )}
            {booking.admin_contacted && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                <PhoneCall className="h-3 w-3 mr-1" />
                Contacted
              </span>
            )}
          </div>

          {/* Package Name */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Package className="h-5 w-5 text-violet-500" />
            {booking.package?.name || 'Unknown Package'}
            {booking.package?.is_bundle && (
              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">Bundle</span>
            )}
          </h3>

          {/* Group booking details */}
          {booking.booking_type === 'group' && (booking.organization || booking.group_size) && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {booking.organization && <span className="font-medium text-gray-900 dark:text-white">{booking.organization}</span>}
              {booking.organization && booking.group_size && ' · '}
              {booking.group_size && `${booking.group_size} people`}
            </p>
          )}

          {/* Date & Time */}
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-3">
            <Calendar className="h-4 w-4 mr-1" />
            <span>
              {formatDate(booking.booking_date + 'T00:00', 'EEE, MMM d, yyyy')} &bull;{' '}
              {formatDate(booking.start_time, 'h:mm a')} –{' '}
              {formatDate(booking.end_time, 'h:mm a')}
            </span>
          </div>

          {/* Seats */}
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-3">
            <Users className="h-4 w-4 mr-1" />
            <span>{booking.seats_used} seat{booking.seats_used > 1 ? 's' : ''}</span>
          </div>

          {/* Guest Info */}
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center text-sm text-gray-900 dark:text-white">
              <User className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
              <span className="font-medium">{booking.guest_name || 'No name'}</span>
            </div>
            {booking.guest_email && (
              <div className="flex items-center text-sm">
                <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                <a href={`mailto:${booking.guest_email}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                  {booking.guest_email}
                </a>
              </div>
            )}
            {booking.guest_phone && (
              <div className="flex items-center text-sm">
                <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                <a href={`tel:${booking.guest_phone}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                  {booking.guest_phone}
                </a>
              </div>
            )}
          </div>

          {/* Purpose */}
          {booking.purpose && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Purpose:</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {Array.isArray(booking.purpose) ? (
                  <>
                    {booking.purpose.slice(0, 2).join(', ')}
                    {booking.purpose.length > 2 && ` +${booking.purpose.length - 2} more`}
                  </>
                ) : (
                  booking.purpose
                )}
              </p>
            </div>
          )}

          {/* Equipment Requested */}
          {equipmentSummary.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Equipment Requested:</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {equipmentSummary.map((e) => `${e.name}${e.quantity > 1 ? ` ×${e.quantity}` : ''}`).join(', ')}
              </p>
            </div>
          )}

          {/* Total Price */}
          <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-slate-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Price:</span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">₱{booking.total_price?.toLocaleString() ?? '0'}</span>
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
                ? 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600'
            }`}
          >
            <PhoneCall className="h-4 w-4 mr-2" />
            {booking.admin_contacted ? 'Mark as Not Contacted' : 'Mark as Contacted'}
          </button>
          <button
            onClick={() => setShowOverride(!showOverride)}
            className="w-full inline-flex items-center justify-center px-4 py-2 border-2 border-dashed border-orange-300 dark:border-orange-700 text-sm font-semibold rounded-md text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
          >
            Override & Approve (Ignore Capacity)
          </button>
          <button
            onClick={() => setShowPromoteModal(true)}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-violet-300 dark:border-violet-700 text-sm font-medium rounded-md text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Promote to Event
          </button>
          {showOverride && (
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 space-y-2 border border-orange-200 dark:border-orange-800">
              <input
                type="text"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Override reason (optional)"
                className="w-full rounded-md border-orange-200 dark:border-orange-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-400 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
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
          {(booking.status === 'approved' || booking.status === 'active') && (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Ban className="h-4 w-4 mr-2" />
              Cancel Booking
            </button>
          )}
          <button
            onClick={handleToggleContacted}
            disabled={loading}
            className={`w-full inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md transition-colors ${
              booking.admin_contacted
                ? 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600'
            }`}
          >
            <PhoneCall className="h-4 w-4 mr-2" />
            {booking.admin_contacted ? 'Mark as Not Contacted' : 'Mark as Contacted'}
          </button>
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <Clock className="h-3 w-3 inline mr-1" />
        Requested {formatDate(booking.created_at, 'MMM d, yyyy h:mm a')}
      </div>

      {/* Promote to Event — same form the proposal-publish flow uses */}
      {showPromoteModal && (
        <EventFormModal
          event={null}
          prefill={bookingPrefill}
          onClose={() => setShowPromoteModal(false)}
          onSaved={handleEventPublished}
        />
      )}
    </div>
  );
}
