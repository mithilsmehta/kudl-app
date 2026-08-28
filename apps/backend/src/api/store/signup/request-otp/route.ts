import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

import {
  CODE_TTL_MINUTES,
  RESEND_COOLDOWN_SECONDS,
  issueCode,
  normalizeIdentifier,
} from "../../../../lib/otp"
import {
  EmailDeliveryError,
  buildOtpEmail,
  isEmailDeliveryConfigured,
  sendEmail,
} from "../../../../lib/brevo"

/**
 * Step one of signup: prove the email address is real and reachable.
 *
 * Unauthenticated by design — nobody has an account yet. It still sits under
 * /store/*, so Medusa's publishable-key check applies and the endpoint is not
 * open to the whole internet.
 *
 * No account is created here. Nothing exists until ../complete succeeds, so an
 * abandoned signup leaves no half-made customer behind.
 */

type RequestOtpBody = { email?: unknown }

export async function POST(
  req: MedusaStoreRequest<RequestOtpBody>,
  res: MedusaResponse
) {
  const email = normalizeIdentifier(
    typeof req.body?.email === "string" ? req.body.email : ""
  )

  // Permissive on purpose: one @, something either side, a dot in the domain.
  // Whether the address really exists is what the code proves, and a stricter
  // pattern only ever rejects addresses that are in fact valid.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Enter a valid email address."
    )
  }

  /*
   * Refuse an address that already has an account, and say so plainly.
   *
   * This does leak whether an email is registered — but the sign-in form already
   * does, and every store on the internet does. Hiding it here would mean sending
   * a code that cannot possibly work, then failing at the last step with a
   * mystery error, which trades a real usability problem for a privacy gain the
   * rest of the app does not deliver anyway.
   */
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: existing } = await query.graph({
    entity: "customer",
    fields: ["id"],
    filters: { email },
  })

  const authModule = req.scope.resolve(Modules.AUTH)
  const identities = await authModule.listProviderIdentities({
    entity_id: email,
    provider: "emailpass",
  })

  if (existing?.length || identities.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "An account with that email already exists. Please sign in instead."
    )
  }

  // Throttles live in issueCode and throw with a customer-facing reason.
  const { code, expiresAt } = await issueCode(req.scope, email, "signup")

  const { subject, html, text } = buildOtpEmail(code, CODE_TTL_MINUTES)

  try {
    await sendEmail({ to: email, subject, html, text })
  } catch (e) {
    /*
     * The code row is deliberately left in place after a send failure.
     *
     * Deleting it would let a caller wipe the resend throttle by forcing an error,
     * and the row is harmless on its own — it expires in ten minutes and nobody
     * has the plaintext. The customer simply asks again.
     */
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      e instanceof EmailDeliveryError
        ? "We could not send the verification email just now. Please try again in a moment."
        : "Something went wrong sending your code. Please try again."
    )
  }

  res.json({
    email,
    expires_at: expiresAt.toISOString(),
    expires_in_minutes: CODE_TTL_MINUTES,
    resend_after_seconds: RESEND_COOLDOWN_SECONDS,
    /*
     * False when Brevo is not configured, in which case the code was printed to
     * the backend log instead of emailed. The clients show a visible development
     * notice when this is false, rather than telling someone to check an inbox
     * that will stay empty.
     */
    email_sent: isEmailDeliveryConfigured(),
  })
}
