// Customer dashboard (bookings). Built out in a later phase; the route exists now
// so middleware route-group guarding has a target.
export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900">My bookings</h1>
        <p className="mt-2 text-sm text-gray-500">Loading your dashboard…</p>
      </div>
    </main>
  );
}
