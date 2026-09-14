import { Check, XCircle, Sparkles } from 'lucide-react';
import { format, addDays } from 'date-fns';
import type { EventFormPrefill } from './EventFormModal';

export interface EventProposalDate {
  date?: string;
  start_time?: string;
  end_time?: string;
}

export interface EventProposalData {
  id: string;
  organizer_name: string;
  organizer_email: string;
  organizer_phone: string;
  organization: string | null;
  role: string | null;
  title: string;
  description: string;
  expected_guests: number | null;
  creative_domains: string[];
  event_dates: EventProposalDate[];
  status: string;
  published_event_id: string | null;
  created_at: string;
  proposal_reference?: string | null;
}

interface EventProposalCardProps {
  proposal: EventProposalData;
  /** Parent opens EventFormModal pre-filled from this proposal — approving
   *  isn't a simple status flip, it needs the full event form since a real
   *  calendar event (with reserved seats) gets created at the same time. */
  onApprove: () => void;
  onReject: () => void;
}

// Shared between EventManagement.tsx (the full bulk-review page, with
// filters/export) and AdminDashboard.tsx's Events tab (the daily quick
// pass) — same card, same actions, so the two surfaces can't drift apart.
export default function EventProposalCard({ proposal, onApprove, onReject }: EventProposalCardProps): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 dark:bg-slate-800 dark:border-slate-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1 dark:text-white">{proposal.title}</h3>
          {proposal.proposal_reference && (
            <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mb-1">Ref: {proposal.proposal_reference}</p>
          )}
          <p className="text-sm text-gray-600 mb-3 line-clamp-2 dark:text-gray-400">{proposal.description}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {proposal.creative_domains.map((domain) => (
              <span key={domain} className="inline-flex items-center px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium dark:bg-amber-900/30 dark:text-amber-300">
                {domain}
              </span>
            ))}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
          proposal.status === 'pending_review' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
          proposal.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        }`}>
          {proposal.status === 'pending_review' ? 'Pending' : proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-gray-500 font-medium dark:text-gray-400">Organizer</p>
          <p className="text-gray-900 dark:text-white">{proposal.organizer_name}</p>
        </div>
        <div>
          <p className="text-gray-500 font-medium dark:text-gray-400">Email</p>
          <p className="text-gray-900 dark:text-white">{proposal.organizer_email}</p>
        </div>
        <div>
          <p className="text-gray-500 font-medium dark:text-gray-400">Phone</p>
          <p className="text-gray-900 dark:text-white">{proposal.organizer_phone}</p>
        </div>
        <div>
          <p className="text-gray-500 font-medium dark:text-gray-400">Expected Guests</p>
          <p className="text-gray-900 dark:text-white">{proposal.expected_guests || 'N/A'}</p>
        </div>
        {proposal.organization && (
          <div>
            <p className="text-gray-500 font-medium dark:text-gray-400">Organization</p>
            <p className="text-gray-900 dark:text-white">{proposal.organization}</p>
          </div>
        )}
        {proposal.role && (
          <div>
            <p className="text-gray-500 font-medium dark:text-gray-400">Role</p>
            <p className="text-gray-900 dark:text-white">{proposal.role}</p>
          </div>
        )}
      </div>

      {/* Event Dates */}
      <div className="mb-4">
        <p className="text-gray-500 font-medium text-xs mb-2 dark:text-gray-400">Event Dates & Times</p>
        <div className="space-y-1">
          {Array.isArray(proposal.event_dates) && proposal.event_dates.map((eventDate, index) => {
            if (!eventDate.date) return null;
            try {
              const dateObj = new Date(eventDate.date);
              if (isNaN(dateObj.getTime())) return null;
              return (
                <div key={index} className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1 dark:text-gray-300 dark:bg-slate-900">
                  {format(dateObj, 'EEE, MMM d, yyyy')} • {eventDate.start_time} - {eventDate.end_time}
                </div>
              );
            } catch {
              return null;
            }
          })}
        </div>
      </div>

      {proposal.status === 'pending_review' && (
        <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
          <button
            onClick={onApprove}
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-sm transition-all"
          >
            <Check className="h-4 w-4 mr-2" />
            Approve & Publish
          </button>
          <button
            onClick={onReject}
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all dark:text-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:border-slate-600"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </button>
        </div>
      )}

      {proposal.status === 'approved' && !proposal.published_event_id && (
        <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
          <button
            onClick={onApprove}
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-sm transition-all"
          >
            <Check className="h-4 w-4 mr-2" />
            Publish
          </button>
        </div>
      )}
    </div>
  );
}

/** Builds the EventFormModal prefill from a proposal — the one place this
 *  mapping lives (shared by EventManagement.tsx and AdminDashboard.tsx's
 *  Events tab), so "Approve & Publish" can't drift apart between them. */
export function prefillFromProposal(proposal: EventProposalData): EventFormPrefill {
  const eventDates = Array.isArray(proposal.event_dates) && proposal.event_dates.length > 0
    ? proposal.event_dates
        .filter((d): d is Required<EventProposalDate> => !!(d.date && d.start_time && d.end_time))
        .map(d => ({ date: d.date, start_time: d.start_time, end_time: d.end_time }))
    : [];

  return {
    title: proposal.title,
    description: proposal.description,
    organizer: proposal.organizer_name,
    organization: proposal.organization || '',
    contact_email: proposal.organizer_email,
    contact_phone: proposal.organizer_phone,
    expected_guests: proposal.expected_guests || 0,
    eventDates: eventDates.length > 0
      ? eventDates
      : [{ date: format(addDays(new Date(), 7), 'yyyy-MM-dd'), start_time: '14:00', end_time: '17:00' }],
  };
}

// Small empty-state helper shared by both surfaces.
export function EventProposalEmptyState({ message }: { message: string }): JSX.Element {
  return (
    <div className="text-center py-16 bg-gray-50 rounded-lg dark:bg-slate-800">
      <Sparkles className="h-10 w-10 text-gray-300 mx-auto mb-2 dark:text-gray-600" />
      <p className="text-gray-500 mb-4 dark:text-gray-400">{message}</p>
    </div>
  );
}
