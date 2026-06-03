import Link from "next/link";
import type { BookingDTO, BookingStatus } from "@glamly/shared";
import type { ReactNode } from "react";

export const BOOKING_STATUS_STYLES: Record<BookingStatus, { label: string; cls: string }> = {
  PENDING: { label: "Awaiting payment", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  CONFIRMED: { label: "Confirmed", cls: "bg-green-50 text-green-700 border-green-200" },
  CANCELLED: { label: "Cancelled", cls: "bg-red-50 text-red-700 border-red-200" },
  COMPLETED: { label: "Completed", cls: "bg-purple-50 text-purple-700 border-purple-200" },
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export interface BookingCardProps {
  booking: BookingDTO;
  /** Whose perspective: a customer sees the stylist, a provider sees the customer isn't
   *  available in the DTO, so providers show the service + time and pass actions. */
  perspective?: "customer" | "provider";
  /** Optional action area (e.g. a provider "complete" button). */
  actions?: ReactNode;
  /** When true, wrap the card in a link to the booking detail (customer view). */
  href?: string;
}

export default function BookingCard({ booking, perspective = "customer", actions, href }: BookingCardProps) {
  const status = BOOKING_STATUS_STYLES[booking.status];

  const body = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Show primary service name or first of multiple */}
          <h3 className="font-semibold text-gray-900 truncate">
            {booking.service?.name ?? booking.services?.[0]?.service?.name ?? "Booking"}
          </h3>
          {/* If multiple services, list them as small tags */}
          {booking.services && booking.services.length > 1 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {booking.services.map((line) => (
                <span
                  key={line.id}
                  className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full"
                >
                  {line.service.name}
                </span>
              ))}
            </div>
          )}
          <p className="text-sm text-gray-500 mt-0.5">
            {perspective === "customer"
              ? `with ${booking.stylist.user.name}`
              : (booking.service?.category ?? booking.services?.[0]?.service?.category ?? "Service")}
            {" · "}
            {booking.stylist.location}
          </p>
          <p className="text-sm text-gray-700 mt-2">{formatWhen(booking.startTime)}</p>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border ${status.cls}`}>
          {status.label}
        </span>
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <span className="text-purple-700 font-bold">₦{booking.totalAmount.toLocaleString()}</span>
        {actions}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-2xl">
        {body}
      </Link>
    );
  }
  return body;
}
