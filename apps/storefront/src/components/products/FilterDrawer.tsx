"use client"

/**
 * Mobile filter drawer — slides in from the bottom as a near-full-height
 * sheet. Filters apply live (same as the desktop sidebar) so the shopper
 * sees the result count update behind the sheet as they check boxes; the
 * footer buttons exist to close the sheet, not to gate an "apply" step.
 */

import { Product } from "@/lib/api"
import { X } from "@/components/icons"
import { EMPTY_FILTERS, Filters, hasActiveFilters } from "@/components/products/filterTypes"
import FilterPanel from "@/components/products/FilterPanel"

export default function FilterDrawer({
  open,
  onClose,
  products,
  filters,
  onChange,
  resultCount,
}: {
  open: boolean
  onClose: () => void
  products: Product[]
  filters: Filters
  onChange: (next: Filters) => void
  resultCount: number
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end xl:hidden">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[85vh] flex-col rounded-t-kudl-hero bg-white">
        <div className="flex items-center justify-between border-b border-kudl-divider px-5 py-4">
          <h2 className="text-base font-bold text-kudl-ink">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-8 w-8 items-center justify-center rounded-full text-kudl-muted hover:bg-kudl-surface"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2">
          <FilterPanel products={products} filters={filters} onChange={onChange} />
        </div>

        <div className="flex items-center gap-3 border-t border-kudl-divider px-5 py-4">
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            disabled={!hasActiveFilters(filters)}
            className="flex-1 rounded-full border border-kudl-hairline py-3 text-sm font-semibold text-kudl-body disabled:opacity-40"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-kudl-primary py-3 text-sm font-semibold text-white hover:bg-kudl-dark"
          >
            Show {resultCount} {resultCount === 1 ? "Result" : "Results"}
          </button>
        </div>
      </div>
    </div>
  )
}
