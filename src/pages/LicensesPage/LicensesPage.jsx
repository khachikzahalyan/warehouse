import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import './LicensesPage.css';

export function LicensesPage() {
  const { t } = useTranslation();
  const sectionName = t('nav.licenses');
  const description = t('nav.descriptions.licenses', { defaultValue: '' });

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
