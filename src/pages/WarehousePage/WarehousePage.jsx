import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import './WarehousePage.css';

/**
 * Placeholder for the Warehouse page. Replaced by the real assets-on-hand
 * listing in Step 2 (Warehouse + [Выдать] flow). Kept minimal so the route
 * still resolves after the 2026-04-21 rename.
 */
export function WarehousePage() {
  const { t } = useTranslation();
  const sectionName = t('nav.warehouse');
  const description = t('nav.descriptions.warehouse', { defaultValue: '' });

  return (
    <div className="placeholder-page">
      <PageHeader
        title={sectionName}
        subtitle={description || undefined}
      />
      <EmptyState
        badge={<Badge tone="primary" size="sm">{t('common.comingSoon')}</Badge>}
        title={t('placeholder.section', { name: sectionName })}
        description={t('placeholder.description')}
        action={
          <Link to="/" className="placeholder-page__link">
            {t('placeholder.goHome')}
          </Link>
        }
      />
    </div>
  );
}
