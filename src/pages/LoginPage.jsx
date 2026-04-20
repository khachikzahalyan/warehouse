import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/auth/LoginForm';
import './LoginPage.css';

/**
 * @param {string | undefined} reason
 * @returns {string | null}
 */
function reasonMessage(reason) {
  switch (reason) {
    case 'disabled':
      return 'Ваша учётная запись отключена. Обратитесь к администратору.';
    case 'no-profile':
      return 'Для вашей учётной записи не создан профиль. Обратитесь к администратору.';
    default:
      return null;
  }
}

export function LoginPage() {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();
  const state = /** @type {{ from?: string, reason?: string } | null} */ (location.state);
  const reason = reasonMessage(state?.reason);

  // If a signed-in user landed here for a reason (disabled / no-profile),
  // sign them out so the session is clean before the next attempt.
  useEffect(() => {
    if (reason && user && !loading) {
      signOut().catch(() => {});
    }
  }, [reason, user, loading, signOut]);

  if (loading) {
    return <div className="login-page__center">Загрузка…</div>;
  }

  // Fully authenticated and active → never show login.
  if (user && profile && profile.status === 'active' && !reason) {
    const from = state?.from && state.from !== '/login' ? state.from : '/';
    return <Navigate to={from} replace />;
  }

  return (
    <div className="login-page">
      <div className="login-page__inner">
        {reason && (
          <div className="login-page__notice" role="alert">
            {reason}
          </div>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
