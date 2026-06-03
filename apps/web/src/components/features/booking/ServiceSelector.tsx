"use client";

import type { PackageDTO, StylistServiceSummary } from "@glamly/shared";

export interface ServiceSelectorProps {
  services: StylistServiceSummary[];
  packages: PackageDTO[];
  selectedServiceIds: string[];
  selectedPackageId?: string;
  onServicesChange: (ids: string[]) => void;
  onPackageChange: (id: string | undefined) => void;
}

function ServiceIcon({ name, category }: { name: string; category: string }) {
  const ICONS: Record<string, string> = {
    Hair: "💇‍♀️",
    Makeup: "💄",
    Nail: "💅",
    Barber: "✂️",
    Braid: "🪢",
    Lash: "👁️",
    Skin: "✨",
    Wax: "🌸",
  };
  const icon =
    Object.entries(ICONS).find(([k]) => name.includes(k) || category.includes(k))?.[1] ?? "✨";
  return <span aria-hidden="true">{icon}</span>;
}

export function ServiceSelector({
  services,
  packages,
  selectedServiceIds,
  selectedPackageId,
  onServicesChange,
  onPackageChange,
}: ServiceSelectorProps) {
  const totalServicePrice = services
    .filter((s) => selectedServiceIds.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  const totalDuration = services
    .filter((s) => selectedServiceIds.includes(s.id))
    .reduce((sum, s) => sum + s.duration, 0);

  const selectedPackage = packages.find((p) => p.id === selectedPackageId);

  const runningTotal = selectedPackageId && selectedPackage
    ? selectedPackage.price
    : totalServicePrice;

  const runningDuration = selectedPackageId && selectedPackage
    ? selectedPackage.duration
    : totalDuration;

  function toggleService(id: string) {
    // Clear package selection when picking individual services
    if (selectedPackageId) {
      onPackageChange(undefined);
    }
    if (selectedServiceIds.includes(id)) {
      onServicesChange(selectedServiceIds.filter((s) => s !== id));
    } else {
      onServicesChange([...selectedServiceIds, id]);
    }
  }

  function selectPackage(id: string) {
    if (selectedPackageId === id) {
      // Toggle off
      onPackageChange(undefined);
    } else {
      // Clear individual services and pick package
      onServicesChange([]);
      onPackageChange(id);
    }
  }

  const hasSelection = selectedServiceIds.length > 0 || !!selectedPackageId;

  return (
    <div className="flex flex-col gap-5">
      {/* Services grid */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Services
          {selectedServiceIds.length > 0 && (
            <span className="ml-2 text-xs font-medium text-purple-600 normal-case tracking-normal">
              {selectedServiceIds.length} selected
            </span>
          )}
        </h3>
        {services.length === 0 ? (
          <p className="text-sm text-gray-400">No services listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {services.map((svc) => {
              const selected = selectedServiceIds.includes(svc.id);
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => toggleService(svc.id)}
                  aria-pressed={selected}
                  className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-150 ${
                    selected
                      ? "border-purple-500 bg-purple-50 ring-1 ring-purple-300"
                      : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/30"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-lg shrink-0 shadow-sm">
                    <ServiceIcon name={svc.name} category={svc.category} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{svc.name}</p>
                    <p className="text-xs text-gray-400">{svc.duration} min · {svc.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-purple-700">₦{svc.price.toLocaleString()}</p>
                    {selected && (
                      <span className="text-xs text-purple-600 font-medium">✓ Added</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Packages section */}
      {packages.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Packages</h3>
            <span className="text-xs text-gray-400">— save more, book a bundle</span>
          </div>
          <div className="flex flex-col gap-2">
            {packages.filter((p) => p.isActive).map((pkg) => {
              const selected = selectedPackageId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => selectPackage(pkg.id)}
                  aria-pressed={selected}
                  className={`flex items-start justify-between gap-4 p-4 rounded-xl border text-left transition-all duration-150 ${
                    selected
                      ? "border-purple-500 bg-purple-50 ring-1 ring-purple-300"
                      : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/30"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-gray-900">{pkg.name}</p>
                      <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-semibold">
                        Package
                      </span>
                    </div>
                    {pkg.description && (
                      <p className="text-xs text-gray-500 mb-2">{pkg.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {pkg.services.map((s) => (
                        <span
                          key={s.id}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">{pkg.duration} min total</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-extrabold text-purple-700">
                      ₦{pkg.price.toLocaleString()}
                    </p>
                    {selected && (
                      <span className="text-xs text-purple-600 font-medium">✓ Selected</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Running total */}
      {hasSelection && (
        <div className="flex items-center justify-between px-4 py-3 bg-purple-900 text-white rounded-xl shadow-md">
          <div>
            <p className="text-xs text-purple-200">
              {selectedPackageId
                ? "Package selected"
                : `${selectedServiceIds.length} service${selectedServiceIds.length !== 1 ? "s" : ""} selected`}
            </p>
            <p className="text-xs text-purple-300 mt-0.5">{runningDuration} min estimated</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-purple-300">Total</p>
            <p className="text-xl font-extrabold">₦{runningTotal.toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
