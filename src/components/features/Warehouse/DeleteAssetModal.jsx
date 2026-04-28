import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';

/**
 * Soft-delete confirmation. Calls onConfirm() which the parent wires to
 * repo.archive(asset.id).
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   asset: { id: string, name?: string } | null,
 *   onConfirm: () => Promise<void> | void,
 * }} props
 */
export function DeleteAssetModal({ open, onClose, asset, onConfirm }) {
  const { t } = useTranslation('warehouse');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(/** @type {Error|null} */ (null));

  async function handleConfirm() {
    setBusy(true);
    setErr(null);
    try {
      await onConfirm();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[deleteAsset] archive failed:', e);
      setErr(e);
    } finally {
      setBusy(false);
    }
  }

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
      <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>
        {t('deleteAsset.cancel', 'Cancel')}
      </Button>
      <Button variant="danger" type="button" loading={busy} onClick={handleConfirm}>
        {t('deleteAsset.confirm', 'Delete')}
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('deleteAsset.title', 'Delete item?')}
      size="sm"
      footer={footer}
    >
      <p>
        {t('deleteAsset.body', 'Item “{{name}}” will be archived. You can undo this later.', {
          name: asset?.name ?? '',
        })}
      </p>
      {err && (
        <p role="alert" style={{ color: 'var(--color-danger, #dc2626)' }}>
          {err.message}
        </p>
      )}
    </Modal>
  );
}
