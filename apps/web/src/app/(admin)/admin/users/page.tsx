"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import { adminApi } from "@/lib/api/admin";
import { Skeleton } from "@/components/ui/Skeleton";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  deletedAt?: string | null;
  createdAt: string;
  _count?: { bookings: number };
}

interface ListResponse {
  items: UserRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

type ModalAction =
  | { type: "change-role"; user: UserRow }
  | { type: "delete"; user: UserRow };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-800",
  STYLIST: "bg-blue-100 text-blue-800",
  USER: "bg-gray-100 text-gray-700",
};


function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_STYLES[role] ?? "bg-gray-100 text-gray-700"}`}>
      {role.toLowerCase()}
    </span>
  );
}

function StatusBadge({ deletedAt }: { deletedAt?: string | null }) {
  const active = !deletedAt;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
      {active ? "Active" : "Deleted"}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
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

// ─── Modal ────────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = ["USER", "STYLIST", "ADMIN"];

function ActionModal({
  action,
  onClose,
  onConfirm,
  loading,
}: {
  action: ModalAction;
  onClose: () => void;
  onConfirm: (value?: string) => void;
  loading: boolean;
}) {
  const [newRole, setNewRole] = useState(action.type === "change-role" ? action.user.role : "");
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), select, [tabindex]:not([tabindex="-1"])',
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
  }, [onClose]);

  const isDelete = action.type === "delete";
  const userName = action.user.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <h2 id="user-modal-title" className="text-base font-bold text-gray-900">
          {isDelete ? `Delete "${userName}"?` : `Change role for "${userName}"`}
        </h2>
        {isDelete ? (
          <p className="text-sm text-gray-600">
            This will soft-delete the account. The user will be signed out and their data retained for compliance purposes.
          </p>
        ) : (
          <div>
            <label htmlFor="role-select" className="block text-xs font-medium text-gray-700 mb-1.5">New role</label>
            <select
              id="role-select"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex gap-3 justify-end pt-1">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(isDelete ? undefined : newRole)}
            disabled={loading || (!isDelete && newRole === action.user.role)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed ${
              isDelete ? "bg-red-600 hover:bg-red-700 text-white" : "bg-purple-600 hover:bg-purple-700 text-white"
            }`}
          >
            {loading ? "Saving…" : isDelete ? "Delete" : "Save"}
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
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modal, setModal] = useState<ModalAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const params: Record<string, string | number> = { page, limit: 20 };
  if (debouncedSearch) params.search = debouncedSearch;

  const cacheKey = `admin/users?page=${page}&search=${debouncedSearch}`;

  const { data, isLoading, error, mutate } = useSWR<ListResponse>(
    cacheKey,
    () => adminApi.listUsers(params) as Promise<ListResponse>,
    { keepPreviousData: true },
  );

  const users = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type, id: Date.now() });
  }

  async function handleModalConfirm(value?: string) {
    if (!modal) return;
    setActionLoading(true);
    try {
      if (modal.type === "delete") {
        await adminApi.deleteUser(modal.user.id);
        showToast("User deleted.", "success");
      } else if (modal.type === "change-role" && value) {
        await adminApi.changeUserRole(modal.user.id, value);
        showToast("Role updated.", "success");
      }
      await mutate();
      setModal(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.", "error");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <div className="relative max-w-xs w-full">
          <label htmlFor="user-search" className="sr-only">Search users</label>
          <input
            id="user-search"
            type="search"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400"
          />
          <svg
            className="absolute left-2.5 top-2.5 text-gray-400 pointer-events-none"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p role="alert" className="text-sm text-red-600">Failed to load users. Please refresh.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Users table">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs text-gray-500">
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Name</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Email</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Role</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Joined</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Bookings</th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                      {debouncedSearch ? `No users match "${debouncedSearch}".` : "No users found."}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{u.name}</td>
                      <td className="px-5 py-3 text-gray-500 max-w-[12rem] truncate">{u.email}</td>
                      <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                      <td className="px-5 py-3"><StatusBadge deletedAt={u.deletedAt} /></td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                      <td className="px-5 py-3 text-right text-gray-600">{u._count?.bookings ?? 0}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setModal({ type: "change-role", user: u })}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                            aria-label={`Change role for ${u.name}`}
                          >
                            Role
                          </button>
                          <button
                            type="button"
                            onClick={() => setModal({ type: "delete", user: u })}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                            aria-label={`Delete ${u.name}`}
                          >
                            Delete
                          </button>
                        </div>
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

      {modal && (
        <ActionModal
          action={modal}
          onClose={() => setModal(null)}
          onConfirm={handleModalConfirm}
          loading={actionLoading}
        />
      )}

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
