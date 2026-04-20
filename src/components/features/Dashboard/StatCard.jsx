import React from 'react';
import { Icon } from '../../icons';
import './StatCard.css';

/**
 * @param {{ label: string, value: number | null, icon: string, tone?: 'default' | 'warning' }} props
 */
export function StatCard({ label, value, icon, tone = 'default' }) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__icon" aria-hidden>
        <Icon name={icon} size={22} />
      </span>
      <div className="stat-card__body">
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value">
          {value === null ? '—' : value.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
