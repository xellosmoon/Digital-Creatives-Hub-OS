import { ReactNode, useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { Home, Calendar, User, LogOut, Search, Settings, Shield, Package, ClipboardList, Armchair, Menu, X, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import RealtimeNotifications from '../notifications/RealtimeNotifications';

interface LayoutProps {
  children: ReactNode;
  session: Session | null;
}

export default function Layout({ children, session }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAdminStatus();
  }, [session]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

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
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error logging out');
    } else {
      toast.success('Logged out successfully');
      navigate('/');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${isActive(path)
      ? 'text-primary-600 border-b-2 border-primary-500'
      : 'text-gray-600 hover:text-primary-600'
    }`;

  const mobileNavLinkClass = (path: string) =>
    `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(path)
      ? 'bg-primary-50 text-primary-700'
      : 'text-gray-700 hover:bg-gray-100'
    }`;

  // Get user initials for avatar
  const getUserInitials = () => {
    const email = session?.user?.email || '';
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Logo */}
              <Link to="/" className="flex items-center flex-shrink-0">
                <span className="text-xl font-bold text-[#0C2340]">
                  Digital Creatives Hub
                </span>
              </Link>

              {/* Desktop Navigation Links */}
              <div className="hidden lg:ml-8 lg:flex lg:space-x-6">
                <Link to="/" className={navLinkClass('/')}>
                  <Home className="w-4 h-4 mr-1.5" />
                  Home
                </Link>
                <Link to="/bookings" className={navLinkClass('/bookings')}>
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Book
                </Link>
                <Link to="/calendar" className={navLinkClass('/calendar')}>
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Calendar
                </Link>
                <Link to="/gadgets" className={navLinkClass('/gadgets')}>
                  <Package className="w-4 h-4 mr-1.5" />
                  Gadgets
                </Link>
                {!session && (
                  <Link to="/booking-lookup" className={navLinkClass('/booking-lookup')}>
                    <Search className="w-4 h-4 mr-1.5" />
                    Find Booking
                  </Link>
                )}
                {session && (
                  <>
                    <Link to="/dashboard" className={navLinkClass('/dashboard')}>
                      <User className="w-4 h-4 mr-1.5" />
                      Dashboard
                    </Link>
                    <Link to="/my-borrows" className={navLinkClass('/my-borrows')}>
                      <ClipboardList className="w-4 h-4 mr-1.5" />
                      Borrows
                    </Link>
                    {/* Admin links moved to user dropdown */}
                  </>
                )}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {session ? (
                <>
                  <RealtimeNotifications userEmail={session.user.email!} />

                  {/* User Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      id="user-menu-button"
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                      aria-expanded={userDropdownOpen}
                      aria-haspopup="true"
                    >
                      {/* Avatar */}
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${isAdmin
                          ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                          : 'bg-gradient-to-br from-primary-500 to-primary-600'
                        }`}>
                        {getUserInitials()}
                      </div>
                      <div className="hidden sm:block text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-800 max-w-[140px] truncate">
                            {session.user.email}
                          </span>
                          {isAdmin && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold uppercase tracking-wide">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {userDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        {/* User info header */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${isAdmin
                                ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                                : 'bg-gradient-to-br from-primary-500 to-primary-600'
                              }`}>
                              {getUserInitials()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {session.user.email}
                              </p>
                              <p className="text-xs text-gray-500">
                                {isAdmin ? '🛡️ Administrator' : '👤 Member'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Menu items */}
                        <div className="py-1">
                          <Link
                            to="/dashboard"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserDropdownOpen(false)}
                          >
                            <User className="w-4 h-4 mr-3 text-gray-400" />
                            My Dashboard
                          </Link>
                          <Link
                            to="/settings"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserDropdownOpen(false)}
                          >
                            <Settings className="w-4 h-4 mr-3 text-gray-400" />
                            Settings
                          </Link>
                          {isAdmin && (
                            <>
                              <div className="px-4 py-2 mt-1 border-t border-gray-50">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Administrative</p>
                              </div>
                              <Link
                                to="/admin"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                onClick={() => setUserDropdownOpen(false)}
                              >
                                <Shield className="w-4 h-4 mr-3 text-violet-400" />
                                Admin Dashboard
                              </Link>
                              <Link
                                to="/admin/gadgets"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                onClick={() => setUserDropdownOpen(false)}
                              >
                                <Package className="w-4 h-4 mr-3 text-gray-400" />
                                Gadget Mgmt
                              </Link>
                              <Link
                                to="/admin/seats"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                onClick={() => setUserDropdownOpen(false)}
                              >
                                <Armchair className="w-4 h-4 mr-3 text-gray-400" />
                                Seat Mgmt
                              </Link>
                            </>
                          )}
                        </div>

                        {/* Logout */}
                        <div className="border-t border-gray-100 pt-1">
                          <button
                            id="logout-button"
                            onClick={handleLogout}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4 mr-3" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="hidden sm:flex items-center space-x-3">
                  <Link
                    to="/login"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                id="mobile-menu-button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-expanded={mobileMenuOpen}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white shadow-lg">
            <div className="px-4 py-3 space-y-1">
              <Link to="/" className={mobileNavLinkClass('/')}>
                <Home className="w-4 h-4 mr-3" />
                Home
              </Link>
              <Link to="/bookings" className={mobileNavLinkClass('/bookings')}>
                <Calendar className="w-4 h-4 mr-3" />
                Book Seat
              </Link>
              <Link to="/calendar" className={mobileNavLinkClass('/calendar')}>
                <Calendar className="w-4 h-4 mr-3" />
                Calendar
              </Link>
              <Link to="/gadgets" className={mobileNavLinkClass('/gadgets')}>
                <Package className="w-4 h-4 mr-3" />
                Gadgets
              </Link>
              {!session && (
                <Link to="/booking-lookup" className={mobileNavLinkClass('/booking-lookup')}>
                  <Search className="w-4 h-4 mr-3" />
                  Find Booking
                </Link>
              )}
              {session && (
                <>
                  <Link to="/dashboard" className={mobileNavLinkClass('/dashboard')}>
                    <User className="w-4 h-4 mr-3" />
                    Dashboard
                  </Link>
                  <Link to="/my-borrows" className={mobileNavLinkClass('/my-borrows')}>
                    <ClipboardList className="w-4 h-4 mr-3" />
                    My Borrows
                  </Link>
                  {isAdmin && (
                    <div className="pt-2 pb-1 border-t border-gray-100 mt-2">
                      <span className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Administration
                      </span>
                      <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass('/admin')}>
                        <Shield className="w-4 h-4 mr-3" />
                        Admin Dashboard
                      </Link>
                      <Link to="/admin/gadgets" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass('/admin/gadgets')}>
                        <Package className="w-4 h-4 mr-3" />
                        Gadget Management
                      </Link>
                      <Link to="/admin/seats" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass('/admin/seats')}>
                        <Armchair className="w-4 h-4 mr-3" />
                        Seat Management
                      </Link>
                    </div>
                  )}
                </>
              )}

              {/* Mobile auth buttons */}
              {!session && (
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <Link
                    to="/login"
                    className="flex items-center justify-center w-full px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center justify-center w-full px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Mobile logout */}
              {session && (
                <div className="pt-3 border-t border-gray-100">
                  <button
                    id="mobile-logout-button"
                    onClick={handleLogout}
                    className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2024 Digital Creatives Hub Iligan. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
