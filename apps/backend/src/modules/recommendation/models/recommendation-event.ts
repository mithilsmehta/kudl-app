import { model } from "@medusajs/framework/utils"

/**
 * Raw user-activity log for the recommendation engine (Phase 3). One row per
 * tracked interaction; `customer_id` and `session_id` are mutually exclusive —
 * exactly one is set, matching whether the request carried a customer bearer
 * token or an anonymous session id.
 */
const RecommendationEvent = model
  .define("recommendation_event", {
    id: model.id({ prefix: "rec_evt" }).primaryKey(),
    customer_id: model.text().nullable(),
    session_id: model.text().nullable(),
    product_id: model.text().nullable(),
    event_type: model.enum([
      "product_viewed",
      "product_added_to_cart",
      "product_purchased",
      "search_performed",
    ]),
    metadata: model.json().nullable(),
  })
  .indexes([
    { on: ["customer_id", "created_at"] },
    { on: ["session_id", "created_at"] },
    { on: ["product_id", "event_type"] },
    { on: ["event_type", "created_at"] },
  ])

export default RecommendationEvent
