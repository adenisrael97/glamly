"use client";

import { useState, type FormEvent } from "react";
import useSWR from "swr";
import type { PackageDTO, PaginatedResult, ServiceDTO } from "@glamly/shared";
import { stylistMeApi, type CreatePackageInput, type UpdatePackageInput } from "@/lib/api/stylist-me";
import { useAuth } from "@/context/AuthContext";
import Input, { Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PackageCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="h-3 bg-gray-100 rounded w-1/4" />
    </div>
  );
}

// ─── Service multi-select ─────────────────────────────────────────────────────

function ServiceCheckboxGroup({
  services,
  selected,
  onChange,
}: {
  services: ServiceDTO[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id],
    );
  };

  if (services.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">
        No active services found. Add services first.
      </p>
    );
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-gray-700 mb-2">
        Included services <span className="text-red-500">*</span>
      </legend>
      <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
        {services.map((svc) => (
          <label
            key={svc.id}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={selected.includes(svc.id)}
              onChange={() => toggle(svc.id)}
              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-400"
            />
            <span className="text-sm text-gray-800">
              {svc.name}
              <span className="text-gray-400 ml-1">
                &middot; ₦{svc.price.toLocaleString("en-NG")} &middot; {svc.duration} min
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ─── Package form ─────────────────────────────────────────────────────────────

interface PackageFormValues {
  name: string;
  price: string;
  duration: string;
  description: string;
  serviceIds: string[];
}

const EMPTY_FORM: PackageFormValues = {
  name: "",
  price: "",
  duration: "",
  description: "",
  serviceIds: [],
};

function pkgToForm(p: PackageDTO): PackageFormValues {
  return {
    name: p.name,
    price: String(p.price),
    duration: String(p.duration),
    description: p.description ?? "",
    serviceIds: p.services.map((s) => s.id),
  };
}

interface PackageFormProps {
  initial?: PackageFormValues;
  ownServices: ServiceDTO[];
  onSubmit: (values: PackageFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

function PackageForm({
  initial = EMPTY_FORM,
  ownServices,
  onSubmit,
  onCancel,
  submitLabel,
}: PackageFormProps) {
  const [values, setValues] = useState<PackageFormValues>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (field: Exclude<keyof PackageFormValues, "serviceIds">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (values.serviceIds.length === 0) {
      setError("Please select at least one service.");
      return;
    }
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
          label="Package name"
          required
          value={values.name}
          onChange={set("name")}
          placeholder="e.g. Full Glam Package"
          className="sm:col-span-2"
        />
        <Input
          label="Price (₦)"
          type="number"
          min={1}
          required
          value={values.price}
          onChange={set("price")}
          placeholder="e.g. 25000"
        />
        <Input
          label="Duration (minutes)"
          type="number"
          min={1}
          required
          value={values.duration}
          onChange={set("duration")}
          placeholder="e.g. 180"
        />
      </div>

      <Textarea
        label="Description"
        rows={3}
        value={values.description}
        onChange={set("description")}
        placeholder="Describe what's included…"
      />

      <ServiceCheckboxGroup
        services={ownServices}
        selected={values.serviceIds}
        onChange={(ids) => setValues((v) => ({ ...v, serviceIds: ids }))}
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

// ─── Package card ─────────────────────────────────────────────────────────────

interface PackageCardProps {
  pkg: PackageDTO;
  editingId: string | null;
  ownServices: ServiceDTO[];
  onStartEdit: (id: string) => void;
  onSaveEdit: (id: string, values: PackageFormValues) => Promise<void>;
  onCancelEdit: () => void;
  onDeactivate: (id: string) => void;
  confirmingId: string | null;
  onConfirmDeactivate: (id: string) => Promise<void>;
  onCancelDeactivate: () => void;
}

function PackageCard({
  pkg,
  editingId,
  ownServices,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeactivate,
  confirmingId,
  onConfirmDeactivate,
  onCancelDeactivate,
}: PackageCardProps) {
  const isEditing = editingId === pkg.id;
  const isConfirming = confirmingId === pkg.id;

  if (isEditing) {
    return (
      <li>
        <PackageForm
          initial={pkgToForm(pkg)}
          ownServices={ownServices}
          onSubmit={(v) => onSaveEdit(pkg.id, v)}
          onCancel={onCancelEdit}
          submitLabel="Save changes"
        />
      </li>
    );
  }

  return (
    <li className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">{pkg.name}</p>
            {pkg.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{pkg.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">{pkg.duration} min</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-bold text-purple-700 text-sm">
              ₦{pkg.price.toLocaleString("en-NG")}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                pkg.isActive
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {pkg.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {pkg.services.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Included services">
            {pkg.services.map((s) => (
              <span
                key={s.id}
                className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full"
              >
                {s.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => onStartEdit(pkg.id)}
            className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDeactivate(pkg.id)}
            className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Deactivate
          </button>
        </div>
      </div>

      {isConfirming && (
        <div className="px-5 pb-5">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <p className="flex-1 text-sm text-red-700">
              Deactivate &ldquo;{pkg.name}&rdquo;?
            </p>
            <button
              type="button"
              onClick={() => void onConfirmDeactivate(pkg.id)}
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

export default function PackagesPage() {
  const { status } = useAuth();
  const enabled = status === "authenticated";

  const { data: packagesData, isLoading: pkgLoading, mutate: mutatePkgs } = useSWR<
    PaginatedResult<PackageDTO>
  >(enabled ? "stylist-me-packages" : null, () => stylistMeApi.listPackages(), {
    keepPreviousData: true,
    revalidateOnFocus: true,
  });

  // Also fetch own services so the form's multi-select has options.
  const { data: servicesData } = useSWR<PaginatedResult<ServiceDTO>>(
    enabled ? "stylist-me-services" : null,
    () => stylistMeApi.listServices(),
    { revalidateOnFocus: false, dedupingInterval: 10000 },
  );

  const packages = packagesData?.items ?? [];
  const ownServices = (servicesData?.items ?? []).filter((s) => s.isActive);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleCreate = async (values: PackageFormValues) => {
    const input: CreatePackageInput = {
      name: values.name.trim(),
      price: Number(values.price),
      duration: Number(values.duration),
      serviceIds: values.serviceIds,
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
    };
    await stylistMeApi.createPackage(input);
    await mutatePkgs();
    setShowAddForm(false);
  };

  const handleSaveEdit = async (id: string, values: PackageFormValues) => {
    const input: UpdatePackageInput = {
      name: values.name.trim(),
      price: Number(values.price),
      duration: Number(values.duration),
      serviceIds: values.serviceIds,
      description: values.description.trim() || undefined,
    };
    await stylistMeApi.updatePackage(id, input);
    await mutatePkgs();
    setEditingId(null);
  };

  const handleConfirmDeactivate = async (id: string) => {
    await stylistMeApi.deactivatePackage(id);
    await mutatePkgs();
    setConfirmingId(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Packages</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {packages.length} package{packages.length !== 1 ? "s" : ""}
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
            + Create package
          </Button>
        )}
      </div>

      {/* Create form */}
      {showAddForm && (
        <div className="mb-5">
          <PackageForm
            ownServices={ownServices}
            onSubmit={handleCreate}
            onCancel={() => setShowAddForm(false)}
            submitLabel="Create package"
          />
        </div>
      )}

      {/* List */}
      {pkgLoading ? (
        <ul aria-label="Loading packages" className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i}>
              <PackageCardSkeleton />
            </li>
          ))}
        </ul>
      ) : packages.length === 0 && !showAddForm ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-500 mb-4">No packages yet.</p>
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            Create your first package
          </Button>
        </div>
      ) : (
        <ul aria-label="Your packages" className="space-y-3">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              editingId={editingId}
              ownServices={ownServices}
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
