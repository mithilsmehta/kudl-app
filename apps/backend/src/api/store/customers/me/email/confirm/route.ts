import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { updateCustomersWorkflow } from "@medusajs/medusa/core-flows"

import {
  EMAIL_CHANGE_OTP_ENABLED,
  PENDING_EMAIL_METADATA_KEY,
  normalizeEmail,
  readPendingEmailChange,
} from "../../../../../../lib/customer-email-change"

/**
 * Step two of changing the account email: verify and apply.
 *
 * Applying it means two writes that must agree, because the account's email is
 * stored twice:
 *
 *   1. `customer.email` — what the app and the admin display, and what order
 *      confirmations are addressed to.
 *   2. the emailpass provider identity's `entity_id` — what the login form is
 *      matched against.
 *
 * Update only the first and the customer sees their new address everywhere while
 * still having to sign in with the old one, which reads as a broken login and is
 * miserable to diagnose. So the auth side goes first: if it fails, nothing has
 * changed and the staged request is still there to retry. If the customer record
 * update then fails, login already accepts the new address while the display
 * still shows the old one — recoverable by retrying, and the safer of the two
 * orderings.
 */

type ConfirmEmailChangeBody = { code?: unknown }

export async function POST(
  req: AuthenticatedMedusaRequest<ConfirmEmailChangeBody>,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Sign in to change your email."
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "metadata"],
    filters: { id: customerId },
  })

  const customer = customers?.[0]
  if (!customer) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found.")
  }

  const existingMetadata = (customer.metadata ?? {}) as Record<string, unknown>
  const pending = readPendingEmailChange(existingMetadata)

  if (!pending) {
    // Covers "never requested" and "requested too long ago" alike — both are
    // fixed by starting the flow again, so they get one message.
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This email change request has expired. Please start again."
    )
  }

  if (EMAIL_CHANGE_OTP_ENABLED) {
    /*
     * TODO(otp): compare `req.body.code` against the code issued in the request
     * step, and enforce attempt limits and single use.
     *
     * Until that exists this branch must refuse rather than accept: a code check
     * that is switched on but not implemented has to fail closed, or the flag
     * would advertise a verification that is not happening.
     */
    void req.body?.code
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Email verification is not available yet. Please try again later."
    )
  }

  const newEmail = pending.email
  const oldEmail = normalizeEmail(customer.email ?? "")

  const authModule = req.scope.resolve(Modules.AUTH)

  /*
   * Re-checked here, not just in the request step: the staged address is good
   * for 15 minutes, and someone else can register it in the meantime.
   */
  const takenIdentities = await authModule.listProviderIdentities({
    entity_id: newEmail,
    provider: "emailpass",
  })
  const { data: takenCustomers } = await query.graph({
    entity: "customer",
    fields: ["id"],
    filters: { email: newEmail },
  })

  if (
    takenIdentities.length ||
    takenCustomers?.some((c) => c.id !== customerId)
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "That email address is already in use."
    )
  }

  const [identity] = await authModule.listProviderIdentities({
    entity_id: oldEmail,
    provider: "emailpass",
  })

  /*
   * A missing emailpass identity is legitimate, not an error: a customer created
   * by an admin or through guest checkout has no password login at all. There is
   * simply no login identifier to move, so only the customer record changes.
   */
  if (identity) {
    await authModule.updateProviderIdentities([
      { id: identity.id, entity_id: newEmail },
    ])
  }

  const { [PENDING_EMAIL_METADATA_KEY]: _applied, ...restMetadata } =
    existingMetadata

  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customerId },
      update: { email: newEmail, metadata: restMetadata },
    },
  })

  const { data: updated } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "first_name", "last_name", "phone", "company_name"],
    filters: { id: customerId },
  })

  res.json({ customer: updated?.[0], verified: EMAIL_CHANGE_OTP_ENABLED })
}
