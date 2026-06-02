// Stylist provider dashboard. Built out in a later phase; the route exists now so
// middleware can guard the (stylist) group.
export default function StudioPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900">Studio</h1>
        <p className="mt-2 text-sm text-gray-500">Loading your studio…</p>
      </div>
    </main>
  );
}
