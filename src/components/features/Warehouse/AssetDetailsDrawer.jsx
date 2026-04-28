import React from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer } from '../../common/Drawer';
import { Button } from '../../common/Button';
import { formatDate, formatDateRange } from '../../../utils/formatDate';
import './AssetDetailsDrawer.css';

function pretty(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v.trim() === '' ? null : v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return null;
}

/**
 * Read-only drawer with all populated asset fields.
 *
 * Date fields use locale-aware formatting:
 *   en      → MM/DD/YYYY
 *   ru, hy  → DD.MM.YYYY
 * Warranty start + end render as a single range row "start — end".
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   asset: object | null,
 *   categoryLabelById?: Record<string, string>,
 * }} props
 */
export function AssetDetailsDrawer({ open, onClose, asset, categoryLabelById = {} }) {
  const { t, i18n } = useTranslation('warehouse');
  const lang = i18n.language || 'en';

  /** @type {Array<[string, React.ReactNode]>} */
  const rows = [];
  if (asset) {
    const push = (label, value) => {
      const v = pretty(value);
      if (v !== null) rows.push([label, v]);
    };
    push(t('table.name', 'Name'), asset.name);
    const catLabel = asset.category
      ? categoryLabelById[asset.category] || asset.category
      : null;
    push(t('table.category', 'Type'), catLabel);
    push(t('table.code', 'Code'), asset.sku);
    push(t('table.model', 'Model'), asset.model);
    push(t('table.quantity', 'Qty'), asset.quantity);
    push(t('asset.field.condition', 'Condition'), asset.condition);
    push(t('details.holder', 'Holder'), asset.holder?.displayName || asset.holderId);
    push(t('details.branch', 'Branch'), asset.branchId);
    const warranty = formatDateRange(asset.warrantyStart, asset.warrantyEnd, lang);
    if (warranty) rows.push([t('details.warrantyRange', 'Warranty'), warranty]);
    push(t('asset.field.created', 'Added'), formatDate(asset.createdAt, lang));
    push(t('details.supplier', 'Supplier'), asset.supplier);
    push(t('details.invoice', 'Invoice'), asset.invoiceNumber);
  }

  const footer = (
    <div className="asset-details-drawer__actions">
      <Button variant="secondary" type="button" onClick={onClose}>
        {t('addAsset.cancel', 'Close')}
      </Button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('asset.title', 'Asset detail')}
      width="md"
      footer={footer}
    >
      <div className="asset-details-drawer__body">
        {!asset ? (
          <p>{t('asset.notFoundTitle', 'Asset not found')}</p>
        ) : (
          <dl className="asset-details-drawer__list">
            {rows.map(([label, value]) => (
              <div className="asset-details-drawer__row" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Drawer>
  );
}
