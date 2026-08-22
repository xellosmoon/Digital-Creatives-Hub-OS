import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email?: string;
  role?: string;
}

interface Booking {
  id: string;
  user_id: string;
  space_id: string;
  start_time: string;
  end_time: string;
}

interface Space {
  id: string;
  name: string;
  type: string;
  hourly_rate: number;
}

export default function TestDashboard(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async (): Promise<void> => {
    try {
      // Test 1: Check auth user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        setError(`Auth Error: ${authError.message}`);
        return;
      }
      setUser(user);

      if (!user) {
        setError('No user logged in');
        return;
      }

      // Test 2: Try to fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .limit(5);

      if (bookingsError) {
        setError(`Bookings Error: ${bookingsError.message}`);
        console.error('Bookings error details:', bookingsError);
        return;
      }
      setBookings(bookingsData || []);

      // Test 3: Try to fetch spaces
      const { data: spacesData, error: spacesError } = await supabase
        .from('spaces')
        .select('*')
        .limit(5);

      if (spacesError) {
        setError(`Spaces Error: ${spacesError.message}`);
        return;
      }
      setSpaces(spacesData || []);

      setError('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error';
      setError(`Unexpected error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 dark:text-white">Loading test data...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Dashboard Diagnostics</h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3 dark:text-white">User Info</h2>
          {user ? (
            <div className="text-gray-700 dark:text-gray-300">
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role || 'Not set'}</p>
            </div>
          ) : (
            <p className="text-gray-700 dark:text-gray-300">No user logged in</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3 dark:text-white">Bookings ({bookings.length})</h2>
          {bookings.length > 0 ? (
            <pre className="text-xs overflow-auto bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-gray-300 p-2 rounded">
              {JSON.stringify(bookings[0], null, 2)}
            </pre>
          ) : (
            <p className="text-gray-700 dark:text-gray-300">No bookings found</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3 dark:text-white">Spaces ({spaces.length})</h2>
          {spaces.length > 0 ? (
            <pre className="text-xs overflow-auto bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-gray-300 p-2 rounded">
              {JSON.stringify(spaces[0], null, 2)}
            </pre>
          ) : (
            <p className="text-gray-700 dark:text-gray-300">No spaces found</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3 dark:text-white">Database Connection</h2>
          <p className="text-green-600 dark:text-green-400">✓ Connected to Supabase</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            URL: {import.meta.env.VITE_SUPABASE_URL}
          </p>
        </div>
      </div>

      <button
        onClick={testConnection}
        className="mt-6 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
      >
        Retry Tests
      </button>
    </div>
  );
}
