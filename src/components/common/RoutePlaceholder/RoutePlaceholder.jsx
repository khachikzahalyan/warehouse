import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../EmptyState';
import { Badge } from '../Badge';
import { PageHeader } from '../PageHeader';
import './RoutePlaceholder.css';

/**
 * "Coming soon" panel rendered by placeholder routes. Thin wrapper around
 * <PageHeader> + <EmptyState> so every placeholder page looks identical.
 * Callers pass the i18n key of the section name (`nav.warehouse`, ...).
 *
 * Kept for backwards compatibility; new placeholder pages compose
 * <PageHeader> + <EmptyState> directly.
 *
 * @param {{ sectionKey: string }} props
 */
export function RoutePlaceholder({ sectionKey }) {
  const { t } = useTranslation();
  const sectionName = t(`nav.${sectionKey}`);
  const description = t(`nav.descriptions.${sectionKey}`, { defaultValue: '' });

  return (
    <div>
      <PageHeader
        title={sectionName}
        subtitle={description || undefined}
      />
      <EmptyState
        badge={<Badge tone="primary" size="sm">{t('common.comingSoon')}</Badge>}
        title={t('placeholder.section', { name: sectionName })}
        description={t('placeholder.description')}
        action={
          <Link to="/" className="route-placeholder__link">
            {t('placeholder.goHome')}
          </Link>
        }
      />
    </div>
  );
}
