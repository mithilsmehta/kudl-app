import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createCustomerAccountWorkflow } from "@medusajs/medusa/core-flows"

import { consumeCode, normalizeIdentifier } from "../../../../lib/otp"

/**
 * Step two of signup: check the code, then create the account.
 *
 * Verification and account creation are ONE server-side call, and that is the
 * whole security model. If they were separate — verify here, create via Medusa's
 * own register route there — a client could simply skip the first call and
 * register unverified, because Medusa's route knows nothing about our codes.
 * Fusing them means there is no path to an account that does not pass through
 * `consumeCode`.
 *
 * This replaces the three-call dance the clients used to do (register auth
 * identity, create customer, log in). Two of those three now happen here; the
 * client still logs in afterwards to get its token, reusing the existing and
 * well-tested login call rather than having this route mint a JWT by hand.
 */

const MIN_PASSWORD_LENGTH = 8

type CompleteBody = {
  email?: unknown
  password?: unknown
  code?: unknown
  first_name?: unknown
  last_name?: unknown
  phone?: unknown
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "")
const nullable = (v: unknown): string | null => str(v) || null

export async function POST(
  req: MedusaStoreRequest<CompleteBody>,
  res: MedusaResponse
) {
  const email = normalizeIdentifier(str(req.body?.email))
  const password = typeof req.body?.password === "string" ? req.body.password : ""
  const code = str(req.body?.code)

  if (!email || !password || !code) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Email, password and verification code are all required."
    )
  }

  // Checked again here, not only in the form: this route is reachable directly.
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    )
  }

  /*
   * Re-check the address is free. It was checked when the code was issued, but
   * that was up to ten minutes ago and somebody else may have registered it since.
   * Skipping this turns a clear message into a unique-constraint crash.
   */
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const authModule = req.scope.resolve(Modules.AUTH)

  const { data: existing } = await query.graph({
    entity: "customer",
    fields: ["id"],
    filters: { email },
  })
  const taken = await authModule.listProviderIdentities({
    entity_id: email,
    provider: "emailpass",
  })

  if (existing?.length || taken.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "An account with that email already exists. Please sign in instead."
    )
  }

  // Throws with a customer-facing reason (expired, wrong, too many attempts) and
  // marks the code used on success, so it cannot be replayed.
  await consumeCode(req.scope, email, "signup", code)

  /*
   * Create the login credential first, then the customer record attached to it.
   *
   * This order matters on failure: if the customer step fails, an auth identity
   * exists with no customer — which Medusa treats as "claimable" and lets a retry
   * adopt, so the customer can simply try again. The reverse order would leave a
   * customer row that can never be signed in to.
   */
  const { success, authIdentity, error } = await authModule.register(
    "emailpass",
    { body: { email, password } }
  )

  if (!success || !authIdentity) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      error || "Could not create your account. Please try again."
    )
  }

  const { result: customer } = await createCustomerAccountWorkflow(
    req.scope
  ).run({
    input: {
      authIdentityId: authIdentity.id,
      customerData: {
        email,
        first_name: nullable(req.body?.first_name),
        last_name: nullable(req.body?.last_name),
        phone: nullable(req.body?.phone),
      },
    },
  })

  /*
   * No token is returned. The client signs in with the password it already has,
   * which is one extra round trip in exchange for not reimplementing Medusa's JWT
   * issuing here — and it keeps a single, already-tested path to a session.
   */
  res.status(201).json({ customer })
}
