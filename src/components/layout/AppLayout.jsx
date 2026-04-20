import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './AppLayout.css';

/** Display label for a role — Russian. */
function roleLabel(role) {
  switch (role) {
    case 'super_admin':
      return 'Супер-админ';
    case 'admin':
      return 'Админ';
    case 'user':
      return 'Пользователь';
    default:
      return '—';
  }
}

export function AppLayout() {
  const { user, profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[layout] sign-out failed:', err);
    } finally {
      setSigningOut(false);
    }
  };

  const name = profile?.displayName || user?.email || 'Без имени';

  return (
    <div className="app-layout">
      <header className="app-layout__header">
        <div className="app-layout__brand">
          <Link to="/" className="app-layout__brand-link">Warehouse</Link>
        </div>
        <div className="app-layout__user">
          <span className="app-layout__user-name">{name}</span>
          <span className="app-layout__user-role">{roleLabel(profile?.role)}</span>
          <button
            type="button"
            className="app-layout__signout"
            onClick={onSignOut}
            disabled={signingOut}
          >
            {signingOut ? 'Выход…' : 'Выйти'}
          </button>
        </div>
      </header>
      <main className="app-layout__main">
        <Outlet />
      </main>
    </div>
  );
}
