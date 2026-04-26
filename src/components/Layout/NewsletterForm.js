"use client";

export default function NewsletterForm() {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Newsletter</p>
      <form
        className="flex"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          type="email"
          placeholder="your@email.com"
          className="flex-1 min-w-0 px-3 py-2 rounded-l-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all"
        />
        <button
          type="submit"
          className="px-3 py-2 rounded-r-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors shrink-0"
        >
          →
        </button>
      </form>
      <p className="text-xs text-gray-600 mt-1.5">Beauty tips & exclusive offers.</p>
    </div>
  );
}
