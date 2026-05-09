import { useState } from 'react';
import { Search, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BookingCard from '../components/booking/BookingCard';
import toast from 'react-hot-toast';

export default function BookingLookup() {
  const [lookupMethod, setLookupMethod] = useState<'reference' | 'email'>('reference');
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          space:spaces (
            name,
            location,
            hourly_rate
          )
        `);

      if (lookupMethod === 'reference') {
        query = query.eq('booking_reference', reference.toUpperCase());
      } else {
        query = query.eq('guest_email', email);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBookings(data || []);
      
      if (!data || data.length === 0) {
        toast.error('No bookings found');
      }
    } catch (error) {
      console.error('Error searching bookings:', error);
      toast.error('Failed to search bookings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Booking Lookup</h1>
        <p className="mt-2 text-gray-600">
          Find your booking using your reference number or email address.
        </p>
      </div>

      {/* Lookup Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <form onSubmit={handleSearch} className="space-y-6">
          {/* Method Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700">Search by:</label>
            <div className="mt-2 space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-primary-600"
                  value="reference"
                  checked={lookupMethod === 'reference'}
                  onChange={(e) => setLookupMethod(e.target.value as any)}
                />
                <span className="ml-2">Booking Reference</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-primary-600"
                  value="email"
                  checked={lookupMethod === 'email'}
                  onChange={(e) => setLookupMethod(e.target.value as any)}
                />
                <span className="ml-2">Email Address</span>
              </label>
            </div>
          </div>

          {/* Input Field */}
          {lookupMethod === 'reference' ? (
            <div>
              <label htmlFor="reference" className="block text-sm font-medium text-gray-700">
                Booking Reference
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g., BK-ABC123"
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Your booking reference was sent to your email when you made the booking.
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter the email address you used when making the booking.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <Search className="h-4 w-4 mr-2" />
            {loading ? 'Searching...' : 'Search Bookings'}
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
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Please check your {lookupMethod === 'reference' ? 'booking reference' : 'email address'} and try again.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Found {bookings.length} booking{bookings.length > 1 ? 's' : ''}
              </h2>
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onUpdate={() => handleSearch({ preventDefault: () => {} } as any)}
                  isGuest={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900">Need help?</h3>
        <p className="mt-1 text-sm text-blue-700">
          If you can't find your booking, please contact us with your booking details
          and we'll help you locate it.
        </p>
      </div>
    </div>
  );
}
