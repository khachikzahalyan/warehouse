import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { visibleNavItems } from '../../config/nav';
import { Card } from '../../components/common/Card';
import { PageHeader } from '../../components/common/PageHeader';
import { Icon } from '../../components/common/Icon';
import './HomePage.css';

/**
 * Landing page after login. Shows a grid of tiles for every nav item the
 * current role is allowed to see. Acts as the app's primary entry point so
 * users pick a section instead of having dashboard data forced on them.
 */
export function HomePage() {
  const { profile, user } = useAuth();
  const { t } = useTranslation();
  const items = visibleNavItems(profile?.role);
  const name = profile?.displayName || user?.email || t('common.guest');

  return (
    <div className="home">
      <PageHeader
        title={t('home.welcome', { name })}
        subtitle={t('home.subtitle')}
      />

      <div className="home__grid">
        {items.map((item) => (
          <Link key={item.key} to={item.path} className="home__tile-link">
            <Card padding="md" className="home__tile">
              <span className="home__tile-icon" aria-hidden>
                <Icon name={item.icon} size={28} />
              </span>
              <span className="home__tile-body">
                <span className="home__tile-title">{t(`nav.${item.key}`)}</span>
                {item.descriptionKey && (
                  <span className="home__tile-desc">
                    {t(item.descriptionKey)}
                  </span>
                )}
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
