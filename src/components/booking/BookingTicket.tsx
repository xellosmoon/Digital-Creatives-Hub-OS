import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { Calendar, Clock, Mail, User, Users, CheckCircle, Hourglass, XCircle } from 'lucide-react';

export interface BookingTicketData {
  booking_reference: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  booking_type?: string | null;
  gathering_type?: string | null;
  group_size?: number | null;
  package?: { name: string } | null;
}

// Builds a grammatically correct "email, phone, and Facebook Messenger"
// list from whichever contact channels actually apply, rather than a fixed
// phrase that reads oddly ("all three") when fewer than three are relevant.
function contactChannelsText(booking: BookingTicketData): string {
  const channels = ['email'];
  if (booking.guest_phone) channels.push('phone');
  if (booking.booking_type === 'group') channels.push('Facebook Messenger');
  if (channels.length === 1) return channels[0];
  if (channels.length === 2) return `${channels[0]} and ${channels[1]}`;
  return `${channels.slice(0, -1).join(', ')}, and ${channels[channels.length - 1]}`;
}

const STATUS_STYLE: Record<string, { label: string; icon: typeof CheckCircle; classes: string }> = {
  pending: { label: 'Pending Approval', icon: Hourglass, classes: 'bg-amber-100 text-amber-700 border-amber-300' },
  approved: { label: 'Approved', icon: CheckCircle, classes: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  rejected: { label: 'Rejected', icon: XCircle, classes: 'bg-red-100 text-red-700 border-red-300' },
  cancelled: { label: 'Cancelled', icon: XCircle, classes: 'bg-gray-100 text-gray-600 border-gray-300' },
};

// Rendered both right after a guest submits a booking and whenever one is
// found via /booking-lookup — same "ticket" look either way, so a
// screenshot taken at submission time and a fresh lookup later feel like
// the same document just with an updated status.
export default function BookingTicket({ booking }: { booking: BookingTicketData }): JSX.Element {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const statusInfo = STATUS_STYLE[booking.status] ?? STATUS_STYLE.pending;
  const StatusIcon = statusInfo.icon;

  useEffect(() => {
    const lookupUrl = `${window.location.origin}/booking-lookup?ref=${encodeURIComponent(booking.booking_reference)}`;
    QRCode.toDataURL(lookupUrl, { width: 220, margin: 1, color: { dark: '#0C2340', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [booking.booking_reference]);

  const title = booking.booking_type === 'group'
    ? (booking.gathering_type ? `Group ${booking.gathering_type}` : 'Group Booking')
    : (booking.package?.name || 'Hub Booking');

  return (
    <div className="rounded-3xl border-2 border-dashed border-violet-300 bg-white shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0C2340] via-indigo-700 to-fuchsia-600 text-white px-6 py-5 text-center">
        <p className="text-[11px] uppercase tracking-widest text-violet-200 font-bold">Digital Creatives Hub</p>
        <p className="text-lg font-extrabold">Booking Ticket</p>
      </div>

      <div className="p-6 space-y-5">
        {/* Reference + status */}
        <div className="text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Booking Reference</p>
          <p className="text-3xl font-mono font-extrabold text-gray-900 tracking-wider">{booking.booking_reference}</p>
          <span className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-bold border-2 ${statusInfo.classes}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusInfo.label}
          </span>
        </div>

        {/* QR code */}
        <div className="flex justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR code linking to this booking's status" className="h-40 w-40 rounded-xl border border-gray-100" />
          ) : (
            <div className="h-40 w-40 rounded-xl border border-gray-100 bg-gray-50 animate-pulse" />
          )}
        </div>
        <p className="text-center text-xs text-gray-400 -mt-3">Scan to look up this booking's status anytime</p>

        {/* Details */}
        <div className="rounded-2xl bg-gray-50/80 p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#0C2340] flex-shrink-0" />
            <span className="font-semibold text-gray-900">{title}</span>
            {booking.group_size && booking.group_size > 1 && (
              <span className="text-gray-500">· {booking.group_size} people</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#0C2340] flex-shrink-0" />
            <span className="text-gray-700">{format(new Date(booking.booking_date + 'T00:00'), 'EEEE, MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#0C2340] flex-shrink-0" />
            <span className="text-gray-700">
              {format(new Date(booking.start_time), 'h:mm a')} – {format(new Date(booking.end_time), 'h:mm a')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[#0C2340] flex-shrink-0" />
            <span className="text-gray-700">{booking.guest_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#0C2340] flex-shrink-0" />
            <span className="text-gray-700 truncate">{booking.guest_email}</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Screenshot this ticket to show at the hub. We'll follow up by {contactChannelsText(booking)} once it's reviewed — please keep an eye out.
        </p>
      </div>
    </div>
  );
}
