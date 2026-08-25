import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { RECOMMENDATION_MODULE } from "../../../modules/recommendation"
import type RecommendationModuleService from "../../../modules/recommendation/service"

export type RecommendationEventType =
  | "product_viewed"
  | "product_added_to_cart"
  | "product_purchased"
  | "search_performed"

export type CreateRecommendationEventStepInput = {
  customer_id: string | null
  session_id: string | null
  product_id: string | null
  event_type: RecommendationEventType
  metadata: Record<string, unknown> | null
}

export const createRecommendationEventStepId = "create-recommendation-event"

export const createRecommendationEventStep = createStep(
  createRecommendationEventStepId,
  async (input: CreateRecommendationEventStepInput, { container }) => {
    const service = container.resolve<RecommendationModuleService>(
      RECOMMENDATION_MODULE
    )
    const [event] = await service.createRecommendationEvents([input])
    return new StepResponse(event, event.id)
  },
  async (eventId: string | undefined, { container }) => {
    if (!eventId) return
    const service = container.resolve<RecommendationModuleService>(
      RECOMMENDATION_MODULE
    )
    await service.deleteRecommendationEvents([eventId])
  }
)
