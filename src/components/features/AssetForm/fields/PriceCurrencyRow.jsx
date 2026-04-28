import React from 'react';
import { Input } from '../../../common/Input';
import { Select } from '../../../common/Select';

/**
 * A two-column row: numeric price input + USD/AMD currency select.
 *
 * @param {{
 *   price: number | null,
 *   currency: 'USD' | 'AMD',
 *   onPriceChange: (v: number | null) => void,
 *   onCurrencyChange: (v: string) => void,
 *   error?: string,
 *   label?: string,
 *   priceId?: string,
 *   currencyId?: string,
 * }} props
 */
export function PriceCurrencyRow({
  price,
  currency,
  onPriceChange,
  onCurrencyChange,
  error,
  label,
  priceId,
  currencyId,
}) {
  return (
    <div className="price-currency-row">
      <Input
        id={priceId}
        type="number"
        min="0"
        step="0.01"
        aria-label={label}
        value={price ?? ''}
        onChange={(e) =>
          onPriceChange(e.target.value === '' ? null : Number(e.target.value))
        }
        invalid={!!error}
      />
      <Select
        id={currencyId}
        value={currency}
        onChange={(e) => onCurrencyChange(e.target.value)}
        aria-label="Currency"
      >
        <option value="AMD">AMD</option>
        <option value="USD">USD</option>
      </Select>
    </div>
  );
}
