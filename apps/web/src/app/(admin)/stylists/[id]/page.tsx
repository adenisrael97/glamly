"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { adminApi } from "@/lib/api/admin";
import { Skeleton } from "@/components/ui/Skeleton";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StylistService {
  id: string;
  name: string;
  price: number;
  duration?: number;
  category?: string;
}

interface AuditLog {
  id: string;
  action: string;
  reason?: string;
  createdAt: string;
  actor?: { name: string };
}

interface StylistDetail {
  id: string;
  bio: string;
  specialty: string;
  location: string;
  experienceYears: number;
  tags: string[];
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    createdAt: string;
  };
  services: StylistService[];
  auditLogs?: AuditLog[];
}

type StylistStatus = "APPROVED" | "REJECTED" | "SUSPENDED";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-orange-100 text-orange-800",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
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
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
        toast.type === "success"
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      {toast.message}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-1 opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Confirmation modal ───────────────────────────────────────────────────────

interface ConfirmModalProps {
  action: StylistStatus;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}

const ACTION_LABELS: Record<StylistStatus, { label: string; color: string; description: string }> = {
  APPROVED: { label: "Approve", color: "bg-green-600 hover:bg-green-700 text-white", description: "The stylist will be visible to customers and can receive bookings." },
  REJECTED: { label: "Reject", color: "bg-red-600 hover:bg-red-700 text-white", description: "The stylist's application will be declined." },
  SUSPENDED: { label: "Suspend", color: "bg-orange-500 hover:bg-orange-600 text-white", description: "The stylist will be temporarily unable to accept bookings." },
};

function ConfirmModal({ action, onConfirm, onCancel, loading }: ConfirmModalProps) {
  const [reason, setReason] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const meta = ACTION_LABELS[action];

  useEffect(() => {
    cancelRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div ref={dialogRef} className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <h2 id="modal-title" className="text-base font-bold text-gray-900">
          {meta.label} Stylist?
        </h2>
        <p className="text-sm text-gray-600">{meta.description}</p>
        <div>
          <label htmlFor="modal-reason" className="block text-xs font-medium text-gray-700 mb-1.5">
            Reason {action !== "APPROVED" ? <span className="text-red-500">*</span> : "(optional)"}
          </label>
          <textarea
            id="modal-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={action === "APPROVED" ? "Optional note…" : "Provide a reason…"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </div>
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
            onClick={() => onConfirm(reason)}
            disabled={loading || (action !== "APPROVED" && !reason.trim())}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed ${meta.color}`}
          >
            {loading ? "Saving…" : meta.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 font-medium shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value ?? "—"}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminStylistDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data, isLoading, error, mutate } = useSWR<StylistDetail>(
    `admin/stylists/${id}`,
    () => adminApi.getStylist(id) as Promise<StylistDetail>,
  );

  const [pendingAction, setPendingAction] = useState<StylistStatus | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type, id: Date.now() });
  }

  async function handleAction(reason: string) {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      await adminApi.updateStylistStatus(id, { status: pendingAction, reason: reason || undefined });
      await mutate();
      showToast(`Stylist ${pendingAction.toLowerCase()} successfully.`, "success");
      setPendingAction(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Action failed. Please try again.";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto">
        <p role="alert" className="text-sm text-red-600">
          {error ? "Failed to load stylist details." : "Stylist not found."}
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-3 text-sm text-purple-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          ← Go back
        </button>
      </div>
    );
  }

  const canApprove = data.status !== "APPROVED";
  const canReject = data.status !== "REJECTED";
  const canSuspend = data.status === "APPROVED";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          aria-label="Go back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1 flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{data.user.name}</h1>
          <StatusBadge status={data.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: profile + services */}
        <div className="lg:col-span-2 space-y-5">
          {/* Profile */}
          <section aria-label="Stylist profile" className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Profile</h2>
            <InfoRow label="Specialty" value={data.specialty} />
            <InfoRow label="Location" value={data.location} />
            <InfoRow label="Experience" value={data.experienceYears != null ? `${data.experienceYears} yr${data.experienceYears !== 1 ? "s" : ""}` : undefined} />
            {data.bio && (
              <div className="mt-3 pt-3 border-t border-gray-50">
                <p className="text-xs text-gray-500 font-medium mb-1.5">Bio</p>
                <p className="text-sm text-gray-700 leading-relaxed">{data.bio}</p>
              </div>
            )}
            {data.tags && data.tags.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 font-medium mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Services */}
          <section aria-label="Services" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Services ({data.services?.length ?? 0})</h2>
            </div>
            {!data.services || data.services.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400">No services listed.</p>
            ) : (
              <table className="w-full text-sm" aria-label="Stylist services table">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-xs text-gray-500">
                    <th scope="col" className="px-5 py-3 text-left font-medium">Service</th>
                    <th scope="col" className="px-5 py-3 text-left font-medium">Category</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">Price</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {data.services.map((svc) => (
                    <tr key={svc.id} className="border-b border-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{svc.name}</td>
                      <td className="px-5 py-3 text-gray-500">{svc.category || "—"}</td>
                      <td className="px-5 py-3 text-right text-purple-700 font-semibold">{formatNaira(svc.price)}</td>
                      <td className="px-5 py-3 text-right text-gray-500">{svc.duration ? `${svc.duration} min` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Audit log */}
          {data.auditLogs && data.auditLogs.length > 0 && (
            <section aria-label="Status history" className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Status History</h2>
              <ol className="space-y-3">
                {data.auditLogs.map((log) => (
                  <li key={log.id} className="flex gap-3 text-sm">
                    <span className="text-gray-400 whitespace-nowrap text-xs pt-0.5">{formatDate(log.createdAt)}</span>
                    <div>
                      <span className="font-medium text-gray-900">{log.action}</span>
                      {log.actor && <span className="text-gray-500"> by {log.actor.name}</span>}
                      {log.reason && <p className="text-gray-500 text-xs mt-0.5">{log.reason}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* Right: user info + actions */}
        <div className="space-y-5">
          {/* User info */}
          <section aria-label="User account" className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Account</h2>
            <InfoRow label="Name" value={data.user.name} />
            <InfoRow label="Email" value={data.user.email} />
            {data.user.phone && <InfoRow label="Phone" value={data.user.phone} />}
            <InfoRow label="Joined" value={formatDate(data.user.createdAt)} />
            <InfoRow label="Profile created" value={formatDate(data.createdAt)} />
          </section>

          {/* Actions */}
          <section aria-label="Moderation actions" className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-2.5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Actions</h2>
            {canApprove && (
              <button
                type="button"
                onClick={() => setPendingAction("APPROVED")}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Approve
              </button>
            )}
            {canReject && (
              <button
                type="button"
                onClick={() => setPendingAction("REJECTED")}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Reject
              </button>
            )}
            {canSuspend && (
              <button
                type="button"
                onClick={() => setPendingAction("SUSPENDED")}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                Suspend
              </button>
            )}
            {!canApprove && !canReject && !canSuspend && (
              <p className="text-xs text-gray-400 text-center py-2">No actions available.</p>
            )}
          </section>
        </div>
      </div>

      {/* Confirmation modal */}
      {pendingAction && (
        <ConfirmModal
          action={pendingAction}
          onConfirm={handleAction}
          onCancel={() => setPendingAction(null)}
          loading={actionLoading}
        />
      )}

      {/* Toast */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
