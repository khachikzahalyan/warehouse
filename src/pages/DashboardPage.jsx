import React from 'react';
import { useAuth } from '../hooks/useAuth';
import './DashboardPage.css';

function roleLabel(role) {
  switch (role) {
    case 'super_admin':
      return 'super_admin';
    case 'admin':
      return 'admin';
    case 'user':
      return 'user';
    default:
      return '—';
  }
}

export function DashboardPage() {
  const { user, profile } = useAuth();
  const name = profile?.displayName || user?.email || 'Гость';

  return (
    <div className="dashboard">
      <h1 className="dashboard__title">Добро пожаловать, {name}</h1>
      <p className="dashboard__line">
        Ваша роль: <code>{roleLabel(profile?.role)}</code>
      </p>
      <p className="dashboard__hint">
        Это заглушка dashboard. Функциональность появится в следующих итерациях.
      </p>
    </div>
  );
}
