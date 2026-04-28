import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer } from '../../common/Drawer';
import { Button } from '../../common/Button';
import { Input, FormField } from '../../common/Input';
import { FieldGroup } from '../../common/FieldGroup';
import { SegmentedControl } from '../../common/SegmentedControl';
import { CategoryPicker } from './fields/CategoryPicker';
import { useCustomKinds } from '../../../hooks/useCustomKinds';
import {
  TYPES_BY_KIND,
  filterCategoriesByName,
  kindFromCategory,
} from '../../../domain/categories';
import './EditAssetDrawer.css';

// TODO(iter-2): deduplicate with QuickAddDrawer by extracting <AssetFormBody>.

const EMPTY = {
  kind: null,
  name: '',
  category: '',
  model: '',
  quantity: 1,
  condition: '',
  warrantyStart: null,
  warrantyEnd: null,
};

function dateToInputValue(d) {
  if (!d) return '';
  const dd = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dd.getTime())) return '';
  return dd.toISOString().slice(0, 10);
}

/**
 * Edit drawer for an existing asset. Mirrors the QuickAdd layout: kind tabs
 * sit at the top of an Identification panel, followed by Pricing/Code (here
 * reduced to model/quantity since price isn't editable in this iteration),
 * and Condition & warranty.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   asset: object | null,
 *   repo: { update: (id: string, patch: object) => Promise<void> },
 *   categories: Array<{ id: string, label: string }>,
 * }} props
 */
export function EditAssetDrawer({ open, onClose, asset, repo, categories }) {
  const { t } = useTranslation('warehouse');
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(/** @type {Error|null} */ (null));
  const { options: kindOptionsLive, customKinds } = useCustomKinds();

  useEffect(() => {
    if (open && asset) {
      // Prefer an explicit `kind` on the doc; fall back to the legacy
      // category mapping; finally fall back to 'other'.
      const kind = asset.kind || kindFromCategory(asset.category) || 'other';
      setForm({
        kind,
        name: asset.name ?? '',
        category: asset.category ?? '',
        model: asset.model ?? '',
        quantity: typeof asset.quantity === 'number' ? asset.quantity : 1,
        condition: asset.condition ?? '',
        warrantyStart: asset.warrantyStart ?? null,
        warrantyEnd: asset.warrantyEnd ?? null,
      });
      setErr(null);
      setBusy(false);
    } else if (!open) {
      setForm(EMPTY);
      setErr(null);
      setBusy(false);
    }
  }, [open, asset]);

  // Build the per-kind Type option list. Same approach as QuickAddDrawer —
  // localised labels, plus type lists from any super_admin-defined custom
  // kinds the doc may reference. Includes legacy 'other' so existing rows
  // still render their type picker correctly.
  const typeOptionsByKind = useMemo(() => {
    /** @type {Record<string, Array<{ id: string, label: string }>>} */
    const out = {};
    for (const k of Object.keys(TYPES_BY_KIND)) {
      out[k] = TYPES_BY_KIND[k].map((id) => ({
        id,
        label: t(`types.${id}`, id),
      }));
    }
    for (const c of customKinds) {
      out[c.id] = (c.types || []).map((id) => ({ id, label: id }));
    }
    return out;
  }, [t, customKinds]);

  const visibleTypes = useMemo(() => {
    if (form.kind && typeOptionsByKind[form.kind]) {
      return typeOptionsByKind[form.kind];
    }
    return filterCategoriesByName(form.name, categories);
  }, [form.kind, typeOptionsByKind, form.name, categories]);

  const isAccessory = form.kind === 'accessory';

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  // Kind is IMMUTABLE after creation. The SegmentedControl is rendered in
  // disabled mode below; this no-op handler is wired only so React's
  // controlled-input contract is satisfied.
  const updateKind = () => {};

  const isTracked = Boolean(asset?.sku);
  const canSubmit =
    !!asset &&
    !!form.kind &&
    form.name.trim() !== '' &&
    !!form.category &&
    !busy;

  // Make sure the asset's current kind is always present in the segmented
  // control's options — legacy rows tagged `kind: 'other'` (or any custom
  // kind the user has since deleted) must still light up their pill so the
  // user understands what they're looking at.
  const kindOptions = useMemo(() => {
    const base = kindOptionsLive.slice();
    if (form.kind && !base.some((o) => o.value === form.kind)) {
      const fallbackLabel = t(`kinds.${form.kind}`, form.kind);
      base.push({ value: form.kind, label: fallbackLabel, custom: false });
    }
    return base;
  }, [kindOptionsLive, form.kind, t]);

  async function submit() {
    if (!canSubmit || !asset) return;
    setBusy(true);
    setErr(null);
    try {
      const patch = {
        kind: form.kind,
        name: form.name.trim(),
        category: form.category,
        model: isAccessory ? '' : form.model.trim(),
        condition: form.condition || asset.condition || 'new',
        warrantyStart: form.warrantyStart,
        warrantyEnd: form.warrantyEnd,
      };
      if (!isTracked) {
        patch.quantity = Math.max(1, Number(form.quantity) || 1);
      }
      await repo.update(asset.id, patch);
      onClose();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[editAsset] update failed:', e);
      setErr(e);
    } finally {
      setBusy(false);
    }
  }

  const footer = (
    <div className="edit-asset-drawer__actions">
      <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>
        {t('editAsset.cancel', 'Cancel')}
      </Button>
      <Button variant="primary" type="button" loading={busy} disabled={!canSubmit} onClick={submit}>
        {t('editAsset.save', 'Save')}
      </Button>
    </div>
  );

  const warrantyStartIso = dateToInputValue(form.warrantyStart);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('editAsset.title', 'Edit item')}
      width="md"
      footer={footer}
    >
      <div className="edit-asset-drawer__body">
        {/* — Group 1: Identity — */}
        <FieldGroup title={t('addAsset.groups.identity', 'Identification')}>
          <FormField label={t('addAsset.fields.kind', 'Kind')}>
            <SegmentedControl
              options={kindOptions}
              value={form.kind}
              onChange={updateKind}
              ariaLabel={t('addAsset.fields.kind', 'Kind')}
              disabled
            />
            <p className="edit-asset-drawer__locked-hint" aria-live="polite">
              {t('editAsset.kindLocked', 'Kind cannot be changed after creation.')}
            </p>
          </FormField>

          <FormField label={t('addAsset.fields.name', 'Name')}>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              autoComplete="off"
            />
          </FormField>

          <FormField label={t('addAsset.fields.category', 'Type')}>
            <CategoryPicker
              value={form.category}
              onChange={(v) => update('category', v)}
              categories={visibleTypes}
              placeholder=""
              emptyLabel={t('addAsset.fields.empty', 'Nothing matches')}
              disabledTooltip={t(
                'addAsset.fields.categoryNotConfigured',
                'Categories not configured — ask super_admin',
              )}
            />
          </FormField>
        </FieldGroup>

        {/* — Group 2: Details (model + quantity) — */}
        <FieldGroup title={t('addAsset.groups.pricing', 'Pricing & code')}>
          {!isAccessory && (
            <FormField label={t('addAsset.fields.model', 'Model / Specs')}>
              <Input value={form.model} onChange={(e) => update('model', e.target.value)} />
            </FormField>
          )}

          {!isTracked && (
            <FormField label={t('addAsset.fields.quantity', 'Quantity')}>
              <Input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => update('quantity', Number(e.target.value) || 1)}
              />
            </FormField>
          )}
        </FieldGroup>

        {/* — Group 3: Condition & warranty — */}
        <FieldGroup title={t('addAsset.groups.condition', 'Condition & warranty')}>
          <FormField label={t('addAsset.fields.condition', 'Condition')}>
            <div className="edit-asset-drawer__condition" role="radiogroup">
              <Button
                type="button"
                variant={form.condition === 'new' ? 'primary' : 'secondary'}
                onClick={() => update('condition', 'new')}
              >
                {t('addAsset.condition.new', 'New')}
              </Button>
              <Button
                type="button"
                variant={form.condition === 'used' ? 'primary' : 'secondary'}
                onClick={() =>
                  setForm((f) => ({ ...f, condition: 'used', warrantyStart: null, warrantyEnd: null }))
                }
              >
                {t('addAsset.condition.used', 'Used')}
              </Button>
            </div>
          </FormField>

          {form.condition === 'new' && (
            <div className="edit-asset-drawer__row-2">
              <FormField label={t('addAsset.fields.warrantyStart', 'Warranty start')}>
                <Input
                  type="date"
                  value={warrantyStartIso}
                  onChange={(e) =>
                    update('warrantyStart', e.target.value ? new Date(e.target.value) : null)
                  }
                />
              </FormField>
              <FormField label={t('addAsset.fields.warrantyEnd', 'Warranty end')}>
                <Input
                  type="date"
                  min={warrantyStartIso || undefined}
                  value={dateToInputValue(form.warrantyEnd)}
                  onChange={(e) =>
                    update('warrantyEnd', e.target.value ? new Date(e.target.value) : null)
                  }
                />
              </FormField>
            </div>
          )}
        </FieldGroup>

        {err && (
          <p role="alert" className="edit-asset-drawer__error">
            {err.message}
          </p>
        )}
      </div>
    </Drawer>
  );
}
