import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import './BranchesPage.css';

/**
 * Placeholder for the Branches page. Replaced by the real branch grid +
 * split-view detail in Step 3. Kept minimal so the route still resolves
 * after the 2026-04-21 rename.
 */
export function BranchesPage() {
  const { t } = useTranslation();
  const sectionName = t('nav.branches');
  const description = t('nav.descriptions.branches', { defaultValue: '' });

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
