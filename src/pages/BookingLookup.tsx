import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BookingTicket, { type BookingTicketData } from '../components/booking/BookingTicket';
import EventProposalTicket, { type EventProposalTicketData } from '../components/booking/EventProposalTicket';
import toast from 'react-hot-toast';

// hub_bookings is the live booking table (the one Bookings.tsx writes to).
// This page used to query the legacy `bookings`/`spaces` tables from the
// pre-hub booking system, so every reference number from the current
// wizard came back "No bookings found" — nothing was actually broken in
// the search logic, it was searching the wrong table entirely.
//
// A reference could belong to either a hub_bookings row or a hub_events
// (event proposal) row — both use the same 6-character reference format,
// so a single search here checks both tables rather than making the user
// know or care which kind of thing they submitted.
export default function BookingLookup(): JSX.Element {
  const [searchParams] = useSearchParams();
  const [lookupMethod, setLookupMethod] = useState<'reference' | 'email'>('reference');
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [bookings, setBookings] = useState<BookingTicketData[]>([]);
  const [proposals, setProposals] = useState<EventProposalTicketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async (method: 'reference' | 'email', value: string): Promise<void> => {
    setLoading(true);
    setSearched(true);
    try {
      // Both go through SECURITY DEFINER RPCs rather than a direct table
      // query — hub_bookings/hub_events SELECT is now scoped to the row's
      // own owner/admin, so a guest looking up someone else's reference or
      // email has to prove they already know it; the function does that
      // matching server-side instead of relying on an open RLS policy the
      // client's own .eq() could otherwise be bypassed around (see
      // 062_fix_public_pii_exposure.sql).
      const reference = method === 'reference' ? value.toUpperCase() : null;
      const email = method === 'email' ? value : null;

      const [bookingRes, proposalRes] = await Promise.all([
        supabase.rpc('lookup_hub_booking', { p_reference: reference, p_email: email }),
        supabase.rpc('lookup_event_proposal', { p_reference: reference, p_email: email }),
      ]);
      if (bookingRes.error) throw bookingRes.error;
      if (proposalRes.error) throw proposalRes.error;

      const foundBookings = ((bookingRes.data as unknown as (Omit<BookingTicketData, 'package'> & { package_name: string | null })[]) || [])
        .map(({ package_name, ...rest }) => ({ ...rest, package: package_name ? { name: package_name } : null }));
      const foundProposals = (proposalRes.data as unknown as EventProposalTicketData[]) || [];
      setBookings(foundBookings);
      setProposals(foundProposals);

      if (foundBookings.length === 0 && foundProposals.length === 0) {
        toast.error('Nothing found');
      }
    } catch (error) {
      console.error('Error searching bookings/proposals:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  // A scanned ticket QR code links here with ?ref=XXXXX — jump straight to
  // the result instead of landing on an empty search form.
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setLookupMethod('reference');
      setReference(ref);
      runSearch('reference', ref);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    await runSearch(lookupMethod, lookupMethod === 'reference' ? reference : email);
  };

  const totalResults = bookings.length + proposals.length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Booking &amp; Event Lookup</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Find your space booking or event proposal using its reference number or your email address.
        </p>
      </div>

      {/* Lookup Form */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-8">
        <form onSubmit={handleSearch} className="space-y-6">
          {/* Method Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search by:</label>
            <div className="mt-2 space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-primary-600"
                  value="reference"
                  checked={lookupMethod === 'reference'}
                  onChange={(e) => setLookupMethod(e.target.value as 'reference' | 'email')}
                />
                <span className="ml-2 dark:text-gray-300">Reference Number</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-primary-600"
                  value="email"
                  checked={lookupMethod === 'email'}
                  onChange={(e) => setLookupMethod(e.target.value as 'reference' | 'email')}
                />
                <span className="ml-2 dark:text-gray-300">Email Address</span>
              </label>
            </div>
          </div>

          {/* Input Field */}
          {lookupMethod === 'reference' ? (
            <div>
              <label htmlFor="reference" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Reference Number
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g., ITSX93"
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-400 rounded-md"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This was shown on your ticket right after you booked a space or proposed an event.
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-400 rounded-md"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter the email address you used when booking or proposing an event.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-[#0C2340] to-fuchsia-600 hover:from-indigo-700 hover:to-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-all duration-300"
          >
            <Search className="h-4 w-4 mr-2" />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Results */}
      {searched && (
        <div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nothing found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Please check your {lookupMethod === 'reference' ? 'reference number' : 'email address'} and try again.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-w-md mx-auto">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Found {totalResults} result{totalResults > 1 ? 's' : ''}
              </h2>
              {bookings.map((booking) => (
                <BookingTicket key={booking.booking_reference} booking={booking} />
              ))}
              {proposals.map((proposal) => (
                <EventProposalTicket key={proposal.proposal_reference} proposal={proposal} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300">Need help?</h3>
        <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
          If you can't find your booking or proposal, please contact us with your details
          and we'll help you locate it.
        </p>
      </div>
    </div>
  );
}
