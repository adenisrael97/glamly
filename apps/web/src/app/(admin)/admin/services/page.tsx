"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import { adminApi } from "@/lib/api/admin";
import { Skeleton } from "@/components/ui/Skeleton";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServiceRow {
  id: string;
  name: string;
  category?: string;
  price: number;
  isActive: boolean;
  stylist?: { id: string; user: { name: string } };
  createdAt: string;
}

interface ListResponse {
  items: ServiceRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastState {
  message: string;
  type: "success" | "error";
  id: number;
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
        toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
      }`}
    >
      {toast.message}
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">✕</button>
    </div>
  );
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmDeactivateModal({
  service,
  onConfirm,
  onCancel,
  loading,
}: {
  service: ServiceRow;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
          e.preventDefault();
          (e.shiftKey ? last : first)?.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="deactivate-modal-title">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div ref={dialogRef} className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <h2 id="deactivate-modal-title" className="text-base font-bold text-gray-900">
          Deactivate &ldquo;{service.name}&rdquo;?
        </h2>
        <p className="text-sm text-gray-600">
          This service will be hidden from customers. The stylist can re-activate it from their profile.
        </p>
        <div className="flex gap-3 justify-end pt-1">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Deactivating…" : "Deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-3 bg-white rounded-lg border border-gray-100">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminServicesPage() {
  const [page, setPage] = useState(1);
  const [confirmService, setConfirmService] = useState<ServiceRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const cacheKey = `admin/services?page=${page}`;

  const { data, isLoading, error, mutate } = useSWR<ListResponse>(
    cacheKey,
    () => adminApi.listServices({ page, limit: 20 }) as Promise<ListResponse>,
    { keepPreviousData: true },
  );

  const services = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type, id: Date.now() });
  }

  async function handleDeactivate() {
    if (!confirmService) return;
    setActionLoading(true);
    try {
      await adminApi.deactivateService(confirmService.id);
      await mutate();
      showToast(`"${confirmService.name}" deactivated.`, "success");
      setConfirmService(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Deactivation failed.", "error");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Services</h1>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p role="alert" className="text-sm text-red-600">Failed to load services. Please refresh.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Services table">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs text-gray-500">
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Service</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Stylist</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Category</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Price</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-400">No services found.</td>
                  </tr>
                ) : (
                  services.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-5 py-3 text-gray-600">{s.stylist?.user.name ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-500">{s.category || "—"}</td>
                      <td className="px-5 py-3 text-right text-purple-700 font-semibold">{formatNaira(s.price)}</td>
                      <td className="px-5 py-3"><StatusBadge active={s.isActive} /></td>
                      <td className="px-5 py-3">
                        {s.isActive ? (
                          <button
                            type="button"
                            onClick={() => setConfirmService(s)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                            aria-label={`Deactivate ${s.name}`}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Inactive</span>
                        )}
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
              <p className="text-xs text-gray-500">Page {page} of {totalPages}{data ? ` · ${data.meta.total} total` : ""}</p>
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

      {confirmService && (
        <ConfirmDeactivateModal
          service={confirmService}
          onConfirm={handleDeactivate}
          onCancel={() => setConfirmService(null)}
          loading={actionLoading}
        />
      )}

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
