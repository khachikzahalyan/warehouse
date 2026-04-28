import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/common/PageHeader';
import { Spinner } from '../../components/common/Spinner';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { createAssetRepository } from '../../infra/repositories/firestoreAssetRepository';
import './WarehouseAssetPage.css';

function formatDate(d) {
  if (!d) return null;
  const dd = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dd.getTime())) return null;
  return dd.toLocaleDateString();
}

export function WarehouseAssetPage() {
  const { assetId } = useParams();
  const { t } = useTranslation('warehouse');
  const { user } = useAuth();

  const repo = useMemo(
    () => createAssetRepository({ uid: user?.uid }),
    [user?.uid],
  );

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    repo
      .getById(assetId)
      .then((a) => {
        if (!cancelled) {
          setAsset(a);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [repo, assetId]);

  if (loading) {
    return (
      <div className="asset-page__loading" aria-live="polite">
        <Spinner />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="asset-page">
        <PageHeader title={t('asset.title', 'Asset detail')} />
        <EmptyState
          title={t('asset.notFoundTitle', 'Asset not found')}
          description={
            <Link to="/warehouse">{t('asset.backToList', '← Back to warehouse')}</Link>
          }
        />
      </div>
    );
  }

  const typeLabel = asset.category ? t(`categories.${asset.category}`, asset.category) : null;
  const conditionLabel = asset.condition
    ? t(`addAsset.condition.${asset.condition}`, asset.condition)
    : null;
  const warrantyStart = formatDate(asset.warrantyStart);
  const warrantyEnd = formatDate(asset.warrantyEnd);
  const created = formatDate(asset.createdAt);

  const rows = [
    { label: t('asset.field.type', 'Type'), value: typeLabel },
    asset.sku
      ? { label: t('asset.field.code', 'Code'), value: asset.sku }
      : { label: t('asset.field.quantity', 'Quantity'), value: asset.quantity ?? 1 },
    asset.model
      ? { label: t('asset.field.model', 'Model / Specs'), value: asset.model }
      : null,
    conditionLabel
      ? { label: t('asset.field.condition', 'Condition'), value: conditionLabel }
      : null,
    warrantyStart || warrantyEnd
      ? {
          label: t('asset.field.warranty', 'Warranty'),
          value: `${warrantyStart ?? '—'} → ${warrantyEnd ?? '—'}`,
        }
      : null,
    created ? { label: t('asset.field.created', 'Added'), value: created } : null,
  ].filter(Boolean);

  return (
    <div className="asset-page">
      <PageHeader
        title={asset.name}
        subtitle={
          <Link to="/warehouse" className="asset-page__back">
            {t('asset.backToList', '← Back to warehouse')}
          </Link>
        }
      />

      <dl className="asset-page__fields">
        {rows.map((row) => (
          <div className="asset-page__row" key={row.label}>
            <dt className="asset-page__label">{row.label}</dt>
            <dd className="asset-page__value">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
