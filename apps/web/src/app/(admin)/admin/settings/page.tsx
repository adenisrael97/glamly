"use client";

import AccountSettings from "@/components/features/AccountSettings";

// The (admin) layout supplies the sidebar/topbar chrome and the auth guard, so
// this page just renders the shared account settings (profile + password) for the
// signed-in admin. The underlying endpoints (/auth/me, /auth/me/password) are
// role-agnostic — an admin manages their own account exactly like any user.
export default function AdminSettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your admin account.</p>
      </div>
      <AccountSettings />
    </div>
  );
}
