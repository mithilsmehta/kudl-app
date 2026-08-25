import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RECOMMENDATION_CONFIG } from "../../../../lib/recommendations/config"
import { getMostPopular } from "../../../../lib/recommendations/popular"
import { getOrderRecommendationStats } from "../../../../lib/recommendations/order-stats-cache"

/**
 * Popular Products — the non-personalized tier of the fallback chain
 * (Phase 8): the most-purchased products overall, from the same cached
 * order-history scan as Frequently Bought Together. No product_id needed —
 * unlike the other strategies this one isn't anchored to a specific product,
 * so it fits the homepage's "Recommended for You" fallback for a visitor with
 * no personalization history yet.
 */

export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const { popular: config } = RECOMMENDATION_CONFIG

  if (!config.enabled) {
    res.json({ product_ids: [], strategy: "popular" })
    return
  }

  const { popularityRanking } = await getOrderRecommendationStats(req.scope)

  // Same over-fetch-then-filter pattern as the other strategies: some
  // historically-popular products may since have been unpublished/deleted.
  const candidates = getMostPopular(popularityRanking, config.maxResults * 3)

  if (candidates.length === 0) {
    res.json({ product_ids: [], strategy: "popular" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: availableProducts } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { id: candidates.map((c) => c.id), status: "published" },
  })
  const availableIds = new Set(availableProducts.map((p: any) => p.id))

  const productIds = candidates
    .filter((c) => availableIds.has(c.id))
    .slice(0, config.maxResults)
    .map((c) => c.id)

  res.json({ product_ids: productIds, strategy: "popular" })
}
