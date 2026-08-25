import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { RECOMMENDATION_CONFIG } from "../../../../lib/recommendations/config"
import { getFrequentlyBoughtWith } from "../../../../lib/recommendations/frequently-bought-together"
import { getOrderRecommendationStats } from "../../../../lib/recommendations/order-stats-cache"

/**
 * Frequently Bought Together (Phase 2) — ranks products by how often they
 * co-occur with `product_id` across completed orders.
 *
 * The co-occurrence table comes from a shared, cached order-history scan (see
 * order-stats-cache.ts) rather than being rebuilt on every request.
 */

export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const productId = req.query.product_id as string | undefined

  if (!productId || typeof productId !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "product_id is required."
    )
  }

  const { frequentlyBoughtTogether: config } = RECOMMENDATION_CONFIG

  if (!config.enabled) {
    res.json({ product_ids: [], strategy: "frequently_bought_together" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: sourceProducts } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { id: productId },
  })
  if (!sourceProducts?.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id "${productId}" was not found.`
    )
  }

  const { cooccurrenceTable } = await getOrderRecommendationStats(req.scope)

  // Fetch a few extra candidates beyond maxResults: some co-purchased
  // products from order history may since have been unpublished or deleted,
  // and those need to be dropped without shrinking the final result below
  // maxResults just because they happened to rank highest historically.
  const candidates = getFrequentlyBoughtWith(
    cooccurrenceTable,
    productId,
    config.maxResults * 3
  )

  if (candidates.length === 0) {
    res.json({ product_ids: [], strategy: "frequently_bought_together" })
    return
  }

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

  res.json({ product_ids: productIds, strategy: "frequently_bought_together" })
}
