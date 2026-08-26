import { SearchX } from "@/components/icons"

export default function EmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center px-8 py-20 text-center">
      <SearchX className="h-12 w-12 text-kudl-hairline" aria-hidden="true" />
      <p className="mt-3 text-lg font-bold text-kudl-body">No products found</p>
      <p className="mt-1 text-[13px] text-kudl-muted">
        Try adjusting your filters or search term.
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-5 rounded-full bg-kudl-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-kudl-dark"
      >
        Clear All Filters
      </button>
    </div>
  )
}
