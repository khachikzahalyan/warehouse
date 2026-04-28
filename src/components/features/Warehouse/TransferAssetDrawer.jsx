import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer } from '../../common/Drawer';
import { Button } from '../../common/Button';
import { Input, FormField } from '../../common/Input';
import './TransferAssetDrawer.css';

function slugify(s) {
  return (
    String(s || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9а-яёա-ֆ\s-]/giu, '')
      .replace(/\s+/g, '-')
      .slice(0, 60) || `target-${Date.now()}`
  );
}

/**
 * Trial transfer drawer — immediate write, no PIN. Free-text recipient.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   asset: { id: string, name?: string } | null,
 *   repo: { transferImmediate: (id: string, target: object) => Promise<void> },
 * }} props
 */
export function TransferAssetDrawer({ open, onClose, asset, repo }) {
  const { t } = useTranslation('warehouse');
  const [holderType, setHolderType] = useState(/** @type {'branch'|'employee'} */ ('branch'));
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(/** @type {Error|null} */ (null));

  useEffect(() => {
    if (!open) {
      setHolderType('branch');
      setTarget('');
      setNote('');
      setBusy(false);
      setErr(null);
    }
  }, [open]);

  const canSubmit = target.trim().length > 0 && !busy && !!asset;

  async function submit() {
    if (!canSubmit || !asset) return;
    setBusy(true);
    setErr(null);
    const name = target.trim();
    const id = slugify(name);
    try {
      await repo.transferImmediate(asset.id, {
        type: holderType,
        id,
        displayName: name,
        branchId: holderType === 'branch' ? id : null,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[transfer] failed:', e);
      setErr(e);
    } finally {
      setBusy(false);
    }
  }

  const footer = (
    <div className="transfer-asset-drawer__actions">
      <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>
        {t('transferAsset.cancel', 'Cancel')}
      </Button>
      <Button variant="primary" type="button" loading={busy} disabled={!canSubmit} onClick={submit}>
        {t('transferAsset.submit', 'Transfer')}
      </Button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('transferAsset.title', 'Transfer item')}
      width="md"
      footer={footer}
    >
      <div className="transfer-asset-drawer__body">
        {asset && (
          <p className="transfer-asset-drawer__subtitle">
            {t('transferAsset.subtitle', '“{{name}}”', { name: asset.name ?? '' })}
          </p>
        )}

        <div className="transfer-asset-drawer__notice" role="note">
          {t('transferAsset.trialNotice', 'Trial mode: transfer without PIN confirmation.')}
        </div>

        <FormField label={t('transferAsset.holderTypeLabel', 'Recipient kind')}>
          <div className="transfer-asset-drawer__holder-type" role="radiogroup">
            <Button
              type="button"
              variant={holderType === 'branch' ? 'primary' : 'secondary'}
              onClick={() => setHolderType('branch')}
            >
              {t('transferAsset.holderType.branch', 'Branch')}
            </Button>
            <Button
              type="button"
              variant={holderType === 'employee' ? 'primary' : 'secondary'}
              onClick={() => setHolderType('employee')}
            >
              {t('transferAsset.holderType.employee', 'Employee')}
            </Button>
          </div>
        </FormField>

        <FormField label={t('transferAsset.targetLabel', 'Recipient')}>
          <Input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={t('transferAsset.targetPlaceholder', 'Name or branch name')}
            autoComplete="off"
          />
        </FormField>

        <FormField label={t('transferAsset.noteLabel', 'Note (optional)')}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>

        {err && (
          <p role="alert" className="transfer-asset-drawer__error">
            {err.message}
          </p>
        )}
      </div>
    </Drawer>
  );
}
