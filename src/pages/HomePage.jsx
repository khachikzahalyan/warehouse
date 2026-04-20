import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { visibleNavItems } from '../config/nav';
import { Icon } from '../components/icons';
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
      <header className="home__header">
        <h1 className="home__title">{t('home.welcome', { name })}</h1>
        <p className="home__subtitle">{t('home.subtitle')}</p>
      </header>

      <div className="home__grid">
        {items.map((item) => (
          <Link key={item.key} to={item.path} className="home__tile">
            <span className="home__tile-icon" aria-hidden>
              <Icon name={item.icon} size={26} />
            </span>
            <span className="home__tile-body">
              <span className="home__tile-title">{t(`nav.${item.key}`)}</span>
              {item.descriptionKey && (
                <span className="home__tile-desc">{t(item.descriptionKey)}</span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
