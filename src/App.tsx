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

function App(): JSX.Element {
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
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div></div>}>
          <Routes>
            <Route path="/check-in" element={<CheckIn />} />
            <Route path="/" element={<Layout session={session}><Home /></Layout>} />
            <Route path="/login" element={<Layout session={session}><Login /></Layout>} />
            <Route path="/register" element={<Layout session={session}><Register /></Layout>} />
            <Route path="/forgot-password" element={<Layout session={session}><ForgotPassword /></Layout>} />
            <Route path="/bookings" element={<Layout session={session}><Bookings /></Layout>} />
            <Route path="/calendar" element={<Layout session={session}><Calendar /></Layout>} />
            <Route path="/booking-lookup" element={<Layout session={session}><BookingLookup /></Layout>} />
            <Route path="/gadgets" element={<Layout session={session}><Gadgets /></Layout>} />
            <Route path="/propose-event" element={<Layout session={session}><ProposeEvent /></Layout>} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <Layout session={session}>
                  <ProtectedRoute session={session}>
                    <Dashboard />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/settings"
              element={
                <Layout session={session}>
                  <ProtectedRoute session={session}>
                    <Settings session={session!} />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/my-borrows"
              element={
                <Layout session={session}>
                  <ProtectedRoute session={session}>
                    <MyBorrows />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/test-dashboard"
              element={
                <Layout session={session}>
                  <ProtectedRoute session={session}>
                    <TestDashboard />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/admin"
              element={
                <Layout session={session}>
                  <ProtectedRoute session={session} requireAdmin>
                    <AdminDashboard />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/admin/spaces"
              element={
                <Layout session={session}>
                  <ProtectedRoute session={session} requireAdmin>
                    <SpaceManagement />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/admin/events"
              element={
                <Layout session={session}>
                  <ProtectedRoute session={session} requireAdmin>
                    <EventManagement />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/admin/gadgets"
              element={
                <Layout session={session}>
                  <ProtectedRoute session={session} requireAdmin>
                    <AdminGadgets />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/admin/seats"
              element={
                <Layout session={session}>
                  <ProtectedRoute session={session} requireAdmin>
                    <SeatManagement />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <Layout session={session}>
                  <ProtectedRoute session={session} requireAdmin>
                    <Analytics />
                  </ProtectedRoute>
                </Layout>
              }
            />
          </Routes>
        </Suspense>
      </Router>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
