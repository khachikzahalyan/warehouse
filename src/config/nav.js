// Single source of truth for the sidebar + home-tile navigation.
// Each entry lists:
//   - key           : stable internal id (also used as the i18n nav.* key)
//   - path          : route path
//   - icon          : icon name from src/components/icons
//   - roles         : array of UserRole values allowed to SEE the link.
//                     null / undefined => visible to every authenticated user.
//   - description   : i18n key for the tile subtitle (optional)
//
// Order here drives both the sidebar order and the home-tile grid order.
//
// Naming note (2026-04-21 rename): the old keys `inventory`, `transfers`,
// `structure`, `users` were replaced by `warehouse`, `employees`, `branches`;
// `transfers` was removed entirely because hand-over lives inside the
// Warehouse flow now. `settings` moved from `/admin/settings` to `/settings`,
// `users` moved to `/employees` and opened up to admin + super_admin.

/** @typedef {import('../domain/repositories/UserRepository').UserRole} UserRole */

/**
 * @typedef {Object} NavItem
 * @property {string} key
 * @property {string} path
 * @property {string} icon
 * @property {UserRole[] | null} roles
 * @property {string} [descriptionKey]
 */

/** @type {NavItem[]} */
export const NAV_ITEMS = [
  {
    key: 'dashboard',
    path: '/dashboard',
    icon: 'dashboard',
    // 2026-04-21: Dashboard visibility widened to include plain admins per
    // user direction ("Панель может увидеть и простой Админ"). Keep the
    // super_admin-only widgets gated inside the page if any emerge later.
    roles: ['admin', 'super_admin'],
    descriptionKey: 'nav.descriptions.dashboard',
  },
  {
    key: 'warehouse',
    path: '/warehouse',
    icon: 'warehouse',
    roles: null,
    descriptionKey: 'nav.descriptions.warehouse',
  },
  {
    key: 'employees',
    path: '/employees',
    icon: 'employees',
    roles: ['admin', 'super_admin'],
    descriptionKey: 'nav.descriptions.employees',
  },
  {
    key: 'branches',
    path: '/branches',
    icon: 'branches',
    roles: ['admin', 'super_admin'],
    descriptionKey: 'nav.descriptions.branches',
  },
  {
    key: 'licenses',
    path: '/licenses',
    icon: 'licenses',
    roles: null,
    descriptionKey: 'nav.descriptions.licenses',
  },
  {
    key: 'settings',
    path: '/settings',
    icon: 'settings',
    roles: ['super_admin'],
    descriptionKey: 'nav.descriptions.settings',
  },
];

/**
 * Filter NAV_ITEMS by role. Items with roles==null are always visible.
 * @param {UserRole | null | undefined} role
 */
export function visibleNavItems(role) {
  if (!role) return [];
  return NAV_ITEMS.filter((it) => it.roles === null || it.roles.includes(role));
}
