import dynamic from "next/dynamic";

const SearchPage = dynamic(() => import("@/components/Search/Searchpage"), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-purple-600 text-lg font-semibold">Loading stylists...</div>
    </div>
  ),
});

export default function StylistPage() {
  return <SearchPage />;
}
