import { RECOMMENDATION_CONFIG } from "./config"
import {
  brandOf,
  categoryIds,
  cheapestAmount,
  RecommendationCandidate,
} from "./product-signals"

export type { RecommendationCandidate } from "./product-signals"

const priceAffinityScore = (
  sourcePrice: number | null,
  candidatePrice: number | null,
  weights: typeof RECOMMENDATION_CONFIG.relatedProducts.weights,
  toleranceFraction: number
): number => {
  if (sourcePrice === null || candidatePrice === null || sourcePrice === 0) {
    return 0
  }
  const diffFraction = Math.abs(candidatePrice - sourcePrice) / sourcePrice
  if (diffFraction > toleranceFraction) return 0
  // Linear falloff: identical price scores the max, the tolerance edge scores 0.
  return weights.priceMax * (1 - diffFraction / toleranceFraction)
}

export type ScoredCandidate = { id: string; score: number }

/**
 * Ranks candidate products against a source product for the "You May Also
 * Like" strategy. Callers are responsible for excluding the source product
 * itself and filtering to available (published, non-deleted) products before
 * calling this — scoring assumes the candidate list is already eligible.
 */
export const scoreRelatedProducts = (
  source: RecommendationCandidate,
  candidates: RecommendationCandidate[]
): ScoredCandidate[] => {
  const { weights, priceToleranceFraction } = RECOMMENDATION_CONFIG.relatedProducts

  const sourceCategories = categoryIds(source)
  const sourceBrand = brandOf(source)
  const sourcePrice = cheapestAmount(source)

  return candidates
    .map((candidate) => {
      const sharesCategory = [...categoryIds(candidate)].some((id) =>
        sourceCategories.has(id)
      )
      const categoryScore = sharesCategory ? weights.category : 0

      const candidateBrand = brandOf(candidate)
      const brandScore =
        sourceBrand && candidateBrand && sourceBrand === candidateBrand
          ? weights.brand
          : 0

      const priceScore = priceAffinityScore(
        sourcePrice,
        cheapestAmount(candidate),
        weights,
        priceToleranceFraction
      )

      return { id: candidate.id, score: categoryScore + brandScore + priceScore }
    })
    .filter((scored) => scored.score > 0)
    .sort((a, b) => b.score - a.score)
}
