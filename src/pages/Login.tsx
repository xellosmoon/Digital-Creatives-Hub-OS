import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Mail, Lock, X, Crown } from 'lucide-react';

export default function Login(): JSX.Element {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      // Check user tier after successful auth
      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('tier')
          .eq('id', authData.user.id)
          .single();

        if (profileError || !profile) {
          // If profile doesn't exist or error, allow login (fallback)
          toast.success('Logged in successfully!');
          navigate('/dashboard');
          return;
        }

        // Deny access for WALK_IN tier
        if (profile.tier === 'WALK_IN') {
          await supabase.auth.signOut();
          setShowPremiumModal(true);
          return;
        }

        toast.success('Logged in successfully!');
        navigate('/dashboard');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error logging in';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              create a new account
            </Link>
          </p>
          <p className="mt-4 text-center text-sm text-gray-600">
            Note: You can book spaces without an account. Creating an account gives you access to booking history and faster checkout.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Just want to book a space?{' '}
              <Link
                to="/bookings"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Book as guest
              </Link>
            </span>
          </div>
        </form>
      </div>

      {/* Premium Access Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-3 rounded-full">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Premium Access Required</h3>
              </div>
              <button
                onClick={() => setShowPremiumModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-amber-900 font-semibold text-sm mb-2">
                Accounts are exclusive to DCIH Members
              </p>
              <p className="text-amber-800 text-xs leading-relaxed">
                Full account access with login, dashboard, and booking history is reserved for paid subscribers. Walk-in users can continue to book spaces as guests without creating an account.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowPremiumModal(false);
                  navigate('/bookings');
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#0C2340] to-blue-600 text-white font-semibold rounded-xl hover:from-[#0C2340]/90 hover:to-blue-600/90 transition-all"
              >
                Continue as Guest
              </button>
              <button
                onClick={() => setShowPremiumModal(false)}
                className="w-full py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
              >
                Close
              </button>
            </div>

            <p className="text-center text-xs text-gray-500 mt-4">
              Talk to the Secretariat to upgrade your tier and unlock full member benefits.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
