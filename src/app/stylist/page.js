import { Suspense } from "react";
import dynamic from "next/dynamic";
import { StylistCardSkeleton } from "@/components/ui/Skeleton";

const SearchPage = dynamic(() => import("@/components/Search/Searchpage"));

function StylistFallback() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="h-10 bg-gray-200 animate-pulse rounded-xl max-w-xl" />
          <div className="flex gap-2 mt-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-7 w-24 bg-gray-200 animate-pulse rounded-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <StylistCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StylistPage() {
  return (
    <Suspense fallback={<StylistFallback />}>
      <SearchPage />
    </Suspense>
  );
}
