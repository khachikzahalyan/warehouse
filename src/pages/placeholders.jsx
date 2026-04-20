import React from 'react';
import { RoutePlaceholder } from '../components/common/RoutePlaceholder';

// Thin wrappers per placeholder section so the router can render them by
// component reference. When a section gets real content, delete the matching
// wrapper here and swap the router import to the real page module.

export function InventoryPage() {
  return <RoutePlaceholder sectionKey="inventory" />;
}

export function TransfersPage() {
  return <RoutePlaceholder sectionKey="transfers" />;
}

export function StructurePage() {
  return <RoutePlaceholder sectionKey="structure" />;
}

export function LicensesPage() {
  return <RoutePlaceholder sectionKey="licenses" />;
}

export function UsersAdminPage() {
  return <RoutePlaceholder sectionKey="users" />;
}

export function SettingsAdminPage() {
  return <RoutePlaceholder sectionKey="settings" />;
}
