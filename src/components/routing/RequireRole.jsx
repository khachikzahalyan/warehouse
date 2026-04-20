import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Role gate. Pass either `role="admin"` (single) or `roles={['admin','super_admin']}`.
 * Must be nested INSIDE <RequireAuth> — it assumes user+profile are resolved.
 *
 * Not a security boundary — Firestore rules are. This is UX only.
 *
 * @param {{ role?: import('../../domain/repositories/UserRepository.js').UserRole,
 *           roles?: readonly import('../../domain/repositories/UserRepository.js').UserRole[],
 *           children: React.ReactNode }} props
 */
export function RequireRole({ role, roles, children }) {
  const { profile } = useAuth();
  const allowed = roles ?? (role ? [role] : []);

  if (!profile || !allowed.includes(profile.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
