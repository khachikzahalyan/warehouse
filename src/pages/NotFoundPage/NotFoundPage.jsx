import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../components/common/EmptyState';
import { Icon } from '../../components/common/Icon';
import './NotFoundPage.css';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="notfound-page">
      <EmptyState
        icon={<Icon name="inventory" size="lg" />}
        title={t('notFound.title')}
        description={t('notFound.description')}
        action={
          <Link to="/" className="notfound-page__link">
            {t('notFound.goHome')}
          </Link>
        }
      />
    </div>
  );
}
