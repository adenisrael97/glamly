"use client";

import useSWR from "swr";
import { adminApi } from "@/lib/api/admin";
import { Skeleton } from "@/components/ui/Skeleton";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RevenueMonth {
  year: number;
  month: number; // 1-12
  revenue: number;
}

interface TopStylist {
  stylistId: string;
  name: string;
  bookings: number;
  revenue: number;
}

interface RecentBooking {
  id: string;
  user: { name: string };
  stylist: { specialty: string; user: { name: string } };
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface AnalyticsData {
  totalUsers: number;
  totalStylists: number;
  pendingApprovals: number;
  totalRevenue: number;
  totalBookings: number;
  revenueByMonth: RevenueMonth[];
  topStylists: TopStylist[];
  recentBookings: RecentBooking[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-orange-100 text-orange-800",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`mt-1.5 text-2xl font-extrabold ${accent ?? "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <Skeleton className="h-3 w-24 mb-2" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

// ─── Revenue bar chart (pure SVG) ─────────────────────────────────────────────

function RevenueChart({ data }: { data: RevenueMonth[] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400 py-6 text-center">No revenue data available.</p>;
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const chartHeight = 140;
  const barWidth = 36;
  const gap = 14;
  const paddingLeft = 52;
  const paddingBottom = 28;
  const paddingTop = 10;
  const chartWidth = paddingLeft + data.length * (barWidth + gap);
  const innerHeight = chartHeight - paddingBottom - paddingTop;

  // Y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: Math.round(maxRevenue * t),
    y: paddingTop + innerHeight - innerHeight * t,
  }));

  function shortMonth(year: number, month: number) {
    try {
      return new Date(year, month - 1, 1).toLocaleDateString("en-NG", { month: "short" });
    } catch {
      return String(month);
    }
  }

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Revenue bar chart for the last 6 months"
        width={chartWidth + 16}
        height={chartHeight + 8}
        className="min-w-0"
      >
        {/* Y-axis gridlines and labels */}
        {ticks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={paddingLeft - 6}
              y1={tick.y}
              x2={chartWidth}
              y2={tick.y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text
              x={paddingLeft - 10}
              y={tick.y + 4}
              textAnchor="end"
              fontSize="9"
              fill="#9ca3af"
            >
              {tick.value >= 1000 ? `${(tick.value / 1000).toFixed(0)}k` : tick.value}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const x = paddingLeft + i * (barWidth + gap);
          const barH = Math.max(2, (d.revenue / maxRevenue) * innerHeight);
          const y = paddingTop + innerHeight - barH;

          return (
            <g key={`${d.year}-${d.month}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx="4"
                fill="#7c3aed"
                opacity="0.85"
              >
                <title>{`${shortMonth(d.year, d.month)}: ${formatNaira(d.revenue)}`}</title>
              </rect>
              <text
                x={x + barWidth / 2}
                y={chartHeight - paddingBottom + 14}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {shortMonth(d.year, d.month)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useSWR<AnalyticsData>(
    "admin/analytics",
    () => adminApi.getAnalytics() as Promise<AnalyticsData>,
    { revalidateOnFocus: false },
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      {/* Stat cards */}
      <section aria-label="Key metrics">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <p role="alert" className="text-sm text-red-600">Failed to load analytics. Please refresh.</p>
        ) : data ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard label="Total Users" value={data.totalUsers.toLocaleString()} />
            <StatCard label="Total Stylists" value={data.totalStylists.toLocaleString()} />
            <StatCard label="Pending Approvals" value={data.pendingApprovals} accent={data.pendingApprovals > 0 ? "text-yellow-600" : "text-gray-900"} />
            <StatCard label="Total Revenue" value={formatNaira(data.totalRevenue)} accent="text-purple-700" />
            <StatCard label="Total Bookings" value={data.totalBookings.toLocaleString()} />
          </div>
        ) : null}
      </section>

      {/* Revenue chart */}
      <section aria-label="Revenue overview" className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Revenue — last 6 months</h2>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : data?.revenueByMonth ? (
          <RevenueChart data={data.revenueByMonth.slice(-6)} />
        ) : null}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top stylists */}
        <section aria-label="Top stylists" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Top 5 Stylists</h2>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Top stylists table">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th scope="col" className="px-5 py-3 text-left font-medium">#</th>
                    <th scope="col" className="px-5 py-3 text-left font-medium">Name</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">Bookings</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topStylists ?? []).map((s, i) => (
                    <tr key={s.stylistId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-5 py-3 text-right text-gray-600">{s.bookings}</td>
                      <td className="px-5 py-3 text-right text-purple-700 font-semibold">{formatNaira(s.revenue)}</td>
                    </tr>
                  ))}
                  {(data?.topStylists ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-gray-400 text-sm">No data yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent bookings */}
        <section aria-label="Recent bookings" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Recent Bookings</h2>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Recent bookings table">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th scope="col" className="px-5 py-3 text-left font-medium">User</th>
                    <th scope="col" className="px-5 py-3 text-left font-medium">Stylist</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">Amount</th>
                    <th scope="col" className="px-5 py-3 text-left font-medium">Status</th>
                    <th scope="col" className="px-5 py-3 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentBookings ?? []).slice(0, 10).map((b) => (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-900 max-w-[8rem] truncate">{b.user.name}</td>
                      <td className="px-5 py-3 text-gray-600 max-w-[8rem] truncate">{b.stylist.user.name}</td>
                      <td className="px-5 py-3 text-right text-purple-700 font-semibold">{formatNaira(b.totalAmount)}</td>
                      <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(b.createdAt)}</td>
                    </tr>
                  ))}
                  {(data?.recentBookings ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-gray-400 text-sm">No bookings yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
