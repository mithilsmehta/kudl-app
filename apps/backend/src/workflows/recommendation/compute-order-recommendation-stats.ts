import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import {
  computeOrderRecommendationStatsStep,
  ComputeOrderRecommendationStatsInput,
} from "./steps/compute-order-recommendation-stats"

export const computeOrderRecommendationStatsWorkflowId =
  "compute-order-recommendation-stats"

export const computeOrderRecommendationStatsWorkflow = createWorkflow(
  computeOrderRecommendationStatsWorkflowId,
  (input: ComputeOrderRecommendationStatsInput) => {
    const stats = computeOrderRecommendationStatsStep(input)
    return new WorkflowResponse(stats)
  }
)
