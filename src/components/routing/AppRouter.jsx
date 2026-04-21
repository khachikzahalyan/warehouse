import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { RequireRole } from './RequireRole';
import { AdminLayout } from '../layout/AdminLayout';
import { LoginPage } from '../../pages/LoginPage';
import { HomePage } from '../../pages/HomePage';
import { DashboardPage } from '../../pages/DashboardPage';
import { ProfilePage } from '../../pages/ProfilePage';
import { InventoryPage } from '../../pages/InventoryPage';
import { TransfersPage } from '../../pages/TransfersPage';
import { StructurePage } from '../../pages/StructurePage';
import { LicensesPage } from '../../pages/LicensesPage';
import { UsersPage } from '../../pages/UsersPage';
import { SettingsPage } from '../../pages/SettingsPage';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { ForbiddenPage } from '../../pages/ForbiddenPage';

// Opt into v7 behaviour now to silence v6 deprecation warnings and make
// the eventual upgrade a no-op.
const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

export function AppRouter() {
  return (
    <BrowserRouter future={routerFutureFlags}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        <Route
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<HomePage />} />

          <Route
            path="dashboard"
            element={
              <RequireRole role="super_admin">
                <DashboardPage />
              </RequireRole>
            }
          />

          <Route path="inventory" element={<InventoryPage />} />
          <Route path="transfers" element={<TransfersPage />} />

          <Route
            path="structure"
            element={
              <RequireRole roles={['admin', 'super_admin']}>
                <StructurePage />
              </RequireRole>
            }
          />

          <Route path="licenses" element={<LicensesPage />} />
          <Route path="profile" element={<ProfilePage />} />

          <Route
            path="admin/users"
            element={
              <RequireRole role="super_admin">
                <UsersPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/settings"
            element={
              <RequireRole role="super_admin">
                <SettingsPage />
              </RequireRole>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
