import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './RoutePlaceholder.css';

/**
 * Generic "coming soon" panel rendered by placeholder routes. Looks consistent
 * across sections so the user visually understands the page is a stub.
 *
 * @param {{ sectionKey: string }} props
 *   sectionKey — i18n key under `nav.*` for the section title (e.g. 'transfers').
 */
export function RoutePlaceholder({ sectionKey }) {
  const { t } = useTranslation();
  const sectionName = t(`nav.${sectionKey}`);
  return (
    <div className="route-placeholder">
      <div className="route-placeholder__badge">{t('common.comingSoon')}</div>
      <h1 className="route-placeholder__title">
        {t('placeholder.section', { name: sectionName })}
      </h1>
      <p className="route-placeholder__description">
        {t('placeholder.description')}
      </p>
      <Link to="/" className="route-placeholder__link">
        {t('placeholder.goHome')}
      </Link>
    </div>
  );
}
