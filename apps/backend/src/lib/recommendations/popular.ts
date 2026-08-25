/**
 * Popular Products (Phase 8's non-personalized tier) — pure purchase-count
 * ranking over completed orders. Kept free of any DB/cache access, same as
 * frequently-bought-together.ts, so it's independently testable.
 */

// productId -> number of distinct completed orders containing it.
export type PopularityRanking = Record<string, number>

/**
 * Builds the popularity ranking from completed orders' product-id lists.
 * Duplicates within an order (e.g. quantity > 1 producing repeated ids) are
 * collapsed first, so a single order contributes at most 1 to any product's
 * count — this ranks "bought by the most orders", not "highest total units".
 */
export const buildPopularityRanking = (
  orderProductIds: string[][]
): PopularityRanking => {
  const ranking: PopularityRanking = {}

  for (const productIds of orderProductIds) {
    for (const id of new Set(productIds)) {
      ranking[id] = (ranking[id] ?? 0) + 1
    }
  }

  return ranking
}

export type PopularityResult = { id: string; count: number }

/** The most-purchased products overall, optionally excluding some ids. */
export const getMostPopular = (
  ranking: PopularityRanking,
  limit: number,
  excludeIds: Set<string> = new Set()
): PopularityResult[] =>
  Object.entries(ranking)
    .filter(([id]) => !excludeIds.has(id))
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
