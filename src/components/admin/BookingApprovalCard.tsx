import { useState } from 'react';
import { format } from 'date-fns';
import { Check, X, Clock, User, Mail, Phone, Calendar, Package, Users, PhoneCall, LogIn, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { PCIDA_DOMAINS, PURPOSE_OF_VISIT_OPTIONS } from '../../types/hub';

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
  purpose: string | string[] | null;
  notes: string | null;
  is_workshop: boolean;
  created_at: string;
  admin_contacted: boolean;
  admin_contacted_at: string | null;
  booking_type: string | null;
  group_size: number | null;
  organization: string | null;
  gathering_type: string | null;
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
  borrowings?: { id: string; asset: { name: string } | null }[];
}

interface BookingApprovalCardProps {
  booking: HubBookingRow;
  onUpdate: () => void;
}

export default function BookingApprovalCard({ booking, onUpdate }: BookingApprovalCardProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInData, setCheckInData] = useState({
    creative_domains: [] as string[],
    purpose_of_visit: [] as string[],
    gender: '',
    sector: '',
    organization: '',
    designation: '',
  });
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');

  const suggestedEventTitle = [booking.organization, booking.gathering_type].filter(Boolean).join(' ');

  const openPromoteModal = (): void => {
    setEventTitle(suggestedEventTitle);
    setShowPromoteModal(true);
  };

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

  const handlePromoteToEvent = async (): Promise<void> => {
    if (!eventTitle.trim()) {
      toast.error('Please enter an event title');
      return;
    }

    setLoading(true);
    try {
      // Create event from booking
      const { data: session } = await supabase.auth.getSession();
      const equipmentLine = equipmentSummary.length > 0
        ? `Equipment: ${equipmentSummary.map((e) => `${e.name}${e.quantity > 1 ? ` ×${e.quantity}` : ''}`).join(', ')}`
        : null;
      const description = [booking.notes, equipmentLine].filter(Boolean).join('\n\n')
        || `Promoted from booking ${booking.booking_reference}`;
      const { error: eventError } = await supabase
        .from('events')
        .insert({
          title: eventTitle.trim(),
          description,
          organizer: booking.guest_name || 'Unknown',
          organization: booking.organization || null,
          contact_email: booking.guest_email || null,
          contact_phone: booking.guest_phone || null,
          start_time: booking.start_time,
          end_time: booking.end_time,
          expected_guests: booking.group_size || booking.seats_used || null,
          promoted_booking_id: booking.id,
          status: 'published',
          created_by: session?.session?.user?.id || null,
        });

      if (eventError) throw eventError;

      toast.success('Booking promoted to event successfully');
      setShowPromoteModal(false);
      setEventTitle('');
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error promoting to event';
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

  const handleCheckIn = async (): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_attendance_from_booking', {
        p_booking_id: booking.id,
        p_creative_domains: checkInData.creative_domains.length > 0 ? checkInData.creative_domains : null,
        p_purpose_of_visit: checkInData.purpose_of_visit.length > 0 ? checkInData.purpose_of_visit : null,
        p_gender: checkInData.gender || null,
        p_sector: checkInData.sector || null,
        p_organization: checkInData.organization || null,
        p_designation: checkInData.designation || null,
      });

      if (error) throw error;
      
      // Update booking with the additional info
      await supabase
        .from('hub_bookings')
        .update({
          creative_domains: checkInData.creative_domains.length > 0 ? checkInData.creative_domains : null,
          purpose_of_visit: checkInData.purpose_of_visit.length > 0 ? checkInData.purpose_of_visit : null,
          gender: checkInData.gender || null,
          sector: checkInData.sector || null,
          organization: checkInData.organization || null,
          designation: checkInData.designation || null,
        })
        .eq('id', booking.id);

      toast.success('Check-in created successfully!');
      setShowCheckInModal(false);
      setCheckInData({
        creative_domains: [],
        purpose_of_visit: [],
        gender: '',
        sector: '',
        organization: '',
        designation: '',
      });
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Check-in failed';
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
            {booking.booking_type === 'group' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                <Users className="h-3 w-3 mr-1" />
                Group Booking{booking.gathering_type ? ` · ${booking.gathering_type}` : ''}
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

          {/* Group booking details */}
          {booking.booking_type === 'group' && (booking.organization || booking.group_size) && (
            <p className="text-sm text-gray-600 mb-3">
              {booking.organization && <span className="font-medium text-gray-900">{booking.organization}</span>}
              {booking.organization && booking.group_size && ' · '}
              {booking.group_size && `${booking.group_size} people`}
            </p>
          )}

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
              <p className="text-sm text-gray-600">
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
              <p className="text-sm font-medium text-gray-700 mb-0.5">Equipment Requested:</p>
              <p className="text-sm text-gray-600">
                {equipmentSummary.map((e) => `${e.name}${e.quantity > 1 ? ` ×${e.quantity}` : ''}`).join(', ')}
              </p>
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
          <button
            onClick={openPromoteModal}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-violet-300 text-sm font-medium rounded-md text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Promote to Event
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
          {showPromoteModal && (
            <div className="bg-violet-50 rounded-lg p-4 space-y-3 border border-violet-200">
              <h4 className="text-sm font-semibold text-violet-900">Promote to Event</h4>
              <p className="text-xs text-violet-700">This will create a public event from this booking. The booking will remain intact.</p>
              <input
                type="text"
                value={eventTitle}
                onChange={e => setEventTitle(e.target.value)}
                placeholder="Enter public event title (e.g., Strategic Alignment Meeting)"
                className="w-full rounded-md border-violet-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={handlePromoteToEvent}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  Promote
                </button>
                <button
                  onClick={() => setShowPromoteModal(false)}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions for non-pending bookings */}
      {booking.status !== 'pending' && (
        <div className="space-y-3 mt-4">
          {(booking.status === 'approved' || booking.status === 'active') && (
            <button
              onClick={() => setShowCheckInModal(true)}
              disabled={loading}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Check In User
            </button>
          )}
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

      {/* Check-In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Check In User</h3>
              <button
                onClick={() => setShowCheckInModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Checking in: <span className="font-medium">{booking.guest_name || 'Guest'}</span>
              </p>
              <p className="text-xs text-gray-500">
                All fields are optional. Fill in any additional information you have.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Creative Domains</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {PCIDA_DOMAINS.map((domain) => (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => {
                        const isSelected = checkInData.creative_domains.includes(domain);
                        setCheckInData(d => ({
                          ...d,
                          creative_domains: isSelected
                            ? d.creative_domains.filter(d => d !== domain)
                            : [...d.creative_domains, domain]
                        }));
                      }}
                      className={`text-left px-2 py-1.5 rounded text-xs ${
                        checkInData.creative_domains.includes(domain)
                          ? 'bg-violet-100 text-violet-700 border border-violet-300'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {checkInData.creative_domains.includes(domain) && '✓ '} {domain}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose of Visit</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {PURPOSE_OF_VISIT_OPTIONS.map((purpose) => (
                    <button
                      key={purpose}
                      type="button"
                      onClick={() => {
                        const isSelected = checkInData.purpose_of_visit.includes(purpose);
                        setCheckInData(d => ({
                          ...d,
                          purpose_of_visit: isSelected
                            ? d.purpose_of_visit.filter(p => p !== purpose)
                            : [...d.purpose_of_visit, purpose]
                        }));
                      }}
                      className={`text-left px-2 py-1.5 rounded text-xs ${
                        checkInData.purpose_of_visit.includes(purpose)
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {checkInData.purpose_of_visit.includes(purpose) && '✓ '} {purpose}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={checkInData.gender}
                  onChange={e => setCheckInData({ ...checkInData, gender: e.target.value })}
                  className="w-full rounded-md border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
                <input
                  type="text"
                  value={checkInData.sector}
                  onChange={e => setCheckInData({ ...checkInData, sector: e.target.value })}
                  placeholder="e.g. Government, Private, Academic"
                  className="w-full rounded-md border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                <input
                  type="text"
                  value={checkInData.organization}
                  onChange={e => setCheckInData({ ...checkInData, organization: e.target.value })}
                  placeholder="Company or school name"
                  className="w-full rounded-md border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={checkInData.designation}
                  onChange={e => setCheckInData({ ...checkInData, designation: e.target.value })}
                  placeholder="e.g. Graphic Designer, Student"
                  className="w-full rounded-md border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCheckInModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckIn}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Check In'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
