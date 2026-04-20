import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRecentActivity } from '../../../hooks/useRecentActivity';
import './RecentActivity.css';

function formatRelative(date, locale) {
  const diffMs = Date.now() - date.getTime();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < minute) return rtf.format(-Math.round(diffMs / 1000), 'second');
  if (abs < hour) return rtf.format(-Math.round(diffMs / minute), 'minute');
  if (abs < day) return rtf.format(-Math.round(diffMs / hour), 'hour');
  return rtf.format(-Math.round(diffMs / day), 'day');
}

export function RecentActivity() {
  const { t, i18n } = useTranslation();
  const { events, loading, error } = useRecentActivity();

  return (
    <section className="activity">
      <header className="activity__header">
        <h2 className="activity__title">{t('dashboard.recentActivity.title')}</h2>
      </header>

      {loading ? (
        <div className="activity__empty">{t('common.loading')}</div>
      ) : error && events.length === 0 ? (
        <div className="activity__error" role="status">
          {t('dashboard.recentActivity.loadError')}
        </div>
      ) : events.length === 0 ? (
        <div className="activity__empty">{t('dashboard.recentActivity.empty')}</div>
      ) : (
        <ul className="activity__list">
          {events.map((ev) => (
            <li key={ev.id} className="activity__item">
              <span className={`activity__dot activity__dot--${ev.source}`} aria-hidden />
              <span className="activity__label">
                {t(`dashboard.events.${ev.eventType}`, {
                  defaultValue: ev.eventType,
                })}
              </span>
              <span className="activity__meta">
                {ev.assetId && <code className="activity__ref">#{ev.assetId.slice(0, 6)}</code>}
                {ev.transferId && <code className="activity__ref">TR #{ev.transferId.slice(0, 6)}</code>}
                <span className="activity__time">
                  {formatRelative(ev.at, i18n.resolvedLanguage || 'en')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
