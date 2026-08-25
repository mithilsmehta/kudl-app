/**
 * Client for the recommendation engine's store API. Every strategy returns
 * product IDs only — display data (name, image, price, stock) always comes
 * from Medusa via `getProductsByIds`, never from this service.
 */

import {
  apiRequest,
  getOrCreateSessionId,
  getProductsByIds,
  getStoredToken,
  Product,
} from "@/lib/api"

export type RecommendationStrategy =
  | "related_products"
  | "frequently_bought_together"
  | "personalized"
  | "popular"

export interface RecommendationsResponse {
  product_ids: string[]
  strategy: RecommendationStrategy
}

export type RecommendationEventType =
  | "product_viewed"
  | "product_added_to_cart"
  | "product_purchased"
  | "search_performed"

/** Product IDs related to `productId` — same pet-type category, similar price, brand when known. */
export const getRelatedProductIds = async (
  productId: string
): Promise<string[]> => {
  try {
    const data = await apiRequest<RecommendationsResponse>(
      `/store/recommendations?product_id=${encodeURIComponent(productId)}`
    )
    return data.product_ids || []
  } catch (e) {
    console.log("Error fetching related products:", e)
    return []
  }
}

/** Related products resolved to full Medusa product data, ready for a ProductCard grid. */
export const getRelatedProducts = async (productId: string): Promise<Product[]> => {
  const ids = await getRelatedProductIds(productId)
  return getProductsByIds(ids)
}

/**
 * Product IDs personalized to this visitor's own activity history (Phase 4).
 * A logged-in customer is identified by their bearer token, already sent on
 * every request; an anonymous visitor is identified by their session id. The
 * backend returns an empty list — never an error — for a visitor it can't
 * identify or one with no history yet.
 */
export const getPersonalizedProductIds = async (): Promise<string[]> => {
  try {
    const token = await getStoredToken()
    const qs = token ? "" : `?session_id=${encodeURIComponent(await getOrCreateSessionId())}`
    const data = await apiRequest<RecommendationsResponse>(
      `/store/recommendations/personalized${qs}`
    )
    return data.product_ids || []
  } catch (e) {
    console.log("Error fetching personalized recommendations:", e)
    return []
  }
}

/** Personalized recommendations resolved to full Medusa product data. */
export const getPersonalizedProducts = async (): Promise<Product[]> => {
  const ids = await getPersonalizedProductIds()
  return getProductsByIds(ids)
}

/** Product IDs frequently bought together with `productId` (Phase 2), from completed order history. */
export const getFrequentlyBoughtTogetherIds = async (
  productId: string
): Promise<string[]> => {
  try {
    const data = await apiRequest<RecommendationsResponse>(
      `/store/recommendations/frequently-bought-together?product_id=${encodeURIComponent(productId)}`
    )
    return data.product_ids || []
  } catch (e) {
    console.log("Error fetching frequently-bought-together products:", e)
    return []
  }
}

/** Frequently-bought-together products resolved to full Medusa product data. */
export const getFrequentlyBoughtTogether = async (
  productId: string
): Promise<Product[]> => {
  const ids = await getFrequentlyBoughtTogetherIds(productId)
  return getProductsByIds(ids)
}

/**
 * Product IDs for the most-purchased products overall (Phase 8's non-
 * personalized fallback tier) — no product_id or visitor identity needed.
 */
export const getPopularProductIds = async (): Promise<string[]> => {
  try {
    const data = await apiRequest<RecommendationsResponse>(
      "/store/recommendations/popular"
    )
    return data.product_ids || []
  } catch (e) {
    console.log("Error fetching popular products:", e)
    return []
  }
}

/** Popular products resolved to full Medusa product data. */
export const getPopularProducts = async (): Promise<Product[]> => {
  const ids = await getPopularProductIds()
  return getProductsByIds(ids)
}

/**
 * Records one user-activity event for the recommendation engine (Phase 3).
 * Best-effort: a tracking failure must never interrupt the shopping flow it's
 * observing, so errors are swallowed rather than surfaced to the caller.
 *
 * A logged-in customer is identified by their bearer token, already sent on
 * every request — no session id is attached in that case. An anonymous
 * visitor is identified by a generated session id instead.
 */
export const trackEvent = async (
  eventType: RecommendationEventType,
  options: { productId?: string; metadata?: Record<string, unknown> } = {}
): Promise<void> => {
  try {
    const token = await getStoredToken()
    const body: Record<string, unknown> = { event_type: eventType }
    if (options.productId) body.product_id = options.productId
    if (options.metadata) body.metadata = options.metadata
    if (!token) {
      body.session_id = await getOrCreateSessionId()
    }
    await apiRequest("/store/recommendations/events", {
      method: "POST",
      body: JSON.stringify(body),
    })
  } catch (e) {
    console.log("Error tracking recommendation event:", e)
  }
}
