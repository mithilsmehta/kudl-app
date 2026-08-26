/**
 * Shared product-facing signals used by every recommendation strategy
 * (related products, personalized, and future ones). Kept separate from any
 * one strategy's scoring so they don't duplicate this logic.
 */

export type Price = { amount?: number | null; currency_code?: string | null }
export type Variant = { prices?: Price[] | null }
export type Category = { id: string }

export type RecommendationCandidate = {
  id: string
  status?: string | null
  categories?: Category[] | null
  variants?: Variant[] | null
  metadata?: Record<string, unknown> | null
}

/**
 * Cheapest listed price for a product, used only as a relative signal for
 * "similar price range" — not a currency-aware storefront price (no region
 * context is available at this layer).
 */
export const cheapestAmount = (product: RecommendationCandidate): number | null => {
  const amounts = (product.variants ?? [])
    .flatMap((v) => v.prices ?? [])
    .map((p) => p.amount)
    .filter((a): a is number => typeof a === "number")
  return amounts.length ? Math.min(...amounts) : null
}

export const categoryIds = (product: RecommendationCandidate): Set<string> =>
  new Set((product.categories ?? []).map((c) => c.id))

/**
 * Reads `metadata.brand`, stamped on every product by seed-kudl-merchandising.ts
 * and seed-kudl-small-pets.ts (the same field the storefront's /products brand
 * filter reads), so brand affinity and brand faceting stay in sync.
 */
export const brandOf = (product: RecommendationCandidate): string | null => {
  const brand = product.metadata?.brand
  return typeof brand === "string" && brand.trim() ? brand.trim().toLowerCase() : null
}
