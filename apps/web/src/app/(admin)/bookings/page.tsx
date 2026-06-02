"use client";

import { Fragment, useState } from "react";
import useSWR from "swr";
import { adminApi } from "@/lib/api/admin";
import { Skeleton } from "@/components/ui/Skeleton";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BookingService {
  name: string;
  price: number;
}

interface BookingRow {
  id: string;
  user: { name: string; email: string };
  stylist: { name: string };
  services: BookingService[];
  totalAmount: number;
  status: string;
  createdAt: string;
  scheduledAt?: string;
  notes?: string;
}

interface ListResponse {
  bookings: BookingRow[];
  total: number;
  page: number;
  pageSize: number;
}

type StatusFilter = "ALL" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function truncateId(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Expanded row detail ──────────────────────────────────────────────────────

function BookingDetail({ booking }: { booking: BookingRow }) {
  return (
    <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Booking ID</p>
        <p className="font-mono text-xs text-gray-700 break-all">{booking.id}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Customer</p>
        <p className="text-gray-900">{booking.user.name}</p>
        <p className="text-gray-400 text-xs">{booking.user.email}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Scheduled</p>
        <p className="text-gray-900">{booking.scheduledAt ? formatDateTime(booking.scheduledAt) : "—"}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Services</p>
        {booking.services && booking.services.length > 0 ? (
          <ul className="space-y-0.5">
            {booking.services.map((s, i) => (
              <li key={i} className="flex justify-between text-gray-700">
                <span>{s.name}</span>
                <span className="text-purple-700 font-medium ml-2">{formatNaira(s.price)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">—</p>
        )}
      </div>
      {booking.notes && (
        <div className="sm:col-span-2">
          <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
          <p className="text-gray-700">{booking.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-3 bg-white rounded-lg border border-gray-100">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminBookingsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const params: Record<string, string | number> = { page, limit: 20 };
  if (statusFilter !== "ALL") params.status = statusFilter;

  const cacheKey = `admin/bookings?status=${statusFilter}&page=${page}`;

  const { data, isLoading, error } = useSWR<ListResponse>(
    cacheKey,
    () => adminApi.listBookings(params) as Promise<ListResponse>,
    { keepPreviousData: true },
  );

  const bookings = data?.bookings ?? [];
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  function handleFilterChange(val: StatusFilter) {
    setStatusFilter(val);
    setPage(1);
    setExpandedId(null);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Bookings</h1>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label="Filter bookings by status">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
              statusFilter === f.value
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p role="alert" className="text-sm text-red-600">Failed to load bookings. Please refresh.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Bookings table">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs text-gray-500">
                  <th scope="col" className="px-5 py-3 text-left font-semibold">ID</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">User</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Stylist</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Services</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Amount</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Date</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">
                    <span className="sr-only">Expand</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-gray-400">No bookings found.</td>
                  </tr>
                ) : (
                  bookings.map((b) => {
                    const isExpanded = expandedId === b.id;
                    const serviceNames = b.services?.map((s) => s.name).join(", ") || "—";
                    return (
                      <Fragment key={b.id}>
                        <tr
                          className={`border-b border-gray-50 transition-colors ${isExpanded ? "bg-purple-50" : "hover:bg-gray-50"}`}
                        >
                          <td className="px-5 py-3 font-mono text-xs text-gray-500">{truncateId(b.id)}</td>
                          <td className="px-5 py-3 text-gray-900 max-w-[8rem] truncate">{b.user.name}</td>
                          <td className="px-5 py-3 text-gray-600 max-w-[8rem] truncate">{b.stylist.name}</td>
                          <td className="px-5 py-3 text-gray-500 max-w-[10rem] truncate" title={serviceNames}>
                            {serviceNames}
                          </td>
                          <td className="px-5 py-3 text-right text-purple-700 font-semibold whitespace-nowrap">
                            {formatNaira(b.totalAmount)}
                          </td>
                          <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                          <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(b.createdAt)}</td>
                          <td className="px-5 py-3">
                            <button
                              type="button"
                              onClick={() => toggleExpand(b.id)}
                              aria-expanded={isExpanded}
                              aria-controls={`booking-detail-${b.id}`}
                              aria-label={isExpanded ? "Collapse booking details" : "Expand booking details"}
                              className="p-1 rounded text-gray-400 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-transform"
                              style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr id={`booking-detail-${b.id}`}>
                            <td colSpan={8} className="p-0 border-b border-gray-100">
                              <BookingDetail booking={b} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">Page {page} of {totalPages}{data ? ` · ${data.total} total` : ""}</p>
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
