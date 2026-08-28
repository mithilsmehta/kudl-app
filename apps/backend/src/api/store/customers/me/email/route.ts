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
  PendingEmailChange,
  PENDING_EMAIL_TTL_MS,
  normalizeEmail,
  readPendingEmailChange,
} from "../../../../../lib/customer-email-change"

/**
 * Step one of changing the account email: stage the new address.
 *
 * Email is deliberately absent from Medusa's `StoreUpdateCustomer` validator —
 * `company_name`, `first_name`, `last_name`, `phone` and `metadata` are the only
 * fields `POST /store/customers/me` will accept. That is not an oversight: the
 * email is the emailpass login identifier, so changing it silently changes which
 * credentials open the account. It therefore needs a route that can gate the
 * change behind proof that the customer controls the new address.
 *
 * That proof is a one-time code, and the code delivery is not built yet (see
 * `lib/customer-email-change.ts`). What IS built is the two-step shape around
 * it: this route validates and stages, `./confirm` verifies and applies. When the
 * OTP provider lands, only the verification block in `./confirm` changes.
 */

type RequestEmailChangeBody = { email?: unknown }

export async function POST(
  req: AuthenticatedMedusaRequest<RequestEmailChangeBody>,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Sign in to change your email."
    )
  }

  const newEmail = normalizeEmail(
    typeof req.body?.email === "string" ? req.body.email : ""
  )

  // Intentionally permissive: one @, something either side, a dot in the domain.
  // Whether the address really exists is what the confirmation code proves, and
  // a stricter regex only ever rejects addresses that are in fact valid.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Enter a valid email address."
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

  if (normalizeEmail(customer.email ?? "") === newEmail) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "That is already your email address."
    )
  }

  /*
   * Taken-address check, in two places because there are two tables that must
   * both be free: a customer row may exist without an auth identity (a guest
   * checkout, an admin-created customer), and an auth identity may exist without
   * a customer row (registration abandoned between the two calls that
   * `registerCustomer` makes). Missing either check produces a unique-constraint
   * error at confirm time, which is far worse: by then the customer has already
   * been told the change was accepted.
   */
  const { data: existing } = await query.graph({
    entity: "customer",
    fields: ["id"],
    filters: { email: newEmail },
  })

  const authModule = req.scope.resolve(Modules.AUTH)
  const providerIdentities = await authModule.listProviderIdentities({
    entity_id: newEmail,
    provider: "emailpass",
  })

  if (existing?.some((c) => c.id !== customerId) || providerIdentities.length) {
    /*
     * Says "in use", not "belongs to someone else". This route needs a signed-in
     * customer, so it is not an open email-enumeration oracle, but there is no
     * reason to confirm more than the customer needs to act on.
     */
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "That email address is already in use."
    )
  }

  const pending: PendingEmailChange = {
    email: newEmail,
    requested_at: new Date().toISOString(),
  }

  const existingMetadata = (customer.metadata ?? {}) as Record<string, unknown>

  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customerId },
      update: {
        // Spread first: the update replaces metadata rather than merging it, so
        // anything not carried across here (the `privacy` block, for one) is lost.
        metadata: {
          ...existingMetadata,
          [PENDING_EMAIL_METADATA_KEY]: pending,
        },
      },
    },
  })

  /*
   * TODO(otp): send a 6-digit code to `newEmail` here and store only its hash.
   * Medusa 2.16+ has `POST /auth/verification/request` and a verification
   * provider contract that is the natural home for this; it needs a configured
   * `code_provider`, which this project does not have yet.
   */

  res.json({
    pending_email: pending.email,
    requested_at: pending.requested_at,
    /*
     * The app renders the code entry step either way — it is the step the
     * customer will use once delivery exists — but this flag tells it whether a
     * code is actually being checked, so it can say so plainly instead of
     * pretending.
     */
    otp_required: EMAIL_CHANGE_OTP_ENABLED,
    expires_in_seconds: Math.floor(PENDING_EMAIL_TTL_MS / 1000),
  })
}

/** Discards a staged change, so a customer who mistyped is not stuck with it. */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
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
    fields: ["id", "metadata"],
    filters: { id: customerId },
  })

  const existingMetadata = (customers?.[0]?.metadata ?? {}) as Record<
    string,
    unknown
  >

  if (readPendingEmailChange(existingMetadata)) {
    const { [PENDING_EMAIL_METADATA_KEY]: _dropped, ...rest } = existingMetadata
    await updateCustomersWorkflow(req.scope).run({
      input: { selector: { id: customerId }, update: { metadata: rest } },
    })
  }

  res.json({ pending_email: null })
}
