/**
 * Shared filter/sort vocabulary for the /products page. Kept separate from
 * page.tsx so every filter component (sidebar, drawer, chips) imports the
 * same option lists and types instead of redeclaring them.
 */

import { PetType, ProductCategory } from "@/lib/productFacets"

export type PriceRangeId = "under-300" | "300-700" | "700-1200" | "1200-plus"

export interface PriceRangeOption {
  id: PriceRangeId
  label: string
  min: number
  max: number
}

// Presets rather than a dual-handle slider — no slider library is present in
// this codebase, and presets are more reliable to ship than rolling one.
export const PRICE_RANGES: PriceRangeOption[] = [
  { id: "under-300", label: "Under ₹300", min: 0, max: 300 },
  { id: "300-700", label: "₹300 – ₹700", min: 300, max: 700 },
  { id: "700-1200", label: "₹700 – ₹1200", min: 700, max: 1200 },
  { id: "1200-plus", label: "₹1200+", min: 1200, max: Infinity },
]

export const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: "food", label: "Food" },
  { value: "toys", label: "Toys" },
  { value: "grooming-health", label: "Grooming & Health" },
  { value: "accessories", label: "Accessories" },
  { value: "litter-habitat", label: "Litter & Habitat" },
  { value: "treats", label: "Treats" },
]

export const PET_TYPE_OPTIONS: { value: PetType; label: string }[] = [
  { value: "dogs", label: "Dogs" },
  { value: "cats", label: "Cats" },
]

export const RATING_OPTIONS = [4, 3, 2] as const

export interface Filters {
  petType: PetType[]
  category: ProductCategory[]
  /** Taxonomy subcategory slugs (Dog Food > Puppy Food, etc.) — see lib/taxonomy.ts. */
  subcategory: string[]
  /** Cross-species Pharmacy taxonomy slugs (Joint Care, Prescription Diet, ...). */
  pharmacyCategory: string[]
  /** Any product tagged with a pharmacyCategory, regardless of which one — the homepage's Pharmacy tile. */
  pharmacyOnly: boolean
  breed: string[]
  brand: string[]
  priceRange: PriceRangeId | null
  minRating: number | null
  inStockOnly: boolean
}

export const EMPTY_FILTERS: Filters = {
  petType: [],
  category: [],
  subcategory: [],
  pharmacyCategory: [],
  pharmacyOnly: false,
  breed: [],
  brand: [],
  priceRange: null,
  minRating: null,
  inStockOnly: false,
}

export const hasActiveFilters = (filters: Filters): boolean =>
  filters.petType.length > 0 ||
  filters.category.length > 0 ||
  filters.subcategory.length > 0 ||
  filters.pharmacyCategory.length > 0 ||
  filters.pharmacyOnly ||
  filters.breed.length > 0 ||
  filters.brand.length > 0 ||
  filters.priceRange !== null ||
  filters.minRating !== null ||
  filters.inStockOnly

export const activeFilterCount = (filters: Filters): number =>
  filters.petType.length +
  filters.category.length +
  filters.subcategory.length +
  filters.pharmacyCategory.length +
  (filters.pharmacyOnly ? 1 : 0) +
  filters.breed.length +
  filters.brand.length +
  (filters.priceRange !== null ? 1 : 0) +
  (filters.minRating !== null ? 1 : 0) +
  (filters.inStockOnly ? 1 : 0)

export type SortKey =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "newest"
  | "rating"
  | "best-selling"

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Customer Rating" },
  { value: "best-selling", label: "Best Selling" },
]

export type ViewMode = "grid" | "list"

export const toggleValue = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
