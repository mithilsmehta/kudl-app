/**
 * Code-based configuration for the recommendation engine (POC — no admin UI).
 * Centralising these here means a strategy can be tuned or disabled without
 * touching the route/scoring logic.
 */
export const RECOMMENDATION_CONFIG = {
  relatedProducts: {
    enabled: true,
    maxResults: 4,
    // How many published products are pulled as scoring candidates before
    // ranking. Keeps the query bounded regardless of catalog size.
    candidateLimit: 200,
    weights: {
      category: 3,
      // No brand field exists in the catalog yet (see product seed data) —
      // this stays wired in so brand affinity activates automatically the
      // moment products carry a `metadata.brand` value, with no code change.
      brand: 2,
      // Awarded on a sliding scale for price closeness, up to this max.
      priceMax: 2,
    },
    // Candidates priced further apart than this fraction of the source
    // product's price get no price-affinity score at all.
    priceToleranceFraction: 0.5,
  },
  personalized: {
    enabled: true,
    maxResults: 4,
    // How many published products are scored as candidates.
    candidateLimit: 200,
    // How many of the visitor's most recent events feed the affinity profile.
    eventLookback: 200,
    // Events older than this contribute nothing (recencyBonus decays them to
    // near-zero well before this anyway — this is just a hard floor).
    eventWindowDays: 90,
    eventWeights: {
      product_viewed: 1,
      product_added_to_cart: 3,
      product_purchased: 5,
    },
    weights: {
      category: 3,
      brand: 2,
    },
    // Exponential decay half-life: an event this many days old contributes
    // half the affinity weight of one happening right now.
    recencyHalfLifeDays: 14,
  },
  frequentlyBoughtTogether: {
    enabled: true,
    maxResults: 4,
  },
  popular: {
    enabled: true,
    maxResults: 4,
  },
  // Frequently-bought-together and popular-products both derive from the same
  // scan of completed order history, so they share one cached computation
  // (see workflows/recommendation/compute-order-recommendation-stats) instead
  // of each running — and independently caching — their own order query.
  orderStats: {
    // Caps how many recent orders feed the computation, bounding cost
    // independent of the cache below (e.g. right after a cache invalidation).
    orderLookbackLimit: 5000,
    // The scan is expensive (order history) but changes slowly, so it's
    // computed at most once per this window and reused across every request
    // in between — see the route for where a future precomputation job would
    // plug in instead of waiting for a cache miss.
    cacheTtlSeconds: 3600,
  },
}
