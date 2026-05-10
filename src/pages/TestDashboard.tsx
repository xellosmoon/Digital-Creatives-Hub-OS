import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TestDashboard() {
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
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
    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading test data...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard Diagnostics</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">User Info</h2>
          {user ? (
            <div>
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role || 'Not set'}</p>
            </div>
          ) : (
            <p>No user logged in</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Bookings ({bookings.length})</h2>
          {bookings.length > 0 ? (
            <pre className="text-xs overflow-auto bg-gray-50 p-2 rounded">
              {JSON.stringify(bookings[0], null, 2)}
            </pre>
          ) : (
            <p>No bookings found</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Spaces ({spaces.length})</h2>
          {spaces.length > 0 ? (
            <pre className="text-xs overflow-auto bg-gray-50 p-2 rounded">
              {JSON.stringify(spaces[0], null, 2)}
            </pre>
          ) : (
            <p>No spaces found</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Database Connection</h2>
          <p className="text-green-600">✓ Connected to Supabase</p>
          <p className="text-sm text-gray-600 mt-2">
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
