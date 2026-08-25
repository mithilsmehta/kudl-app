/**
 * Frequently Bought Together (Phase 2) — pure co-occurrence counting over
 * completed orders. Kept free of any DB/cache access so it's trivially
 * testable and reusable if the counting ever moves into a background job
 * (see the route for the current lazy-cache extension point).
 */

// productId -> coPurchasedProductId -> number of orders containing both.
export type CooccurrenceTable = Record<string, Record<string, number>>

/**
 * Builds the full co-occurrence table from completed orders' product-id
 * lists. `orderProductIds` is one array per order — duplicates within an
 * order (e.g. quantity > 1 producing repeated ids) are collapsed first so a
 * single order can contribute at most 1 to any pair's count.
 */
export const buildCooccurrenceTable = (
  orderProductIds: string[][]
): CooccurrenceTable => {
  const table: CooccurrenceTable = {}

  for (const productIds of orderProductIds) {
    const unique = [...new Set(productIds)]
    if (unique.length < 2) continue

    for (const a of unique) {
      for (const b of unique) {
        if (a === b) continue
        const row = (table[a] ??= {})
        row[b] = (row[b] ?? 0) + 1
      }
    }
  }

  return table
}

export type CooccurrenceResult = { id: string; count: number }

/** Products most often bought alongside `productId`, ranked by co-purchase count. */
export const getFrequentlyBoughtWith = (
  table: CooccurrenceTable,
  productId: string,
  limit: number
): CooccurrenceResult[] => {
  const counts = table[productId]
  if (!counts) return []

  return Object.entries(counts)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
