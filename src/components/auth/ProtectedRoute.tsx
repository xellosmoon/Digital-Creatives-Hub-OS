import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { isUserAdmin } from '../../lib/supabase';

interface ProtectedRouteProps {
  children: ReactNode;
  session: Session | null;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  session, 
  requireAdmin = false 
}: ProtectedRouteProps): JSX.Element {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(requireAdmin);

  useEffect(() => {
    if (requireAdmin && session?.user) {
      isUserAdmin(session.user.id).then(setIsAdmin).finally(() => setLoading(false));
    }
  }, [requireAdmin, session]);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
