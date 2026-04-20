import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { visibleNavItems } from '../../config/nav';
import { Icon } from '../icons';
import './Sidebar.css';

export function Sidebar() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const items = visibleNavItems(profile?.role);

  return (
    <aside className="sidebar" aria-label={t('nav.primary', { defaultValue: 'Primary' })}>
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark" aria-hidden>W</span>
        <span className="sidebar__brand-text">{t('app.brand')}</span>
      </div>
      <nav className="sidebar__nav">
        <ul className="sidebar__list">
          {items.map((item) => (
            <li key={item.key}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  'sidebar__link' + (isActive ? ' sidebar__link--active' : '')
                }
              >
                <Icon name={item.icon} size={18} className="sidebar__link-icon" />
                <span className="sidebar__link-label">{t(`nav.${item.key}`)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
