"use client"

import { Product } from "@/lib/api"
import { EMPTY_FILTERS, Filters, hasActiveFilters } from "@/components/products/filterTypes"
import FilterPanel from "@/components/products/FilterPanel"

export default function FilterSidebar({
  products,
  filters,
  onChange,
}: {
  products: Product[]
  filters: Filters
  onChange: (next: Filters) => void
}) {
  return (
    <aside className="sticky top-24 hidden h-fit w-[260px] shrink-0 rounded-kudl-card border border-kudl-border bg-white p-5 xl:block">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-base font-bold text-kudl-ink">Filters</h2>
        {hasActiveFilters(filters) && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-xs font-semibold text-kudl-primary hover:underline"
          >
            Clear All
          </button>
        )}
      </div>
      <FilterPanel products={products} filters={filters} onChange={onChange} />
    </aside>
  )
}
