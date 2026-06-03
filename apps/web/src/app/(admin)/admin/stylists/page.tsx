"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { adminApi } from "@/lib/api/admin";
import { Skeleton } from "@/components/ui/Skeleton";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StylistRow {
  id: string;
  user: { name: string; email: string };
  specialty: string;
  location: string;
  status: string;
  createdAt: string;
  experience?: number;
}

interface ListResponse {
  items: StylistRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

type TabValue = "ALL" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SUSPENDED";

const TABS: { label: string; value: TabValue }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Suspended", value: "SUSPENDED" },
];

const STATUS_STYLES: Record<string, string> = {
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-orange-100 text-orange-800",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Table skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-3 bg-white rounded-lg border border-gray-100">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminStylistsPage() {
  const [tab, setTab] = useState<TabValue>("ALL");
  const [page, setPage] = useState(1);

  const params: Record<string, string | number> = { page, limit: 20 };
  if (tab !== "ALL") params.status = tab;

  const cacheKey = `admin/stylists?status=${tab}&page=${page}`;

  const { data, isLoading, error } = useSWR<ListResponse>(
    cacheKey,
    () => adminApi.listStylists(params) as Promise<ListResponse>,
    { keepPreviousData: true },
  );

  const stylists = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  function handleTabChange(val: TabValue) {
    setTab(val);
    setPage(1);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Stylists</h1>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label="Filter stylists by status">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => handleTabChange(t.value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
              tab === t.value
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p role="alert" className="text-sm text-red-600">Failed to load stylists. Please refresh.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Stylists table">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs text-gray-500">
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Name</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Location</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Specialty</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Joined</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {stylists.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                      No stylists found.
                    </td>
                  </tr>
                ) : (
                  stylists.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{s.user.name}</p>
                          <p className="text-xs text-gray-400">{s.user.email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{s.location || "—"}</td>
                      <td className="px-5 py-3 text-gray-600">{s.specialty || "—"}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(s.createdAt)}</td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/stylists/${s.id}`}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages}
                {data ? ` · ${data.meta.total} total` : ""}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
