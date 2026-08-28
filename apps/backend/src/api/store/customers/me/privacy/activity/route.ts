import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { RECOMMENDATION_MODULE } from "../../../../../../modules/recommendation"
import type RecommendationModuleService from "../../../../../../modules/recommendation/service"

/**
 * Clears the signed-in customer's recommendation activity history.
 *
 * This is the one privacy control that deletes data without deleting the
 * account, and it is safe to offer precisely because the events are derived
 * data: they exist only to rank products, so wiping them costs the customer
 * relevance and nothing else. Orders, addresses and pets are untouched.
 *
 * Anonymous session events are deliberately out of scope. They are keyed by a
 * client-generated `session_id` with no owner, so accepting one here would let
 * anybody delete anybody's session history.
 */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Sign in to clear your activity history."
    )
  }

  const recommendationService: RecommendationModuleService =
    req.scope.resolve(RECOMMENDATION_MODULE)

  /*
   * Ids are listed first and deleted by id, rather than passing the filter
   * straight to the delete method. The generated `deleteRecommendationEvents`
   * accepts a filter object, but going through ids means the count returned
   * below is the number actually removed rather than an assumption.
   */
  const events = await recommendationService.listRecommendationEvents(
    { customer_id: customerId },
    { select: ["id"] }
  )

  const ids: string[] = events.map((e: { id: string }) => e.id)

  if (ids.length) {
    await recommendationService.deleteRecommendationEvents(ids)
  }

  res.json({ deleted: ids.length })
}
