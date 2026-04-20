import React from 'react';
import { useAuth } from '../../hooks/useAuth';

/**
 * Non-routing role gate: renders children only when the current profile's
 * role is in the allowed list. Unlike <RequireRole/>, this one does NOT
 * redirect — it silently hides the branch. Use this in navigation menus and
 * tile grids where a hidden item is the right UX.
 *
 * Not a security boundary — Firestore rules are. UX only.
 *
 * @param {{ role?: import('../../domain/repositories/UserRepository.js').UserRole,
 *           roles?: readonly import('../../domain/repositories/UserRepository.js').UserRole[],
 *           children: React.ReactNode,
 *           fallback?: React.ReactNode }} props
 */
export function RoleGate({ role, roles, children, fallback = null }) {
  const { profile } = useAuth();
  const allowed = roles ?? (role ? [role] : []);
  if (!profile || !allowed.includes(profile.role)) return fallback;
  return children;
}
