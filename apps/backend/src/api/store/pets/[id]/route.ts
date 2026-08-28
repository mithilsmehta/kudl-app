import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { PET_MODULE } from "../../../../modules/pet"
import { parseUpdate } from "../validation"

/**
 * Update or remove one pet.
 *
 * POST rather than PATCH for the update, matching the convention Medusa's own
 * store routes use (see POST /store/carts/:id/line-items/:line_id).
 */

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

/**
 * Loads a pet and proves the caller owns it.
 *
 * A pet that does not exist and a pet belonging to someone else both return
 * 404, deliberately. Returning 403 for the second case would confirm the id is
 * real, which turns this route into an enumeration oracle for other customers'
 * pet ids — the same reasoning as the order-cancel route.
 */
const findOwnPet = async (
  petService: any,
  petId: string,
  customerId: string
) => {
  const pets = await petService.listPets({ id: petId })
  const pet = pets?.[0]
  if (!pet || pet.customer_id !== customerId) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Pet not found.")
  }
  return pet
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = requireCustomer(req)
  const petService: any = req.scope.resolve(PET_MODULE)

  await findOwnPet(petService, req.params.id, customerId)

  const update = parseUpdate(req.body)

  const [pet] = await petService.updatePets([
    { id: req.params.id, ...update },
  ])

  res.json({ pet })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = requireCustomer(req)
  const petService: any = req.scope.resolve(PET_MODULE)

  await findOwnPet(petService, req.params.id, customerId)

  await petService.deletePets([req.params.id])

  res.json({ id: req.params.id, object: "pet", deleted: true })
}
