import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import './ProfilePage.css';

export function ProfilePage() {
  const { user, profile } = useAuth();
  const { t } = useTranslation();

  const name = profile?.displayName || user?.email || t('common.unnamed');
  const email = profile?.email || user?.email || t('common.none');
  const roleKey = profile?.role;

  return (
    <div className="profile-page">
      <PageHeader title={t('profile.title')} />

      <Card padding="lg" className="profile-card">
        <header className="profile-card__header">
          <Avatar name={name} size="lg" />
          <div className="profile-card__heading">
            <div className="profile-card__name">{name}</div>
            <div className="profile-card__email">{email}</div>
            {roleKey && (
              <div className="profile-card__role">
                <Badge tone="primary" size="sm">
                  {t(`role.${roleKey}`)}
                </Badge>
              </div>
            )}
          </div>
        </header>

        <dl className="profile-card__grid">
          <div className="profile-card__row">
            <dt className="profile-card__label">{t('profile.email')}</dt>
            <dd className="profile-card__value">{email}</dd>
          </div>
          <div className="profile-card__row">
            <dt className="profile-card__label">{t('profile.displayName')}</dt>
            <dd className="profile-card__value">
              {profile?.displayName || t('common.unnamed')}
            </dd>
          </div>
          <div className="profile-card__row">
            <dt className="profile-card__label">{t('profile.role')}</dt>
            <dd className="profile-card__value">
              {roleKey ? (
                <Badge tone="neutral" size="sm">
                  {t(`role.${roleKey}`)}
                </Badge>
              ) : (
                t('common.none')
              )}
            </dd>
          </div>
          <div className="profile-card__row">
            <dt className="profile-card__label">
              {t('profile.preferredLocale')}
            </dt>
            <dd className="profile-card__value">
              {profile?.preferredLocale
                ? t(`lang.${profile.preferredLocale}`)
                : t('common.none')}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
