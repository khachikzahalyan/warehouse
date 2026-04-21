import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { LoginForm } from '../../components/auth/LoginForm';
import './LoginPage.css';

/**
 * Resolve a redirect-reason into an i18n key.
 * @param {string | undefined} reason
 * @returns {string | null}
 */
function reasonKey(reason) {
  switch (reason) {
    case 'disabled':
      return 'auth.errors.accountDisabledNotice';
    case 'no-profile':
      return 'auth.errors.noProfileNotice';
    default:
      return null;
  }
}

export function LoginPage() {
  const { user, profile, loading, signOut } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const state = /** @type {{ from?: string, reason?: string } | null} */ (location.state);
  const key = reasonKey(state?.reason);

  // If a signed-in user landed here for a reason (disabled / no-profile),
  // sign them out so the session is clean before the next attempt.
  useEffect(() => {
    if (key && user && !loading) {
      signOut().catch(() => {});
    }
  }, [key, user, loading, signOut]);

  if (loading) {
    return <div className="login-page__center">{t('common.loading')}</div>;
  }

  // Fully authenticated and active → never show login.
  if (user && profile && profile.status === 'active' && !key) {
    const from = state?.from && state.from !== '/login' ? state.from : '/';
    return <Navigate to={from} replace />;
  }

  return (
    <div className="login-page">
      <div className="login-page__inner">
        {key && (
          <div className="login-page__notice" role="alert">
            {t(key)}
          </div>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
