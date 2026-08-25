import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  buildCooccurrenceTable,
  CooccurrenceTable,
} from "../../../lib/recommendations/frequently-bought-together"
import {
  buildPopularityRanking,
  PopularityRanking,
} from "../../../lib/recommendations/popular"

export type OrderRecommendationStats = {
  cooccurrenceTable: CooccurrenceTable
  popularityRanking: PopularityRanking
}

export type ComputeOrderRecommendationStatsInput = {
  cacheKey: string
  orderLookbackLimit: number
  cacheTtlSeconds: number
}

const ORDER_FIELDS = ["id", "items.product_id"]

export const computeOrderRecommendationStatsStepId =
  "compute-order-recommendation-stats"

/**
 * Scans completed order history once and derives both the Frequently Bought
 * Together co-occurrence table and the Popular Products ranking from it,
 * then caches the pair together — the two strategies would otherwise each
 * run their own identical order-history scan.
 *
 * No compensation: a stale or missing cache entry is harmless — the next
 * request just recomputes it — so there's nothing meaningful to roll back.
 */
export const computeOrderRecommendationStatsStep = createStep(
  computeOrderRecommendationStatsStepId,
  async (input: ComputeOrderRecommendationStatsInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: orders } = await query.graph({
      entity: "order",
      fields: ORDER_FIELDS,
      // "Completed" here means a real customer order, not an admin draft and
      // not canceled — Medusa's own `order.status` stays "pending" through
      // much of an order's life, so filtering on status: "completed" would
      // exclude nearly every real order this storefront places.
      filters: { is_draft_order: false, status: { $ne: "canceled" } },
      pagination: { take: input.orderLookbackLimit, skip: 0 },
    })

    const orderProductIds = (orders ?? []).map((order: any) =>
      (order.items ?? [])
        .map((item: any) => item.product_id)
        .filter((id: unknown): id is string => Boolean(id))
    )

    const stats: OrderRecommendationStats = {
      cooccurrenceTable: buildCooccurrenceTable(orderProductIds),
      popularityRanking: buildPopularityRanking(orderProductIds),
    }

    const cache = container.resolve(Modules.CACHE)
    await cache.set(input.cacheKey, stats, input.cacheTtlSeconds)

    return new StepResponse(stats)
  }
)
