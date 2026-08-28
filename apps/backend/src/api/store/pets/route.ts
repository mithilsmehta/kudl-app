import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { PET_MODULE } from "../../../modules/pet"
import { parseCreate } from "./validation"

/**
 * A signed-in customer's pets.
 *
 * Medusa has no pet concept, so this is entirely ours: the storefront's
 * onboarding flow writes here, and the profile page reads and edits from here.
 *
 * Every route in this folder derives the owner from `req.auth_context.actor_id`
 * and never from the request body. That is the whole security model — a
 * customer_id in a payload would let anyone write pets onto anyone's account.
 *
 * Guarding on a missing actor_id explicitly (rather than assuming middleware
 * has run) matches the store/orders/[id]/cancel route: /store/* carries
 * optional customer auth, so an anonymous request arrives with no auth_context
 * rather than being rejected upstream.
 */

/** The maximum pets one customer may keep. A sanity bound, not a product rule. */
const MAX_PETS_PER_CUSTOMER = 20

const requireCustomer = (req: AuthenticatedMedusaRequest): string => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Sign in to manage your pets."
    )
  }
  return customerId
}

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = requireCustomer(req)
  const petService: any = req.scope.resolve(PET_MODULE)

  const pets = await petService.listPets(
    { customer_id: customerId },
    { order: { created_at: "ASC" } }
  )

  res.json({ pets })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = requireCustomer(req)
  const petService: any = req.scope.resolve(PET_MODULE)

  const existing = await petService.listPets({ customer_id: customerId })
  if (existing.length >= MAX_PETS_PER_CUSTOMER) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `You can add up to ${MAX_PETS_PER_CUSTOMER} pets.`
    )
  }

  const data = parseCreate(req.body)

  const [pet] = await petService.createPets([
    { ...data, customer_id: customerId },
  ])

  res.status(201).json({ pet })
}
