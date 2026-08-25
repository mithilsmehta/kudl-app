import { MedusaStoreRequest } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { RECOMMENDATION_CONFIG } from "./config"
import { OrderRecommendationStats } from "../../workflows/recommendation/steps/compute-order-recommendation-stats"
import { computeOrderRecommendationStatsWorkflow } from "../../workflows/recommendation/compute-order-recommendation-stats"

export const ORDER_STATS_CACHE_KEY = "recommendation:order-stats"

/** Cache-or-compute accessor shared by the frequently-bought-together and popular routes. */
export const getOrderRecommendationStats = async (
  scope: MedusaStoreRequest["scope"]
): Promise<OrderRecommendationStats> => {
  const cache = scope.resolve(Modules.CACHE)
  const cached = await cache.get<OrderRecommendationStats>(ORDER_STATS_CACHE_KEY)
  if (cached) return cached

  const { orderStats: config } = RECOMMENDATION_CONFIG
  const { result } = await computeOrderRecommendationStatsWorkflow(scope).run({
    input: {
      cacheKey: ORDER_STATS_CACHE_KEY,
      orderLookbackLimit: config.orderLookbackLimit,
      cacheTtlSeconds: config.cacheTtlSeconds,
    },
  })
  return result
}
