"use client"

import { X } from "@/components/icons"
import { BREEDS } from "@/lib/homeContent"
import { catsMenu, dogsMenu, findItemLabel, pharmacyMenu } from "@/lib/taxonomy"
import {
  CATEGORY_OPTIONS,
  EMPTY_FILTERS,
  Filters,
  PET_TYPE_OPTIONS,
  PRICE_RANGES,
} from "@/components/products/filterTypes"

interface Chip {
  key: string
  label: string
  remove: () => void
}

export default function FilterChips({
  filters,
  onChange,
}: {
  filters: Filters
  onChange: (next: Filters) => void
}) {
  const chips: Chip[] = []

  for (const value of filters.petType) {
    const label = PET_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
    chips.push({
      key: `pet-${value}`,
      label,
      remove: () => onChange({ ...filters, petType: filters.petType.filter((v) => v !== value) }),
    })
  }

  for (const value of filters.category) {
    const label = CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value
    chips.push({
      key: `cat-${value}`,
      label,
      remove: () => onChange({ ...filters, category: filters.category.filter((v) => v !== value) }),
    })
  }

  for (const slug of filters.subcategory) {
    const label = findItemLabel(dogsMenu, slug) ?? findItemLabel(catsMenu, slug) ?? slug
    chips.push({
      key: `sub-${slug}`,
      label,
      remove: () =>
        onChange({ ...filters, subcategory: filters.subcategory.filter((v) => v !== slug) }),
    })
  }

  for (const slug of filters.pharmacyCategory) {
    const label = findItemLabel(pharmacyMenu, slug) ?? slug
    chips.push({
      key: `pharmacy-${slug}`,
      label,
      remove: () =>
        onChange({
          ...filters,
          pharmacyCategory: filters.pharmacyCategory.filter((v) => v !== slug),
        }),
    })
  }

  if (filters.pharmacyOnly) {
    chips.push({
      key: "pharmacy-only",
      label: "Pharmacy",
      remove: () => onChange({ ...filters, pharmacyOnly: false }),
    })
  }

  for (const slug of filters.breed) {
    const label = BREEDS.find((b) => b.slug === slug)?.name ?? slug
    chips.push({
      key: `breed-${slug}`,
      label,
      remove: () => onChange({ ...filters, breed: filters.breed.filter((v) => v !== slug) }),
    })
  }

  for (const brand of filters.brand) {
    chips.push({
      key: `brand-${brand}`,
      label: brand,
      remove: () => onChange({ ...filters, brand: filters.brand.filter((v) => v !== brand) }),
    })
  }

  if (filters.priceRange) {
    const range = PRICE_RANGES.find((r) => r.id === filters.priceRange)
    if (range) {
      chips.push({
        key: "price",
        label: range.label,
        remove: () => onChange({ ...filters, priceRange: null }),
      })
    }
  }

  if (filters.minRating) {
    chips.push({
      key: "rating",
      label: `${filters.minRating}★ & up`,
      remove: () => onChange({ ...filters, minRating: null }),
    })
  }

  if (filters.inStockOnly) {
    chips.push({
      key: "stock",
      label: "In Stock Only",
      remove: () => onChange({ ...filters, inStockOnly: false }),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="no-scrollbar mb-4 flex items-center gap-2 overflow-x-auto">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="flex shrink-0 items-center gap-1 rounded-full bg-kudl-tint px-3 py-1 text-sm text-kudl-primary transition-all"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.remove}
            aria-label={`Remove ${chip.label} filter`}
            className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-kudl-primary/10"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      {chips.length >= 2 && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="shrink-0 text-sm font-semibold text-kudl-muted hover:text-kudl-primary"
        >
          Clear All
        </button>
      )}
    </div>
  )
}
