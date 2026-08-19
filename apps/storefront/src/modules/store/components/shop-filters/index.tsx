"use client"

import {
  BRAND_OPTIONS,
  PET_FILTERS,
  PRICE_RANGES,
} from "@lib/kudl/config"
import { SlidersHorizontal, X } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"

type CategoryOption = { handle: string; name: string; parentHandle?: string }

/**
 * Pet-store relevant filters (pet, category, brand, price, availability). These
 * replace the starter's generic Color/Size option pickers, which did not match
 * this catalog. Category options come from real Medusa categories.
 */
const ShopFilters = ({
  categories,
  sortBy,
}: {
  categories: CategoryOption[]
  sortBy: string
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)

  const activePet = searchParams.get("pet") ?? ""
  const activeCategory = searchParams.get("category") ?? ""
  const activeBrands = searchParams.getAll("brand")
  const activePrice = searchParams.get("price") ?? ""
  const inStockOnly = searchParams.get("availability") === "in-stock"

  const activeCount =
    (activePet ? 1 : 0) +
    (activeCategory ? 1 : 0) +
    activeBrands.length +
    (activePrice ? 1 : 0) +
    (inStockOnly ? 1 : 0)

  const push = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      mutate(params)
      params.delete("page")

      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [pathname, router, searchParams]
  )

  const setSingle = (key: string, value: string) =>
    push((params) => {
      if (!value || params.get(key) === value) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      // Changing pet invalidates a category chosen under the other pet.
      if (key === "pet") {
        params.delete("category")
      }
    })

  const toggleBrand = (brand: string) =>
    push((params) => {
      const current = params.getAll("brand")
      params.delete("brand")
      const next = current.includes(brand)
        ? current.filter((b) => b !== brand)
        : [...current, brand]
      next.forEach((b) => params.append("brand", b))
    })

  const toggleInStock = () =>
    push((params) => {
      if (params.get("availability") === "in-stock") {
        params.delete("availability")
      } else {
        params.set("availability", "in-stock")
      }
    })

  const clearAll = () =>
    push((params) => {
      ;["pet", "category", "brand", "price", "availability"].forEach((key) =>
        params.delete(key)
      )
    })

  // Only show categories belonging to the selected pet, when one is selected.
  const visibleCategories = activePet
    ? categories.filter((category) => category.parentHandle === activePet)
    : categories

  const groupClass = "border-t border-kudl-border pt-5 first:border-t-0 first:pt-0"
  const legendClass =
    "mb-3 text-xs font-semibold uppercase tracking-wide text-kudl-ink"
  const checkboxClass =
    "h-4 w-4 shrink-0 rounded border-kudl-border text-kudl-primary focus:ring-kudl-primary"
  const rowClass =
    "flex cursor-pointer items-center gap-2.5 py-1 text-sm text-kudl-muted hover:text-kudl-ink"

  const panel = (
    <div className="flex flex-col gap-5">
      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="self-start rounded text-xs font-semibold text-kudl-primary hover:text-kudl-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary"
        >
          Clear all filters ({activeCount})
        </button>
      )}

      {/* Sort lives in the sidebar on mobile, and in the toolbar on desktop. */}
      <fieldset className={`${groupClass} small:hidden`}>
        <legend className={legendClass}>Sort by</legend>
        <div className="flex flex-col">
          {SORT_OPTIONS.map((option) => (
            <label key={option.value} className={rowClass}>
              <input
                type="radio"
                name="sortBy-mobile"
                className={checkboxClass}
                checked={sortBy === option.value}
                onChange={() => setSingle("sortBy", option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={groupClass}>
        <legend className={legendClass}>Pet</legend>
        <div className="flex flex-col">
          {PET_FILTERS.map((pet) => (
            <label key={pet.handle} className={rowClass}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={activePet === pet.handle}
                onChange={() => setSingle("pet", pet.handle)}
              />
              {pet.label}
            </label>
          ))}
        </div>
      </fieldset>

      {visibleCategories.length > 0 && (
        <fieldset className={groupClass}>
          <legend className={legendClass}>Category</legend>
          <div className="flex flex-col">
            {visibleCategories.map((category) => (
              <label key={category.handle} className={rowClass}>
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={activeCategory === category.handle}
                  onChange={() => setSingle("category", category.handle)}
                />
                {category.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className={groupClass}>
        <legend className={legendClass}>Brand</legend>
        <div className="flex flex-col">
          {BRAND_OPTIONS.map((brand) => (
            <label key={brand} className={rowClass}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={activeBrands.includes(brand)}
                onChange={() => toggleBrand(brand)}
              />
              {brand}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={groupClass}>
        <legend className={legendClass}>Price</legend>
        <div className="flex flex-col">
          {PRICE_RANGES.map((range) => (
            <label key={range.key} className={rowClass}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={activePrice === range.key}
                onChange={() => setSingle("price", range.key)}
              />
              {range.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={groupClass}>
        <legend className={legendClass}>Availability</legend>
        <label className={rowClass}>
          <input
            type="checkbox"
            className={checkboxClass}
            checked={inStockOnly}
            onChange={toggleInStock}
          />
          In stock only
        </label>
      </fieldset>
    </div>
  )

  return (
    <>
      {/* Mobile: filter trigger + slide-over */}
      <div className="small:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-kudl-border bg-white px-4 text-sm font-medium text-kudl-ink hover:bg-kudl-light focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filters
          {activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-kudl-primary px-1 text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          )}
        </button>

        {mobileOpen && (
          <div className="fixed inset-0 z-[60]">
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 h-full w-full cursor-default bg-kudl-ink/40"
            />
            <div className="absolute inset-y-0 right-0 flex w-[85%] max-w-sm flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-kudl-border px-4 py-3">
                <h2 className="text-sm font-semibold text-kudl-ink">Filters</h2>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close filters"
                  className="grid h-9 w-9 place-items-center rounded-lg hover:bg-kudl-light focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-5">{panel}</div>
              <div className="border-t border-kudl-border p-4">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="h-11 w-full rounded-lg bg-kudl-primary text-sm font-semibold text-white hover:bg-kudl-dark"
                >
                  Show results
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside
        aria-label="Product filters"
        className="hidden w-[240px] shrink-0 small:block"
      >
        {panel}
      </aside>
    </>
  )
}

export const SORT_OPTIONS = [
  { value: "created_at", label: "Latest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
]

export default ShopFilters
