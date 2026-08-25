import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { RECOMMENDATION_CONFIG } from "../../../lib/recommendations/config"
import {
  RecommendationCandidate,
  scoreRelatedProducts,
} from "../../../lib/recommendations/related-products"

/**
 * Related-products recommendations (Phase 1 — rule-based).
 *
 * Returns product IDs only, never product data — the storefront resolves
 * those IDs against the Store Product API so Medusa stays the single source
 * of truth for price, inventory, images and status.
 */

const PRODUCT_FIELDS = [
  "id",
  "status",
  "categories.id",
  "variants.prices.amount",
  "variants.prices.currency_code",
  "metadata",
]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.query.product_id as string | undefined

  if (!productId || typeof productId !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "product_id is required."
    )
  }

  const { relatedProducts: config } = RECOMMENDATION_CONFIG

  if (!config.enabled) {
    res.json({ product_ids: [], strategy: "related_products" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: sourceProducts } = await query.graph({
    entity: "product",
    fields: PRODUCT_FIELDS,
    filters: { id: productId },
  })

  const source = sourceProducts?.[0] as RecommendationCandidate | undefined
  if (!source) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id "${productId}" was not found.`
    )
  }

  // "published" and not soft-deleted only — query.graph excludes soft-deleted
  // rows by default, and the explicit status filter drops drafts/proposed.
  const { data: candidates } = await query.graph({
    entity: "product",
    fields: PRODUCT_FIELDS,
    filters: { status: "published" },
    pagination: { take: config.candidateLimit, skip: 0 },
  })

  const eligible = (candidates as RecommendationCandidate[]).filter(
    (p) => p.id !== source.id
  )

  const ranked = scoreRelatedProducts(source, eligible)
  // Deduplicate defensively — query.graph should not return the same product
  // twice, but the response contract promises no duplicates regardless.
  const seen = new Set<string>()
  const productIds = ranked
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .slice(0, config.maxResults)
    .map((r) => r.id)

  res.json({ product_ids: productIds, strategy: "related_products" })
}
