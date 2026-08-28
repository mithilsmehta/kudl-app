import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { updateCustomersWorkflow } from "@medusajs/medusa/core-flows"

import { RECOMMENDATION_MODULE } from "../../../../../modules/recommendation"
import type RecommendationModuleService from "../../../../../modules/recommendation/service"
import { PET_MODULE } from "../../../../../modules/pet"
import {
  PRIVACY_METADATA_KEY,
  PrivacySettings,
  readPrivacySettings,
} from "../../../../../lib/customer-privacy"

/**
 * The signed-in customer's privacy settings, plus a summary of what the store
 * actually holds about them.
 *
 * The summary is the point of this route as much as the toggles are: "we keep 4
 * addresses, 2 pets and 137 activity events about you" is a concrete, checkable
 * answer, and it is what makes the Clear activity history and Delete account
 * buttons next to it meaningful rather than decorative.
 *
 * Auth is not checked here. `/store/customers/me*` carries Medusa's own
 * `authenticate("customer", ["session", "bearer"])` with no `allowUnauthenticated`,
 * so an anonymous request is rejected before it reaches this file — unlike
 * `/store/pets`, which sits outside that matcher and has to guard itself.
 */

const requireCustomerId = (req: AuthenticatedMedusaRequest): string => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Sign in to manage your privacy settings."
    )
  }
  return customerId
}

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = requireCustomerId(req)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "created_at", "metadata", "addresses.id"],
    filters: { id: customerId },
  })

  const customer = customers?.[0]
  if (!customer) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found.")
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id"],
    filters: { customer_id: customerId },
  })

  const petService: any = req.scope.resolve(PET_MODULE)
  const pets = await petService.listPets({ customer_id: customerId })

  const recommendationService: RecommendationModuleService =
    req.scope.resolve(RECOMMENDATION_MODULE)
  const events = await recommendationService.listRecommendationEvents(
    { customer_id: customerId },
    { select: ["id"] }
  )

  res.json({
    settings: readPrivacySettings(customer.metadata as Record<string, unknown>),
    data_summary: {
      account_created_at: customer.created_at,
      orders: orders?.length ?? 0,
      // `addresses` comes back with nulls filtered out by the graph, but guard
      // anyway — the generated relation type is nullable.
      addresses: (customer.addresses ?? []).filter(Boolean).length,
      pets: pets.length,
      activity_events: events.length,
    },
  })
}

type PrivacyUpdateBody = Partial<Record<keyof PrivacySettings, unknown>>

const SETTING_KEYS: Array<keyof PrivacySettings> = [
  "marketing_emails",
  "activity_tracking",
  "personalized_recommendations",
]

export async function POST(
  req: AuthenticatedMedusaRequest<PrivacyUpdateBody>,
  res: MedusaResponse
) {
  const customerId = requireCustomerId(req)
  const body = req.body ?? {}

  const patch: Partial<PrivacySettings> = {}
  for (const key of SETTING_KEYS) {
    if (body[key] === undefined) {
      continue
    }
    if (typeof body[key] !== "boolean") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `"${key}" must be true or false.`
      )
    }
    patch[key] = body[key] as boolean
  }

  if (!Object.keys(patch).length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Provide at least one of: ${SETTING_KEYS.join(", ")}.`
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "metadata"],
    filters: { id: customerId },
  })

  const customer = customers?.[0]
  if (!customer) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found.")
  }

  /*
   * Metadata is replaced wholesale by the update, not merged, so the existing
   * blob is read and spread back. This is also why the mobile app posts here
   * instead of putting `metadata` on `/store/customers/me` directly: that route
   * would let a client drop every other key it did not happen to know about.
   */
  const existingMetadata = (customer.metadata ?? {}) as Record<string, unknown>
  const settings: PrivacySettings = {
    ...readPrivacySettings(existingMetadata),
    ...patch,
  }

  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customerId },
      update: {
        metadata: {
          ...existingMetadata,
          [PRIVACY_METADATA_KEY]: settings,
        },
      },
    },
  })

  res.json({ settings })
}
