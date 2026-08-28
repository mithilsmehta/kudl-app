/**
 * Shared vocabulary for the two-step account email change
 * (`/store/customers/me/email` and its `/confirm` sibling).
 *
 * The staged address lives in `customer.metadata.pending_email_change` for the
 * same reason the privacy flags do: it is one small object, read only for the
 * customer making the request, and written from two routes. Note that when the
 * one-time code arrives it must NOT be stored here — metadata is readable
 * through `GET /store/customers/me`, so the code would be handed to the very
 * client that is supposed to be proving it received it. Store a hash of the code
 * on the auth side (or use Medusa's verification module) and leave this object
 * as the "which address are we confirming" record it is.
 */

export const PENDING_EMAIL_METADATA_KEY = "pending_email_change"

/** How long a staged address stays confirmable. */
export const PENDING_EMAIL_TTL_MS = 15 * 60 * 1000

/**
 * Whether the confirm step actually verifies a one-time code.
 *
 * False until code delivery exists, and while it is false the confirm step
 * applies the change on the strength of the customer's session alone — which is
 * the same level of proof every other field on the account requires today, no
 * weaker, but also no stronger. Both the API response and the app's UI say so
 * rather than showing a code box that quietly accepts anything.
 *
 * Flip this on (`EMAIL_CHANGE_OTP_ENABLED=true`) in the same change that wires
 * up delivery, not before: with no code being sent, a true here locks every
 * customer out of changing their email.
 */
export const EMAIL_CHANGE_OTP_ENABLED =
  process.env.EMAIL_CHANGE_OTP_ENABLED === "true"

export type PendingEmailChange = {
  email: string
  /** ISO timestamp, used to expire the request. */
  requested_at: string
}

/**
 * Emails are compared and stored lower-cased and trimmed.
 *
 * The local part of an address is technically case-sensitive, but treating
 * `A@x.com` and `a@x.com` as different accounts is a bug in every direction that
 * matters here: it defeats the taken-address check and it lets someone lock
 * themselves out by registering with a capital letter their keyboard supplied.
 */
export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase()

/**
 * Reads a staged change out of metadata, returning null for anything unusable —
 * absent, malformed, or past its TTL. Expiry is treated as absence so callers
 * need only one check.
 */
export const readPendingEmailChange = (
  metadata: Record<string, unknown> | null | undefined
): PendingEmailChange | null => {
  const raw = (metadata ?? {})[PENDING_EMAIL_METADATA_KEY]

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null
  }

  const stored = raw as Record<string, unknown>
  if (typeof stored.email !== "string" || !stored.email) {
    return null
  }

  const requestedAt =
    typeof stored.requested_at === "string" ? stored.requested_at : null
  const requestedMs = requestedAt ? Date.parse(requestedAt) : NaN

  if (!Number.isFinite(requestedMs)) {
    return null
  }

  if (Date.now() - requestedMs > PENDING_EMAIL_TTL_MS) {
    return null
  }

  return { email: normalizeEmail(stored.email), requested_at: requestedAt! }
}
