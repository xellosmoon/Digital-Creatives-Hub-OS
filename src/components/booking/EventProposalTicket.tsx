import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { Calendar, Clock, Mail, User, PartyPopper, CheckCircle, Hourglass, XCircle, Archive, Eye } from 'lucide-react';
import CancelTicketControl from './CancelTicketControl';
import { describeDecision, type DecisionReason, type StatusDecision } from '../../lib/decisionReasons';

export interface EventProposalTicketData extends StatusDecision {
  proposal_reference: string;
  organizer_name: string;
  organizer_email: string;
  organizer_phone?: string | null;
  title: string;
  event_dates: { date: string; start_time: string; end_time: string }[];
  status: string;
  facebook_page?: string | null;
}

// An organizer can withdraw a proposal only before it's approved —
// approving publishes a calendar event, which needs an admin to unpublish.
const GUEST_CANCELLABLE = ['pending_review', 'under_review'];

const STATUS_STYLE: Record<string, { label: string; icon: typeof CheckCircle; classes: string }> = {
  pending_review: { label: 'Pending Review', icon: Hourglass, classes: 'bg-amber-100 text-amber-700 border-amber-300' },
  under_review: { label: 'Being Reviewed by Admin', icon: Eye, classes: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  approved: { label: 'Approved', icon: CheckCircle, classes: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  rejected: { label: 'Rejected', icon: XCircle, classes: 'bg-red-100 text-red-700 border-red-300' },
  cancelled: { label: 'Cancelled', icon: XCircle, classes: 'bg-gray-100 text-gray-600 border-gray-300' },
  archived: { label: 'Archived', icon: Archive, classes: 'bg-gray-100 text-gray-600 border-gray-300' },
};

// Same "ticket" visual language as BookingTicket (dashed border, QR, status
// badge) so a proposal reference and a booking reference feel like the same
// family of document, even though the underlying data (multi-date events,
// no package/gathering type) is different enough to warrant its own component
// rather than forcing both shapes through one generic ticket.
export default function EventProposalTicket({ proposal }: { proposal: EventProposalTicketData }): JSX.Element {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  // Set when the organizer withdraws from this very ticket, so it flips to
  // "Cancelled" immediately instead of waiting on a re-lookup.
  const [cancelled, setCancelled] = useState<DecisionReason | null>(null);

  const status = cancelled ? 'cancelled' : proposal.status;
  const decision: StatusDecision = cancelled
    ? { status_reason: cancelled.reason || null, status_note: cancelled.note || null, status_changed_by: 'guest' }
    : proposal;
  const statusInfo = STATUS_STYLE[status] ?? STATUS_STYLE.pending_review;
  const StatusIcon = statusInfo.icon;
  const isClosed = status === 'rejected' || status === 'cancelled';

  useEffect(() => {
    const lookupUrl = `${window.location.origin}/booking-lookup?ref=${encodeURIComponent(proposal.proposal_reference)}`;
    QRCode.toDataURL(lookupUrl, { width: 220, margin: 1, color: { dark: '#0C2340', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [proposal.proposal_reference]);

  const channels = ['email'];
  if (proposal.organizer_phone) channels.push('phone');
  if (proposal.facebook_page) channels.push('Facebook Messenger');
  const contactText = channels.length === 1
    ? channels[0]
    : channels.length === 2
      ? `${channels[0]} and ${channels[1]}`
      : `${channels.slice(0, -1).join(', ')}, and ${channels[channels.length - 1]}`;

  return (
    <div className="rounded-3xl border-2 border-dashed border-amber-300 bg-white shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-6 py-5 text-center">
        <p className="text-[11px] uppercase tracking-widest text-amber-100 font-bold">Digital Creatives Hub</p>
        <p className="text-lg font-extrabold">Event Proposal Ticket</p>
      </div>

      <div className="p-6 space-y-5">
        {/* Reference + status */}
        <div className="text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Proposal Reference</p>
          <p className="text-3xl font-mono font-extrabold text-gray-900 tracking-wider">{proposal.proposal_reference}</p>
          <span className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-bold border-2 ${statusInfo.classes}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusInfo.label}
          </span>
        </div>

        {/* QR code */}
        <div className="flex justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR code linking to this proposal's status" className="h-40 w-40 rounded-xl border border-gray-100" />
          ) : (
            <div className="h-40 w-40 rounded-xl border border-gray-100 bg-gray-50 animate-pulse" />
          )}
        </div>
        <p className="text-center text-xs text-gray-400 -mt-3">Scan to look up this proposal's status anytime</p>

        {/* Details */}
        <div className="rounded-2xl bg-gray-50/80 p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <PartyPopper className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <span className="font-semibold text-gray-900">{proposal.title}</span>
          </div>
          {proposal.event_dates.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <span className="text-gray-700">{format(new Date(d.date + 'T00:00'), 'EEE, MMM d, yyyy')}</span>
              <Clock className="h-4 w-4 text-amber-500 flex-shrink-0 ml-1" />
              <span className="text-gray-700">{d.start_time} – {d.end_time}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <span className="text-gray-700">{proposal.organizer_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <span className="text-gray-700 truncate">{proposal.organizer_email}</span>
          </div>
        </div>

        {isClosed ? (
          <div className={`rounded-2xl border-2 px-4 py-3 text-sm ${status === 'rejected' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
            <p className="font-bold text-gray-900">
              {status === 'cancelled'
                ? decision.status_changed_by === 'admin' ? 'Cancelled by the Hub' : 'You cancelled this proposal'
                : "Sorry — we couldn't take this proposal forward"}
            </p>
            <p className="text-gray-700 mt-0.5">
              {describeDecision(decision) ?? (decision.status_changed_by === 'guest' ? 'No reason given.' : 'Please contact the Hub if you have questions.')}
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center">
            {status === 'under_review'
              ? `An admin is reviewing your proposal right now. We'll follow up by ${contactText} — please keep an eye out.`
              : status === 'approved'
                ? "Great news — your event is approved! Need to change or cancel it? Please contact the Hub."
                : `Screenshot this ticket to keep for reference. We'll follow up by ${contactText} once it's reviewed — please keep an eye out.`}
          </p>
        )}

        {GUEST_CANCELLABLE.includes(status) && !cancelled && proposal.organizer_email && (
          <CancelTicketControl
            kind="proposal"
            reference={proposal.proposal_reference}
            email={proposal.organizer_email}
            onCancelled={setCancelled}
          />
        )}
      </div>
    </div>
  );
}
