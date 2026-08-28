import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { removeCustomerAccountWorkflow } from "@medusajs/medusa/core-flows"

import { PET_MODULE } from "../../../../../../modules/pet"
import { RECOMMENDATION_MODULE } from "../../../../../../modules/recommendation"

/**
 * Deletes the signed-in customer's account for real.
 *
 * A POST rather than a DELETE only because it carries a body: the current
 * password is required, since this is the one action in the app that cannot be
 * undone and a session alone should not be enough to trigger it from a phone
 * someone left unlocked.
 *
 * What goes, and what deliberately stays:
 *
 *   - Pets and recommendation events are ours, live in modules with a plain
 *     `customer_id` column and no link to the customer entity, and so nothing
 *     cascades to them. They are removed here, explicitly, before the customer
 *     row goes — otherwise they are orphaned rows keyed to an id that no longer
 *     resolves, which is exactly the "still in the database" outcome this route
 *     exists to avoid.
 *   - Addresses belong to the customer module and go with the customer.
 *   - The auth identity goes too, via `removeCustomerAccountWorkflow`. This is
 *     the reason for using that workflow rather than `deleteCustomersWorkflow`:
 *     leaving the identity behind means the email stays claimed forever and the
 *     person can never sign up again with their own address.
 *
 * One thing to know about how far "deleted" goes on each side. Our own tables are
 * hard deletes — the pet and recommendation_event rows are physically gone.
 * Medusa's customer and customer_address rows are SOFT deleted: `deleted_at` is
 * stamped and the row stays, which is core Medusa behaviour for any customer
 * delete, including the admin one. In practical terms the account is unreachable
 * (every query filters on `deleted_at`, the token 404s, the email is free to
 * register again — verified), but the name and email still sit in that row. If
 * this store ever needs a hard erasure guarantee, that soft-deleted row is the
 * remaining piece and it needs scrubbing deliberately, on top of this route.
 *   - ORDERS STAY. Medusa exposes no delete-order API anywhere by design — an
 *     order is the record that money changed hands, and it is needed for GST
 *     filings, refunds and chargeback disputes long after an account is gone.
 *     They keep their `customer_id`, so they remain findable in Admin, but the
 *     customer record they point at is deleted and nobody can sign in to reach
 *     them. The app says this in the confirmation dialog rather than implying a
 *     completeness it cannot deliver.
 */

const requireCustomerId = (req: AuthenticatedMedusaRequest): string => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Sign in to delete your account."
    )
  }
  return customerId
}

type DeleteAccountBody = { password?: unknown }

export async function POST(
  req: AuthenticatedMedusaRequest<DeleteAccountBody>,
  res: MedusaResponse
) {
  const customerId = requireCustomerId(req)
  const password =
    typeof req.body?.password === "string" ? req.body.password : ""

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
    filters: { id: customerId },
  })

  const customer = customers?.[0]
  if (!customer) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found.")
  }

  const authModule = req.scope.resolve(Modules.AUTH)
  const [identity] = customer.email
    ? await authModule.listProviderIdentities({
        entity_id: customer.email,
        provider: "emailpass",
      })
    : []

  /*
   * The password check is skipped for an account that has no password to check —
   * an admin-created customer, or one from a future social login. Skipping is
   * correct rather than lax: there is no credential to prove, and demanding one
   * would make such an account permanently undeletable by its owner.
   */
  if (identity) {
    if (!password) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Enter your password to confirm."
      )
    }

    const { success } = await authModule.authenticate("emailpass", {
      body: { email: customer.email!, password },
    })

    if (!success) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "That password is incorrect."
      )
    }
  }

  /*
   * One refusal, and a narrow one: an order already handed to a courier. The
   * customer is the only person who can take that delivery, and deleting the
   * account they would use to track or return it helps nobody.
   *
   * Checked on fulfillments rather than `order.status` on purpose. An order in
   * this store sits at "pending" until it is fulfilled, so a status-based check
   * ("must be completed or canceled") would refuse essentially every account
   * that has ever ordered — a guard that always fires is indistinguishable from
   * a broken button.
   */
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "status",
      "fulfillments.id",
      "fulfillments.canceled_at",
      "fulfillments.delivered_at",
    ],
    filters: { customer_id: customerId },
  })

  const inTransit = (orders ?? []).find(
    (order) =>
      order.status !== "canceled" &&
      (order.fulfillments ?? []).some(
        (f) => !!f && !f.canceled_at && !f.delivered_at
      )
  )

  if (inTransit) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Order #${inTransit.display_id} is on its way. You can delete your account once it has been delivered, or cancel the order first.`
    )
  }

  /*
   * Our own tables first. If one of these fails the account survives and the
   * customer can retry; doing it the other way round would leave rows we can no
   * longer find the owner of.
   */
  const petService: any = req.scope.resolve(PET_MODULE)
  const pets = await petService.listPets({ customer_id: customerId })
  if (pets.length) {
    await petService.deletePets(pets.map((p: { id: string }) => p.id))
  }

  const recommendationService: any = req.scope.resolve(RECOMMENDATION_MODULE)
  const events = await recommendationService.listRecommendationEvents(
    { customer_id: customerId },
    { select: ["id"] }
  )
  if (events.length) {
    await recommendationService.deleteRecommendationEvents(
      events.map((e: { id: string }) => e.id)
    )
  }

  await removeCustomerAccountWorkflow(req.scope).run({
    input: { customerId },
  })

  res.json({
    deleted: true,
    removed: { pets: pets.length, activity_events: events.length },
    retained: { orders: orders?.length ?? 0 },
  })
}
