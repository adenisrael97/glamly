"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import AccountSettings from "@/components/features/AccountSettings";

function SettingsSkeleton() {
  return (
    <div className="max-w-2xl mx-auto w-full animate-pulse">
      {[0, 1].map((card) => (
        <div key={card} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="h-5 w-28 rounded bg-gray-200 mb-5" />
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className="h-3 w-24 rounded bg-gray-100 mb-2" />
                <div className="h-9 w-full rounded-lg bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UserSettingsPage() {
  const { status } = useAuth();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-purple-600 hover:text-purple-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded"
          >
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Account settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your profile and password.</p>
        </div>

        {status === "loading" ? <SettingsSkeleton /> : <AccountSettings />}
      </div>
    </main>
  );
}
