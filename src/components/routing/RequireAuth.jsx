import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Gate for routes that require an authenticated AND active user with a profile.
 *
 * Redirect semantics:
 *   - loading → render a minimal placeholder (do not flash /login)
 *   - no user → redirect to /login, remember the attempted path in location.state
 *   - user but no profile doc → redirect to /login (treats missing profile as
 *     not-provisioned; a super_admin must seed the user)
 *   - user + profile but status !== 'active' → redirect to /login
 *     (full reason shown on login page via location.state)
 */
export function RequireAuth({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ padding: 24 }}>Загрузка…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!profile) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, reason: 'no-profile' }}
      />
    );
  }

  if (profile.status !== 'active') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, reason: 'disabled' }}
      />
    );
  }

  return children;
}
