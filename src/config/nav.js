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
    roles: ['super_admin'],
    descriptionKey: 'nav.descriptions.dashboard',
  },
  {
    key: 'inventory',
    path: '/inventory',
    icon: 'inventory',
    roles: null,
    descriptionKey: 'nav.descriptions.inventory',
  },
  {
    key: 'transfers',
    path: '/transfers',
    icon: 'transfers',
    roles: null,
    descriptionKey: 'nav.descriptions.transfers',
  },
  {
    key: 'structure',
    path: '/structure',
    icon: 'structure',
    roles: ['admin', 'super_admin'],
    descriptionKey: 'nav.descriptions.structure',
  },
  {
    key: 'licenses',
    path: '/licenses',
    icon: 'licenses',
    roles: null,
    descriptionKey: 'nav.descriptions.licenses',
  },
  {
    key: 'users',
    path: '/admin/users',
    icon: 'users',
    roles: ['super_admin'],
    descriptionKey: 'nav.descriptions.users',
  },
  {
    key: 'settings',
    path: '/admin/settings',
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
