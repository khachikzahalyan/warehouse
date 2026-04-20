import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24, textAlign: 'center' }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Страница не найдена</h1>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>
        Запрошенный адрес не существует.
      </p>
      <Link to="/">На главную</Link>
    </div>
  );
}
