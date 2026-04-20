import React from 'react';
import { Link } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24, textAlign: 'center' }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Доступ запрещён</h1>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>
        У вашей роли нет прав на этот раздел.
      </p>
      <Link to="/">На главную</Link>
    </div>
  );
}
