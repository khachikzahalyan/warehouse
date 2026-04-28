import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer } from '../../common/Drawer';
import { Button } from '../../common/Button';
import { Input, FormField } from '../../common/Input';
import { Select } from '../../common/Select';
import { SearchableSelect } from '../../common/SearchableSelect';
import { FieldGroup } from '../../common/FieldGroup';
import { SegmentedControl } from '../../common/SegmentedControl';
import { UniquenessHintedInput } from './fields/UniquenessHintedInput';
import { CategoryPicker } from './fields/CategoryPicker';
import { AddKindModal } from './AddKindModal';
import { useUniqueCheck } from '../../../hooks/useUniqueCheck';
import { useAssetCreate } from '../../../hooks/useAssetCreate';
import { useWarehouseSettings } from '../../../hooks/useWarehouseSettings';
import { useCustomKinds } from '../../../hooks/useCustomKinds';
import { useAuth } from '../../../hooks/useAuth';
import {
  TYPES_BY_KIND,
  filterTypesByKind,
  inferKind,
} from '../../../domain/categories';
import { validateQuickAdd } from './schema';
import './QuickAddDrawer.css';

const EMPTY = {
  kind: null,
  hasCode: null,
  name: '',
  category: '',
  model: '',
  code: '',
  condition: '',
  warrantyStart: null,
  warrantyEnd: null,
  quantity: 1,
  price: null,
  currency: 'AMD',
};

function dateToInputValue(d) {
  if (!d) return '';
  const dd = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dd.getTime())) return '';
  return dd.toISOString().slice(0, 10);
}

function formatAmd(amount) {
  if (typeof amount !== 'number' || !isFinite(amount)) return '';
  try {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount);
  } catch {
    return String(amount);
  }
}

/**
 * Drawer for quickly adding a single asset to warehouse storage.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   repo: any,
 *   categories?: Array<{ id: string, label: string }>,   Legacy categories — used as a fallback when no per-kind type list is provided.
 *   defaultBranchId: string | null,
 *   defaultHolderDisplayName?: string,
 *   existingNames?: string[],
 *   onCreated: (id: string) => void,
 *   sourceLanguage?: string,
 * }} props
 */
export function QuickAddDrawer({
  open,
  onClose,
  repo,
  categories = [],
  defaultBranchId,
  defaultHolderDisplayName = 'Storage',
  existingNames = [],
  onCreated,
  sourceLanguage = 'en',
}) {
  const { t } = useTranslation('warehouse');
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState(/** @type {Set<string>} */ (new Set()));
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [kindLocked, setKindLocked] = useState(false); // user clicked → don't auto-suggest
  const [addKindOpen, setAddKindOpen] = useState(false);

  const { role } = useAuth();
  const isSuperAdmin = role === 'super_admin';

  const { create, submitting, error: createError } = useAssetCreate(repo);
  const { inventoryCodeThresholdAmd, usdToAmd } = useWarehouseSettings();
  const { options: kindOptions, customKinds } = useCustomKinds();

  useEffect(() => {
    if (!open) {
      setForm(EMPTY);
      setTouched(new Set());
      setSubmitAttempted(false);
      setKindLocked(false);
    }
  }, [open]);

  // Build the per-kind Type option list. Each kind id maps to a translation
  // key under `types.<id>`; we resolve labels via t() so the picker reads
  // localized text. We fall back to legacy `categories` prop when no kind
  // is picked, so the form stays usable for callers that haven't migrated.
  // Hardcoded kinds + custom kinds (from /settings/global_lists/assetKinds)
  // both contribute their own type list.
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
    // No kind picked yet → show legacy categories so the picker is not empty.
    return filterTypesByKind(null, categories);
  }, [form.kind, typeOptionsByKind, categories]);

  // Auto-suggest kind from name once, until the user picks one manually.
  useEffect(() => {
    if (kindLocked) return;
    if (!form.name) return;
    const { kind, confident } = inferKind(form.name);
    if (confident && form.kind !== kind) {
      setForm((f) => ({ ...f, kind }));
    }
  }, [form.name, form.kind, kindLocked]);

  const validation = useMemo(
    () => validateQuickAdd(form, { inventoryCodeThresholdAmd, usdToAmd }),
    [form, inventoryCodeThresholdAmd, usdToAmd],
  );

  const isAccessory = form.kind === 'accessory';
  const effectiveHasCode = isAccessory ? false : form.hasCode;

  const nameSuggestions = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const n of existingNames) {
      const v = (n || '').trim();
      if (!v || seen.has(v.toLowerCase())) continue;
      seen.add(v.toLowerCase());
      out.push(v);
    }
    return out;
  }, [existingNames]);

  const codeCheck = useUniqueCheck(
    effectiveHasCode === true ? form.code : '',
    repo.isSkuUnique,
  );

  const markTouched = (field) =>
    setTouched((prev) => (prev.has(field) ? prev : new Set([...prev, field])));
  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    markTouched(field);
  };

  const updateKind = (kind) => {
    setKindLocked(true);
    setForm((f) => ({
      ...f,
      kind,
      // Reset Type — the type list flips entirely.
      category: '',
      // Accessories never have a code; force-clear those fields.
      hasCode: kind === 'accessory' ? false : f.hasCode,
      model: kind === 'accessory' ? '' : f.model,
      code: kind === 'accessory' ? '' : f.code,
    }));
    markTouched('kind');
  };

  const showErr = (field) =>
    (submitAttempted || touched.has(field)) && validation.errors[field];

  const codeBlocked =
    effectiveHasCode === true &&
    (codeCheck.status === 'conflict' || codeCheck.status === 'checking');

  const blocked = !validation.ok || codeBlocked || submitting || !form.kind;

  async function submit() {
    setSubmitAttempted(true);
    if (blocked || !validation.normalized) return;
    const n = validation.normalized;
    const branchId = defaultBranchId ?? null;
    const id = await create({
      sku: n.hasCode ? n.code : '',
      name: n.name,
      sourceLanguage,
      kind: n.kind,
      needsReview: n.needsReview,
      category: n.category,
      brand: '',
      model: n.model,
      branchId,
      holderType: 'storage',
      holderId: branchId,
      holderDisplayName: defaultHolderDisplayName,
      purchasePrice: n.price,
      currency: n.currency,
      priceUsd: null,
      quantity: n.quantity,
      isTracked: false,
      serialNumber: null,
      barcode: null,
      condition: n.condition,
      warrantyStart: n.warrantyStart,
      warrantyEnd: n.warrantyEnd,
      acquiredAt: new Date(),
    });
    onCreated(id);
    onClose();
  }

  const footer = (
    <div className="quick-add-drawer__actions">
      <Button variant="secondary" type="button" onClick={onClose}>
        {t('addAsset.cancel', 'Cancel')}
      </Button>
      <Button
        variant="primary"
        type="button"
        loading={submitting}
        onClick={submit}
        disabled={!form.kind || (effectiveHasCode === null && !isAccessory)}
      >
        {t('addAsset.save', 'Save')}
      </Button>
    </div>
  );

  const warrantyStartIso = dateToInputValue(form.warrantyStart);

  // Hint shown once a kind is picked AND it is device/furniture.
  const showThresholdHint =
    form.kind === 'device' || form.kind === 'furniture';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('addAsset.title', 'Add asset')}
      width="md"
      footer={footer}
    >
      <div className="quick-add-drawer__body">
        {/* — Group 1: Identity — */}
        <FieldGroup title={t('addAsset.groups.identity', 'Identification')}>
          <FormField
            label={t('addAsset.fields.kind', 'Kind')}
            error={showErr('kind') ? t('errors.kindRequired', 'Pick a kind') : undefined}
          >
            <SegmentedControl
              options={kindOptions}
              value={form.kind}
              onChange={updateKind}
              ariaLabel={t('addAsset.fields.kind', 'Kind')}
              trailingAction={
                isSuperAdmin
                  ? {
                      label: '+',
                      ariaLabel: t('addKind.addButtonAria', 'Add a new kind'),
                      onClick: () => setAddKindOpen(true),
                    }
                  : null
              }
            />
          </FormField>

          {form.kind && (
            <FormField
              label={t('addAsset.fields.name', 'Name')}
              error={showErr('name') ? t(`errors.${validation.errors.name}`, 'Required') : undefined}
            >
              <SearchableSelect
                allowFreeText
                options={nameSuggestions.map((n) => ({ value: n, label: n }))}
                value={form.name}
                onChange={(v) => update('name', v)}
                placeholder=""
                emptyLabel={t('addAsset.fields.empty', 'Nothing matches')}
                ariaLabel={t('addAsset.fields.name', 'Name')}
              />
            </FormField>
          )}

          {form.kind && (
            <FormField
              label={t('addAsset.fields.category', 'Type')}
              error={showErr('category') ? t(`errors.${validation.errors.category}`, 'Required') : undefined}
            >
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
          )}

          {form.kind && !isAccessory && (
            <FormField
              label={t('addAsset.fields.hasCode', 'Does this item have a code?')}
              error={
                showErr('hasCode')
                  ? t(
                      `errors.${validation.errors.hasCode}`,
                      validation.errors.hasCode === 'codeRequiredAboveThreshold'
                        ? 'Inventory code required for items over threshold'
                        : 'Required',
                    )
                  : undefined
              }
            >
              <div className="quick-add-drawer__hascode" role="radiogroup">
                <Button
                  type="button"
                  variant={form.hasCode === true ? 'primary' : 'secondary'}
                  onClick={() => update('hasCode', true)}
                >
                  {t('addAsset.hasCode.yes', 'Yes')}
                </Button>
                <Button
                  type="button"
                  variant={form.hasCode === false ? 'primary' : 'secondary'}
                  onClick={() => update('hasCode', false)}
                  disabled={validation.codeRequired}
                  title={
                    validation.codeRequired
                      ? t(
                          'addAsset.codeRequiredHint',
                          'Inventory code required when price exceeds {{amount}} AMD',
                          { amount: formatAmd(inventoryCodeThresholdAmd) },
                        )
                      : undefined
                  }
                >
                  {t('addAsset.hasCode.no', 'No')}
                </Button>
              </div>
            </FormField>
          )}
        </FieldGroup>

        {/* — Group 2: Pricing & code — */}
        {form.kind && (
          <FieldGroup title={t('addAsset.groups.pricing', 'Pricing & code')}>
            <div className="quick-add-drawer__row-2">
              <FormField label={t('addAsset.fields.price', 'Price')}>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.price ?? ''}
                  onChange={(e) =>
                    update(
                      'price',
                      e.target.value === '' ? null : Number(e.target.value),
                    )
                  }
                />
              </FormField>
              <FormField label={t('addAsset.fields.currency', 'Currency')}>
                <Select
                  aria-label={t('addAsset.fields.currency', 'Currency')}
                  value={form.currency}
                  onChange={(e) => update('currency', e.target.value)}
                >
                  <option value="AMD">AMD</option>
                  <option value="USD">USD</option>
                </Select>
              </FormField>
            </div>

            {showThresholdHint && (
              <p
                className="quick-add-drawer__hint"
                role={validation.codeRequired ? 'status' : undefined}
                aria-live="polite"
              >
                {t(
                  'addAsset.thresholdHint',
                  'Inventory code is required when price exceeds {{amount}} AMD.',
                  { amount: formatAmd(inventoryCodeThresholdAmd) },
                )}
              </p>
            )}

            {effectiveHasCode === true && !isAccessory && (
              <>
                <FormField
                  label={t('addAsset.fields.model', 'Model / Specs')}
                  error={showErr('model') ? t(`errors.${validation.errors.model}`, 'Required') : undefined}
                >
                  <Input
                    value={form.model}
                    onChange={(e) => update('model', e.target.value)}
                  />
                </FormField>

                <FormField
                  label={t('addAsset.fields.code', 'Code')}
                  error={
                    showErr('code')
                      ? t(
                          `errors.${validation.errors.code}`,
                          validation.errors.code === 'codeRequiredAboveThreshold'
                            ? t(
                                'errors.codeRequiredAboveThreshold',
                                'Inventory code required for items over {{amount}} AMD',
                                { amount: formatAmd(inventoryCodeThresholdAmd) },
                              )
                            : 'Required',
                        )
                      : undefined
                  }
                >
                  <UniquenessHintedInput
                    value={form.code}
                    onChange={(v) => update('code', v)}
                    status={codeCheck.status}
                    conflictName={codeCheck.conflictName}
                    conflictId={codeCheck.conflictId}
                  />
                </FormField>
              </>
            )}

            {(effectiveHasCode === false || isAccessory) && (
              <FormField
                label={t('addAsset.fields.quantity', 'Quantity')}
                error={showErr('quantity') ? t(`errors.${validation.errors.quantity}`, 'Min 1') : undefined}
              >
                <Input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => update('quantity', Number(e.target.value) || 1)}
                />
              </FormField>
            )}
          </FieldGroup>
        )}

        {/* — Group 3: Condition & warranty — */}
        {form.kind && (
          <FieldGroup title={t('addAsset.groups.condition', 'Condition & warranty')}>
            <FormField
              label={t('addAsset.fields.condition', 'Condition')}
              error={showErr('condition') ? t(`errors.${validation.errors.condition}`, 'Required') : undefined}
            >
              <div className="quick-add-drawer__condition" role="radiogroup">
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
                  onClick={() => {
                    setForm((f) => ({
                      ...f,
                      condition: 'used',
                      warrantyStart: null,
                      warrantyEnd: null,
                    }));
                    markTouched('condition');
                  }}
                >
                  {t('addAsset.condition.used', 'Used')}
                </Button>
              </div>
            </FormField>

            {form.condition === 'new' && (
              <div className="quick-add-drawer__row-2">
                <FormField label={t('addAsset.fields.warrantyStart', 'Warranty start')}>
                  <Input
                    type="date"
                    value={warrantyStartIso}
                    onChange={(e) =>
                      update('warrantyStart', e.target.value ? new Date(e.target.value) : null)
                    }
                  />
                </FormField>
                <FormField
                  label={t('addAsset.fields.warrantyEnd', 'Warranty end')}
                  error={
                    showErr('warrantyEnd')
                      ? t(`errors.${validation.errors.warrantyEnd}`, 'Required')
                      : undefined
                  }
                >
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
        )}

        {createError && (
          <div role="alert" className="quick-add-drawer__error">
            {createError.message}
          </div>
        )}
      </div>
      {isSuperAdmin && (
        <AddKindModal
          open={addKindOpen}
          onClose={() => setAddKindOpen(false)}
          onAdded={(kind) => {
            // Switch the form to the new kind so the user can keep going.
            setKindLocked(true);
            setForm((f) => ({
              ...f,
              kind: kind.id,
              category: '',
              hasCode: f.hasCode,
            }));
            markTouched('kind');
          }}
        />
      )}
    </Drawer>
  );
}
