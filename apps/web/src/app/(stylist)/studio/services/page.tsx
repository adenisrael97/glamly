"use client";

import { useState, type FormEvent } from "react";
import useSWR from "swr";
import type { PaginatedResult, ServiceDTO } from "@glamly/shared";
import { stylistMeApi, type CreateServiceInput, type UpdateServiceInput } from "@/lib/api/stylist-me";
import { useAuth } from "@/context/AuthContext";
import Input, { Textarea, Select } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_CATEGORIES = ["Hair", "Makeup", "Nails", "Eyes", "Other"] as const;

type Category = (typeof SERVICE_CATEGORIES)[number];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ServiceRowSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse flex gap-4">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-1/4" />
      </div>
      <div className="h-4 bg-gray-200 rounded w-16" />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
      <p className="text-gray-500 mb-4">No services yet.</p>
      <Button size="sm" onClick={onAdd}>
        Add your first service
      </Button>
    </div>
  );
}

// ─── Service form ─────────────────────────────────────────────────────────────

interface ServiceFormValues {
  name: string;
  category: Category;
  price: string;
  duration: string;
  description: string;
  imageUrl: string;
}

const EMPTY_FORM: ServiceFormValues = {
  name: "",
  category: "Hair",
  price: "",
  duration: "",
  description: "",
  imageUrl: "",
};

function serviceToForm(s: ServiceDTO): ServiceFormValues {
  return {
    name: s.name,
    category: (SERVICE_CATEGORIES.includes(s.category as Category)
      ? s.category
      : "Other") as Category,
    price: String(s.price),
    duration: String(s.duration),
    description: s.description ?? "",
    imageUrl: s.imageUrl ?? "",
  };
}

interface ServiceFormProps {
  initial?: ServiceFormValues;
  onSubmit: (values: ServiceFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

function ServiceForm({ initial = EMPTY_FORM, onSubmit, onCancel, submitLabel }: ServiceFormProps) {
  const [values, setValues] = useState<ServiceFormValues>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof ServiceFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Service name"
          required
          value={values.name}
          onChange={set("name")}
          placeholder="e.g. Box Braids"
        />
        <Select label="Category" required value={values.category} onChange={set("category")}>
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Input
          label="Price (₦)"
          type="number"
          min={1}
          required
          value={values.price}
          onChange={set("price")}
          placeholder="e.g. 15000"
        />
        <Input
          label="Duration (minutes)"
          type="number"
          min={1}
          required
          value={values.duration}
          onChange={set("duration")}
          placeholder="e.g. 120"
        />
      </div>

      <Textarea
        label="Description"
        rows={3}
        value={values.description}
        onChange={set("description")}
        placeholder="Describe this service…"
      />

      <Input
        label="Image URL (optional)"
        type="url"
        value={values.imageUrl}
        onChange={set("imageUrl")}
        placeholder="https://…"
      />

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" loading={busy}>
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Service row ──────────────────────────────────────────────────────────────

interface ServiceRowProps {
  service: ServiceDTO;
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onSaveEdit: (id: string, values: ServiceFormValues) => Promise<void>;
  onCancelEdit: () => void;
  onDeactivate: (id: string) => void;
  confirmingId: string | null;
  onConfirmDeactivate: (id: string) => Promise<void>;
  onCancelDeactivate: () => void;
}

function ServiceRow({
  service,
  editingId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeactivate,
  confirmingId,
  onConfirmDeactivate,
  onCancelDeactivate,
}: ServiceRowProps) {
  const isEditing = editingId === service.id;
  const isConfirming = confirmingId === service.id;

  if (isEditing) {
    return (
      <li className="flex flex-col gap-3">
        <ServiceForm
          initial={serviceToForm(service)}
          onSubmit={(v) => onSaveEdit(service.id, v)}
          onCancel={onCancelEdit}
          submitLabel="Save changes"
        />
      </li>
    );
  }

  return (
    <li className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{service.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {service.category} &middot; {service.duration} min
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-purple-700 text-sm">
            ₦{service.price.toLocaleString("en-NG")}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              service.isActive
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {service.isActive ? "Active" : "Inactive"}
          </span>
          <button
            type="button"
            onClick={() => onStartEdit(service.id)}
            className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDeactivate(service.id)}
            className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Deactivate
          </button>
        </div>
      </div>

      {/* Inline deactivation confirmation */}
      {isConfirming && (
        <div className="px-4 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <p className="flex-1 text-sm text-red-700">
              Deactivate &ldquo;{service.name}&rdquo;? Customers won&rsquo;t be able to book it.
            </p>
            <button
              type="button"
              onClick={() => void onConfirmDeactivate(service.id)}
              className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Yes, deactivate
            </button>
            <button
              type="button"
              onClick={onCancelDeactivate}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const { status } = useAuth();
  const enabled = status === "authenticated";

  const { data, isLoading, mutate } = useSWR<PaginatedResult<ServiceDTO>>(
    enabled ? "stylist-me-services" : null,
    () => stylistMeApi.listServices(),
    { keepPreviousData: true, revalidateOnFocus: true },
  );

  const services = data?.items ?? [];

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAdd = async (values: ServiceFormValues) => {
    setAddError(null);
    const input: CreateServiceInput = {
      name: values.name.trim(),
      category: values.category,
      price: Number(values.price),
      duration: Number(values.duration),
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
      ...(values.imageUrl.trim() ? { imageUrl: values.imageUrl.trim() } : {}),
    };
    await stylistMeApi.createService(input);
    await mutate();
    setShowAddForm(false);
  };

  const handleSaveEdit = async (id: string, values: ServiceFormValues) => {
    const input: UpdateServiceInput = {
      name: values.name.trim(),
      category: values.category,
      price: Number(values.price),
      duration: Number(values.duration),
      description: values.description.trim() || undefined,
      imageUrl: values.imageUrl.trim() || undefined,
    };
    await stylistMeApi.updateService(id, input);
    await mutate();
    setEditingId(null);
  };

  const handleConfirmDeactivate = async (id: string) => {
    await stylistMeApi.deactivateService(id);
    await mutate();
    setConfirmingId(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {services.length} service{services.length !== 1 ? "s" : ""}
          </p>
        </div>
        {!showAddForm && (
          <Button
            size="sm"
            onClick={() => {
              setShowAddForm(true);
              setEditingId(null);
            }}
          >
            + Add service
          </Button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-5">
          {addError && (
            <p role="alert" className="text-sm text-red-600 mb-2">
              {addError}
            </p>
          )}
          <ServiceForm
            onSubmit={handleAdd}
            onCancel={() => {
              setShowAddForm(false);
              setAddError(null);
            }}
            submitLabel="Create service"
          />
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <ul aria-label="Loading services" className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <ServiceRowSkeleton />
            </li>
          ))}
        </ul>
      ) : services.length === 0 && !showAddForm ? (
        <EmptyState onAdd={() => setShowAddForm(true)} />
      ) : (
        <ul aria-label="Your services" className="space-y-3">
          {services.map((svc) => (
            <ServiceRow
              key={svc.id}
              service={svc}
              editingId={editingId}
              onStartEdit={(id) => {
                setEditingId(id);
                setShowAddForm(false);
                setConfirmingId(null);
              }}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => setEditingId(null)}
              onDeactivate={(id) => {
                setConfirmingId(id);
                setEditingId(null);
              }}
              confirmingId={confirmingId}
              onConfirmDeactivate={handleConfirmDeactivate}
              onCancelDeactivate={() => setConfirmingId(null)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
