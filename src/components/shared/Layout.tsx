import { ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { Home, Calendar, User, LogOut, Search, Settings, Shield, Package, ClipboardList, Armchair } from 'lucide-react';
import toast from 'react-hot-toast';
import RealtimeNotifications from '../notifications/RealtimeNotifications';

interface LayoutProps {
  children: ReactNode;
  session: Session | null;
}

export default function Layout({ children, session }: LayoutProps) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [session]);

  const checkAdminStatus = async () => {
    if (!session?.user) {
      setIsAdmin(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!error && data?.role === 'admin') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error logging out');
    } else {
      toast.success('Logged out successfully');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <Link to="/" className="flex items-center">
                <span className="text-xl font-bold text-primary-600">
                  Creative Coworking
                </span>
              </Link>

              {/* Navigation Links */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Link>
                <Link
                  to="/bookings"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Seat
                </Link>
                <Link
                  to="/calendar"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Calendar
                </Link>
                <Link
                  to="/inventory"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Inventory
                </Link>
                {!session && (
                  <Link
                    to="/booking-lookup"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Find Booking
                  </Link>
                )}
                {session && (
                  <>
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                    <Link
                      to="/my-borrows"
                      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
                    >
                      <ClipboardList className="w-4 h-4 mr-2" />
                      My Borrows
                    </Link>
                    {isAdmin && (
                      <>
                        <Link
                          to="/admin"
                          className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Admin
                        </Link>
                        <Link
                          to="/admin/seats"
                          className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
                        >
                          <Armchair className="w-4 h-4 mr-2" />
                          Seats
                        </Link>
                        <Link
                          to="/admin/inventory"
                          className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
                        >
                          <Package className="w-4 h-4 mr-2" />
                          Inventory Mgmt
                        </Link>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {session ? (
                <>
                  <RealtimeNotifications userEmail={session.user.email!} />
                  <span className="text-sm text-gray-700">
                    {session.user.email}
                  </span>
                  <Link
                    to="/settings"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex space-x-4">
                  <Link
                    to="/login"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2024 Digital Creatives Hub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
