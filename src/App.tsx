import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState, lazy, Suspense } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Bookings = lazy(() => import('./pages/Bookings'));
const Calendar = lazy(() => import('./pages/Calendar'));
const BookingLookup = lazy(() => import('./pages/BookingLookup'));
const SpaceManagement = lazy(() => import('./pages/SpaceManagement'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const EventManagement = lazy(() => import('./pages/EventManagement'));
const TestDashboard = lazy(() => import('./pages/TestDashboard'));
const Gadgets = lazy(() => import('./pages/Gadgets'));
const AdminGadgets = lazy(() => import('./pages/AdminGadgets'));
const MyBorrows = lazy(() => import('./pages/MyBorrows'));
const SeatManagement = lazy(() => import('./pages/SeatManagement'));
const ProposeEvent = lazy(() => import('./pages/ProposeEvent'));
const CheckIn = lazy(() => import('./pages/CheckIn'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));

// Components
import Layout from './components/shared/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

const queryClient = new QueryClient();

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout session={session}>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div></div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/booking-lookup" element={<BookingLookup />} />
              <Route path="/gadgets" element={<Gadgets />} />
              <Route path="/propose-event" element={<ProposeEvent />} />
              <Route path="/check-in" element={<CheckIn />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute session={session}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute session={session}>
                    <Settings session={session!} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-borrows"
                element={
                  <ProtectedRoute session={session}>
                    <MyBorrows />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/test-dashboard"
                element={
                  <ProtectedRoute session={session}>
                    <TestDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute session={session} requireAdmin>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/spaces"
                element={
                  <ProtectedRoute session={session} requireAdmin>
                    <SpaceManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/events"
                element={
                  <ProtectedRoute session={session} requireAdmin>
                    <EventManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/gadgets"
                element={
                  <ProtectedRoute session={session} requireAdmin>
                    <AdminGadgets />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/seats"
                element={
                  <ProtectedRoute session={session} requireAdmin>
                    <SeatManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute session={session} requireAdmin>
                    <Analytics />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
