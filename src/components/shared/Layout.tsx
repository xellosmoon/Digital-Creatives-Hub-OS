import { ReactNode, useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { Home, Calendar, User, LogOut, Search, Settings, Shield, Package, ClipboardList, Armchair, Menu, X, ChevronDown, PartyPopper, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import RealtimeNotifications from '../notifications/RealtimeNotifications';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
  session: Session | null;
}

export default function Layout({ children, session }: LayoutProps): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAdminStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
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

  const checkAdminStatus = async (): Promise<void> => {
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

  const handleLogout = async (): Promise<void> => {
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

  const isActive = (path: string): boolean => location.pathname === path;

  const navLinkClass = (path: string): string =>
    `relative text-xs uppercase tracking-wider text-slate-600 font-bold px-3 py-1.5 rounded-full transition-all duration-300 ease-out block overflow-hidden ${isActive(path)
      ? 'text-slate-950 bg-slate-100/80'
      : 'hover:text-slate-950 hover:bg-slate-100/80 active:scale-95'
    }`;

  const mobileNavLinkClass = (path: string): string =>
    `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(path)
      ? 'bg-slate-100 text-slate-900'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  // Get user initials for avatar
  const getUserInitials = (): string => {
    const email = session?.user?.email || '';
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-7xl z-50">
        <div className="bg-white/80 backdrop-blur-lg border border-slate-200/50 rounded-full px-6 py-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {/* Logo */}
              <Link to="/" className="flex items-center flex-shrink-0">
                <span className="font-black text-sm tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
                  Digital Creatives Hub
                </span>
              </Link>

              {/* Desktop Navigation Links */}
              <div className="hidden lg:ml-8 lg:flex lg:space-x-6">
                <Link to="/" className={navLinkClass('/')}>
                  Home
                </Link>
                <Link to="/bookings" className={navLinkClass('/bookings')}>
                  Book
                </Link>
                <Link to="/calendar" className={navLinkClass('/calendar')}>
                  Calendar
                </Link>
                <Link to="/propose-event" className={navLinkClass('/propose-event')}>
                  Propose Event
                </Link>
                <Link to="/gadgets" className={navLinkClass('/gadgets')}>
                  Gadgets
                </Link>
                <Link to="/about" className={navLinkClass('/about')}>
                  About
                </Link>
                {!session && (
                  <Link to="/booking-lookup" className={navLinkClass('/booking-lookup')}>
                    Find Booking
                  </Link>
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
                      className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                      aria-expanded={userDropdownOpen}
                      aria-haspopup="true"
                    >
                      {/* Avatar */}
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${isAdmin
                          ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                          : 'bg-gradient-to-br from-cyan-500 to-cyan-600'
                        }`}>
                        {getUserInitials()}
                      </div>
                      <div className="hidden sm:block text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-slate-700 max-w-[140px] truncate">
                            {session.user.email}
                          </span>
                          {isAdmin && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold uppercase tracking-wide">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {userDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        {/* User info header */}
                        <div className="px-4 py-3 border-b border-slate-200/60">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${isAdmin
                                ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                                : 'bg-gradient-to-br from-cyan-500 to-cyan-600'
                              }`}>
                              {getUserInitials()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {session.user.email}
                              </p>
                              <p className="text-xs text-slate-500">
                                {isAdmin ? '🛡️ Administrator' : '👤 Member'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Menu items */}
                        <div className="py-1">
                          <Link
                            to="/dashboard"
                            className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors gap-2"
                            onClick={() => setUserDropdownOpen(false)}
                          >
                            <User className="w-4 h-4 text-slate-400" />
                            User Dashboard
                          </Link>
                          <Link
                            to="/my-borrows"
                            className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors gap-2"
                            onClick={() => setUserDropdownOpen(false)}
                          >
                            <ClipboardList className="w-4 h-4 text-slate-400" />
                            My Borrows
                          </Link>
                          <Link
                            to="/settings"
                            className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors gap-2"
                            onClick={() => setUserDropdownOpen(false)}
                          >
                            <Settings className="w-4 h-4 text-slate-400" />
                            Settings
                          </Link>
                          {isAdmin && (
                            <>
                              <div className="px-4 py-2 mt-1 border-t border-slate-200/60">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administrative</p>
                              </div>
                              <Link
                                to="/admin"
                                className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors gap-2"
                                onClick={() => setUserDropdownOpen(false)}
                              >
                                <Shield className="w-4 h-4 text-violet-500" />
                                Admin Dashboard
                              </Link>
                              <Link
                                to="/admin/gadgets"
                                className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors gap-2"
                                onClick={() => setUserDropdownOpen(false)}
                              >
                                <Package className="w-4 h-4 text-slate-400" />
                                Gadget Mgmt
                              </Link>
                              <Link
                                to="/admin/seats"
                                className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors gap-2"
                                onClick={() => setUserDropdownOpen(false)}
                              >
                                <Armchair className="w-4 h-4 text-slate-400" />
                                Seat Mgmt
                              </Link>
                            </>
                          )}
                        </div>

                        {/* Logout */}
                        <div className="border-t border-slate-200/60 pt-1">
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
                    className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.45)] hover:shadow-[0_0_25px_rgba(34,211,238,0.65)]"
                  >
                    Login
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                id="mobile-menu-button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
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
          <div className="lg:hidden mt-4 bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-xl overflow-hidden">
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
              <Link to="/propose-event" className={mobileNavLinkClass('/propose-event')}>
                <PartyPopper className="w-4 h-4 mr-3" />
                Propose Event
              </Link>
              <Link to="/gadgets" className={mobileNavLinkClass('/gadgets')}>
                <Package className="w-4 h-4 mr-3" />
                Gadgets
              </Link>
              <Link to="/about" className={mobileNavLinkClass('/about')}>
                <Info className="w-4 h-4 mr-3" />
                About
              </Link>
              {!session && (
                <Link to="/booking-lookup" className={mobileNavLinkClass('/booking-lookup')}>
                  <Search className="w-4 h-4 mr-3" />
                  Find Booking
                </Link>
              )}
            </div>

            {/* Mobile auth buttons */}
            {!session && (
              <div className="px-4 pt-3 border-t border-slate-800/60 space-y-2">
                <Link
                  to="/login"
                  className="flex items-center justify-center w-full px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.45)] hover:shadow-[0_0_25px_rgba(34,211,238,0.65)]"
                >
                  Login
                </Link>
              </div>
            )}

            {/* Mobile logout */}
            {session && (
              <div className="px-4 pt-3 border-t border-slate-800/60">
                <button
                  id="mobile-logout-button"
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}
