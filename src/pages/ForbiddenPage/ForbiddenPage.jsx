import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../components/common/EmptyState';
import { Icon } from '../../components/common/Icon';
import './ForbiddenPage.css';

export function ForbiddenPage() {
  const { t } = useTranslation();
  return (
    <div className="forbidden-page">
      <EmptyState
        icon={<Icon name="settings" size="lg" />}
        title={t('forbidden.title')}
        description={t('forbidden.description')}
        action={
          <Link to="/" className="forbidden-page__link">
            {t('forbidden.goHome')}
          </Link>
        }
      />
    </div>
  );
}
