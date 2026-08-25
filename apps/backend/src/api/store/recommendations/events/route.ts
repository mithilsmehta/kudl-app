import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createRecommendationEventWorkflow } from "../../../../workflows/recommendation/create-recommendation-event"

/**
 * Records one user-activity event for the recommendation engine (Phase 3).
 *
 * Anonymous visitors are identified by a client-generated `session_id`;
 * authenticated customers are identified by the bearer token already resolved
 * onto `req.auth_context` — never by a customer_id in the body, so an event
 * can't be attributed to someone else's account.
 */

const EVENT_TYPES = [
  "product_viewed",
  "product_added_to_cart",
  "product_purchased",
  "search_performed",
] as const
type EventType = (typeof EVENT_TYPES)[number]

// Every event type except a search names a specific product.
const PRODUCT_SCOPED_EVENTS = new Set<EventType>([
  "product_viewed",
  "product_added_to_cart",
  "product_purchased",
])

const MAX_METADATA_BYTES = 2000
const MAX_SESSION_ID_LENGTH = 128

type RecommendationEventBody = {
  event_type?: string
  product_id?: string
  session_id?: string
  metadata?: Record<string, unknown>
}

export async function POST(
  req: MedusaStoreRequest<RecommendationEventBody>,
  res: MedusaResponse
) {
  const body = req.body ?? {}

  const eventType = body.event_type
  if (!eventType || !EVENT_TYPES.includes(eventType as EventType)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `event_type must be one of: ${EVENT_TYPES.join(", ")}`
    )
  }

  const productId =
    typeof body.product_id === "string" && body.product_id.trim()
      ? body.product_id.trim()
      : undefined

  if (PRODUCT_SCOPED_EVENTS.has(eventType as EventType) && !productId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `product_id is required for event_type "${eventType}".`
    )
  }

  if (productId) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id"],
      filters: { id: productId },
    })
    if (!products?.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product with id "${productId}" was not found.`
      )
    }
  }

  const customerId =
    req.auth_context?.actor_type === "customer"
      ? req.auth_context.actor_id
      : undefined

  let sessionId: string | undefined
  if (!customerId) {
    const rawSessionId =
      typeof body.session_id === "string" ? body.session_id.trim() : ""
    if (!rawSessionId || rawSessionId.length > MAX_SESSION_ID_LENGTH) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `session_id is required for anonymous events and must be at most ${MAX_SESSION_ID_LENGTH} characters.`
      )
    }
    sessionId = rawSessionId
  }

  let metadata: Record<string, unknown> | null = null
  if (body.metadata !== undefined) {
    if (
      typeof body.metadata !== "object" ||
      body.metadata === null ||
      Array.isArray(body.metadata)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "metadata must be a JSON object."
      )
    }
    const serialized = JSON.stringify(body.metadata)
    if (serialized.length > MAX_METADATA_BYTES) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `metadata must not exceed ${MAX_METADATA_BYTES} bytes.`
      )
    }
    metadata = body.metadata
  }

  const { result: event } = await createRecommendationEventWorkflow(
    req.scope
  ).run({
    input: {
      customer_id: customerId ?? null,
      session_id: sessionId ?? null,
      product_id: productId ?? null,
      event_type: eventType as EventType,
      metadata,
    },
  })

  res.status(201).json({ event: { id: event.id, event_type: event.event_type } })
}
