import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import './ProfilePage.css';

export function ProfilePage() {
  const { user, profile } = useAuth();
  const { t } = useTranslation();

  const rows = [
    { label: t('profile.email'), value: profile?.email || user?.email || t('common.none') },
    { label: t('profile.displayName'), value: profile?.displayName || t('common.unnamed') },
    { label: t('profile.role'), value: profile?.role ? t(`role.${profile.role}`) : t('common.none') },
    {
      label: t('profile.preferredLocale'),
      value: profile?.preferredLocale
        ? t(`lang.${profile.preferredLocale}`)
        : t('common.none'),
    },
  ];

  return (
    <div className="profile">
      <h1 className="profile__title">{t('profile.title')}</h1>
      <dl className="profile__grid">
        {rows.map((row) => (
          <div key={row.label} className="profile__row">
            <dt className="profile__label">{row.label}</dt>
            <dd className="profile__value">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
