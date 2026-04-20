import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div style={{ maxWidth: 480, margin: '48px auto 0', padding: 24, textAlign: 'center' }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>{t('notFound.title')}</h1>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>{t('notFound.description')}</p>
      <Link to="/">{t('notFound.goHome')}</Link>
    </div>
  );
}
