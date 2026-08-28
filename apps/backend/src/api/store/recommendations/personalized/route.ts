import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { RECOMMENDATION_MODULE } from "../../../../modules/recommendation"
import type RecommendationModuleService from "../../../../modules/recommendation/service"
import { RECOMMENDATION_CONFIG } from "../../../../lib/recommendations/config"
import { RecommendationCandidate } from "../../../../lib/recommendations/product-signals"
import { loadPrivacySettings } from "../../../../lib/customer-privacy"
import {
  buildAffinityProfile,
  scorePersonalized,
  UserEvent,
} from "../../../../lib/recommendations/personalized"

/**
 * Personalized recommendations (Phase 4) — ranks published products against a
 * visitor's own activity history (Phase 3 events). Falls back to an empty
 * result (never an error) when there's no way to identify the visitor or no
 * history exists yet; the storefront's fallback chain (Phase 8) is what turns
 * that into "Trending" / "Featured" for new visitors.
 */

const PRODUCT_FIELDS = [
  "id",
  "status",
  "categories.id",
  "variants.prices.amount",
  "variants.prices.currency_code",
  "metadata",
]

const MAX_SESSION_ID_LENGTH = 128

export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const { personalized: config } = RECOMMENDATION_CONFIG

  if (!config.enabled) {
    res.json({ product_ids: [], strategy: "personalized" })
    return
  }

  const customerId =
    req.auth_context?.actor_type === "customer"
      ? req.auth_context.actor_id
      : undefined

  const rawSessionId =
    typeof req.query.session_id === "string" ? req.query.session_id.trim() : ""
  if (rawSessionId.length > MAX_SESSION_ID_LENGTH) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `session_id must be at most ${MAX_SESSION_ID_LENGTH} characters.`
    )
  }
  const sessionId = !customerId && rawSessionId ? rawSessionId : undefined

  // No customer session and no anonymous session id — nothing to personalize.
  if (!customerId && !sessionId) {
    res.json({ product_ids: [], strategy: "personalized" })
    return
  }

  /*
   * A signed-in customer can opt out of personalization without opting out of
   * tracking (Privacy & Security in the app) — the two are separate settings
   * because they answer different questions: "may you record this?" and "may you
   * use it to rank what I see?".
   *
   * Opting out returns the same empty result as "no history yet", which the
   * storefront's fallback chain already turns into Trending / Featured. So the
   * customer keeps getting recommendations; they just stop being about them.
   */
  if (customerId) {
    const privacy = await loadPrivacySettings(req.scope, customerId)
    if (!privacy.personalized_recommendations) {
      res.json({ product_ids: [], strategy: "personalized" })
      return
    }
  }

  const recommendationModuleService: RecommendationModuleService =
    req.scope.resolve(RECOMMENDATION_MODULE)

  const windowStart = new Date(
    Date.now() - config.eventWindowDays * 24 * 60 * 60 * 1000
  )

  const events = (await recommendationModuleService.listRecommendationEvents(
    {
      ...(customerId ? { customer_id: customerId } : { session_id: sessionId }),
      created_at: { $gte: windowStart },
    },
    {
      select: ["product_id", "event_type", "created_at"],
      order: { created_at: "DESC" },
      take: config.eventLookback,
    }
  )) as UserEvent[]

  const eventProductIds = [
    ...new Set(
      events.map((e) => e.product_id).filter((id): id is string => Boolean(id))
    ),
  ]

  if (eventProductIds.length === 0) {
    res.json({ product_ids: [], strategy: "personalized" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: eventProductsData } = await query.graph({
    entity: "product",
    fields: PRODUCT_FIELDS,
    filters: { id: eventProductIds },
  })

  const eventProducts = new Map<string, RecommendationCandidate>(
    (eventProductsData as RecommendationCandidate[]).map((p) => [p.id, p])
  )

  const profile = buildAffinityProfile(events, eventProducts)

  // Never recommend back a product the visitor already bought — the affinity
  // signal it contributed is still used (it just shaped which *other*
  // products score well), same principle as Phase 1 excluding the product
  // currently being viewed.
  const purchasedProductIds = new Set(
    events
      .filter((e) => e.event_type === "product_purchased" && e.product_id)
      .map((e) => e.product_id as string)
  )

  const { data: candidates } = await query.graph({
    entity: "product",
    fields: PRODUCT_FIELDS,
    filters: { status: "published" },
    pagination: { take: config.candidateLimit, skip: 0 },
  })

  const eligibleCandidates = (candidates as RecommendationCandidate[]).filter(
    (p) => !purchasedProductIds.has(p.id)
  )

  const ranked = scorePersonalized(profile, eligibleCandidates)

  const seen = new Set<string>()
  const productIds = ranked
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .slice(0, config.maxResults)
    .map((r) => r.id)

  res.json({ product_ids: productIds, strategy: "personalized" })
}
