/**
 * Reads the filter facets the backend's seed-kudl-catalog.ts stamps on
 * `product.metadata` (brand, category, subcategory, pharmacyCategory, petType,
 * breeds, rating, reviewCount, inStock). Mirrors the read-metadata-safely
 * pattern in the backend's src/lib/recommendations/product-signals.ts so both
 * layers agree on what a missing/malformed field means.
 *
 * The catalog is Dogs and Cats only, and Pharmacy is a cross-species branch
 * over the same two — so PetType has exactly these two members and every
 * seeded product carries one.
 */

import { Product } from "@/lib/api"

export type PetType = "dogs" | "cats"

export type ProductCategory =
  | "food"
  | "treats"
  | "toys"
  | "grooming-health"
  | "litter-habitat"
  | "accessories"

export const getBrand = (product: Product): string | null => {
  const brand = product.metadata?.brand
  return typeof brand === "string" && brand.trim() ? brand.trim() : null
}

export const getPetType = (product: Product): PetType | null => {
  const petType = product.metadata?.petType
  return typeof petType === "string" ? (petType as PetType) : null
}

export const getCategory = (product: Product): ProductCategory | null => {
  const category = product.metadata?.category
  return typeof category === "string" ? (category as ProductCategory) : null
}

export const getBreeds = (product: Product): string[] => {
  const breeds = product.metadata?.breeds
  return Array.isArray(breeds) ? breeds.filter((b): b is string => typeof b === "string") : []
}

// Taxonomy subcategory slug (e.g. "puppy-food", "dental-treats") — see
// lib/taxonomy.ts, whose slugs the backend seed derives this from. Separate
// from `category`, which stays the coarse food/treats/toys/... enum the rest
// of the filter logic already keys off.
export const getSubcategory = (product: Product): string | null => {
  const subcategory = product.metadata?.subcategory
  return typeof subcategory === "string" && subcategory.trim() ? subcategory.trim() : null
}

// Cross-species pharmacy taxonomy slug (e.g. "joint-care", "dewormer") — a
// product can carry this alongside its regular petType/category metadata.
export const getPharmacyCategory = (product: Product): string | null => {
  const pharmacyCategory = product.metadata?.pharmacyCategory
  return typeof pharmacyCategory === "string" && pharmacyCategory.trim()
    ? pharmacyCategory.trim()
    : null
}

// Demo-catalog default: every seeded product has an explicit rating, but a
// product added by hand in the admin shouldn't look unrated in the UI.
export const getRating = (product: Product): number => {
  const rating = product.metadata?.rating
  return typeof rating === "number" ? rating : 4.0
}

export const getReviewCount = (product: Product): number => {
  const reviewCount = product.metadata?.reviewCount
  return typeof reviewCount === "number" ? reviewCount : 0
}

// Unset means "not flagged out of stock" — the seeded catalog's flat
// inventory quantity (1000 per variant) doesn't distinguish real stock-outs,
// so this is a demo signal, not a live inventory check.
export const getInStock = (product: Product): boolean => {
  const inStock = product.metadata?.inStock
  return typeof inStock === "boolean" ? inStock : true
}

export const getCheapestPrice = (product: Product): number | null => {
  const amounts = (product.variants ?? [])
    .map((v) => v.calculated_price?.calculated_amount ?? v.prices?.[0]?.amount)
    .filter((a): a is number => typeof a === "number")
  return amounts.length ? Math.min(...amounts) : null
}
