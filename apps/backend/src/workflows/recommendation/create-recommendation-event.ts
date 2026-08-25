import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import {
  createRecommendationEventStep,
  CreateRecommendationEventStepInput,
} from "./steps/create-recommendation-event"

export const createRecommendationEventWorkflowId = "create-recommendation-event"

export const createRecommendationEventWorkflow = createWorkflow(
  createRecommendationEventWorkflowId,
  (input: CreateRecommendationEventStepInput) => {
    const event = createRecommendationEventStep(input)
    return new WorkflowResponse(event)
  }
)
