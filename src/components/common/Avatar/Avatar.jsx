import React from 'react';
import './Avatar.css';

/**
 * Picks 1-2 initials from a name. "Ann Smith" → "AS", "Иван" → "И".
 * @param {string|null|undefined} name
 */
function initialsOf(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

/**
 * Deterministic color pick from the name so the same user always gets the
 * same background across renders.
 * @param {string|null|undefined} name
 */
function hueFor(name) {
  if (!name) return 210;
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

/**
 * @param {{
 *   name?: string,
 *   src?: string,
 *   size?: 'sm'|'md'|'lg',
 *   className?: string,
 * }} props
 */
export function Avatar({ name, src, size = 'md', className = '' }) {
  const classes = ['avatar', `avatar--${size}`, className].filter(Boolean).join(' ');

  if (src) {
    return (
      <span className={classes}>
        <img src={src} alt={name || ''} className="avatar__img" />
      </span>
    );
  }

  const initials = initialsOf(name);
  const hue = hueFor(name);
  const style = {
    background: `hsl(${hue}, 60%, 92%)`,
    color: `hsl(${hue}, 50%, 30%)`,
  };

  return (
    <span className={classes} aria-label={name || undefined} style={style}>
      <span className="avatar__initials" aria-hidden>{initials}</span>
    </span>
  );
}
