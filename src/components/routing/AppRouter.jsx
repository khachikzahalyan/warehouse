import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { RequireRole } from './RequireRole';
import { AdminLayout } from '../layout/AdminLayout';
import { LoginPage } from '../../pages/LoginPage';
import { HomePage } from '../../pages/HomePage';
import { DashboardPage } from '../../pages/DashboardPage';
import { ProfilePage } from '../../pages/ProfilePage';
import { WarehousePage } from '../../pages/WarehousePage';
import { BranchesPage } from '../../pages/BranchesPage';
import { LicensesPage } from '../../pages/LicensesPage';
import { EmployeesPage } from '../../pages/EmployeesPage';
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

          <Route path="warehouse" element={<WarehousePage />} />

          <Route
            path="branches"
            element={
              <RequireRole roles={['admin', 'super_admin']}>
                <BranchesPage />
              </RequireRole>
            }
          />

          <Route path="licenses" element={<LicensesPage />} />
          <Route path="profile" element={<ProfilePage />} />

          <Route
            path="employees"
            element={
              <RequireRole roles={['admin', 'super_admin']}>
                <EmployeesPage />
              </RequireRole>
            }
          />
          <Route
            path="settings"
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
