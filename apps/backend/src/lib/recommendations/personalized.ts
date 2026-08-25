import { RECOMMENDATION_CONFIG } from "./config"
import { brandOf, categoryIds, RecommendationCandidate } from "./product-signals"

export type RecommendationEventType =
  | "product_viewed"
  | "product_added_to_cart"
  | "product_purchased"
  | "search_performed"

export type UserEvent = {
  product_id: string | null
  event_type: RecommendationEventType
  created_at: Date | string
}

const EVENT_WEIGHTS: Partial<Record<RecommendationEventType, number>> =
  RECOMMENDATION_CONFIG.personalized.eventWeights

/**
 * Exponential decay: an event `recencyHalfLifeDays` old contributes half the
 * affinity weight of one happening right now, `2 * halfLife` days old a
 * quarter, and so on — smoother than a hard cutoff window.
 */
const recencyBonus = (createdAt: Date | string): number => {
  const ageDays = Math.max(
    0,
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  return Math.pow(0.5, ageDays / RECOMMENDATION_CONFIG.personalized.recencyHalfLifeDays)
}

export type AffinityProfile = {
  categoryAffinity: Map<string, number>
  brandAffinity: Map<string, number>
}

/**
 * Builds a visitor's category/brand affinity from their raw event log. Each
 * event contributes `event_weight × recency_bonus` to every category (and, if
 * known, the brand) of the product it names — so the "score = category × 3 +
 * brand × 2 + event_weight + recency_bonus" formula folds event_weight and
 * recency_bonus into the affinity numbers themselves, and `scorePersonalized`
 * below applies the category/brand multipliers on top.
 *
 * `search_performed` events carry no product_id and contribute nothing here —
 * query-text affinity is a Phase 5+ concern (see AI/ML architecture notes).
 */
export const buildAffinityProfile = (
  events: UserEvent[],
  eventProducts: Map<string, RecommendationCandidate>
): AffinityProfile => {
  const categoryAffinity = new Map<string, number>()
  const brandAffinity = new Map<string, number>()

  for (const event of events) {
    if (!event.product_id) continue
    const weight = EVENT_WEIGHTS[event.event_type]
    if (!weight) continue

    const product = eventProducts.get(event.product_id)
    if (!product) continue

    const contribution = weight * recencyBonus(event.created_at)

    for (const catId of categoryIds(product)) {
      categoryAffinity.set(catId, (categoryAffinity.get(catId) ?? 0) + contribution)
    }

    const brand = brandOf(product)
    if (brand) {
      brandAffinity.set(brand, (brandAffinity.get(brand) ?? 0) + contribution)
    }
  }

  return { categoryAffinity, brandAffinity }
}

export type ScoredCandidate = { id: string; score: number }

/**
 * Ranks candidate products against a visitor's affinity profile. Modular by
 * design — swapping in a different profile-building or scoring strategy
 * (collaborative filtering, embeddings, etc., per the Phase 5 roadmap) means
 * changing this function's body, not any caller.
 */
export const scorePersonalized = (
  profile: AffinityProfile,
  candidates: RecommendationCandidate[]
): ScoredCandidate[] => {
  const { weights } = RECOMMENDATION_CONFIG.personalized

  return candidates
    .map((candidate) => {
      let categoryScore = 0
      for (const catId of categoryIds(candidate)) {
        categoryScore += profile.categoryAffinity.get(catId) ?? 0
      }

      const brand = brandOf(candidate)
      const brandScore = brand ? profile.brandAffinity.get(brand) ?? 0 : 0

      const score = categoryScore * weights.category + brandScore * weights.brand
      return { id: candidate.id, score }
    })
    .filter((scored) => scored.score > 0)
    .sort((a, b) => b.score - a.score)
}
