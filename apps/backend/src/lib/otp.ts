import { createHash, randomInt } from "crypto"
import { MedusaError } from "@medusajs/framework/utils"

import { OTP_MODULE } from "../modules/otp"

/**
 * The rules that make a six-digit code safe, in one place.
 *
 * A six-digit code is one guess in a million — strong only while guessing is
 * bounded and the code is short-lived. Every constant below exists to keep one of
 * those two properties true, or to stop the endpoint being used as somebody
 * else's spam cannon. They are enforced here rather than in each route so the
 * signup flow and the email-change flow cannot drift apart.
 */

export const CODE_LENGTH = 6
export const CODE_TTL_MINUTES = 10

/** Wrong guesses allowed against one code before it is dead. */
export const MAX_ATTEMPTS = 5

/**
 * Resend throttle. Anyone can ask for a code for any address, so without this the
 * endpoint is a free way to mail-bomb a stranger — and on Brevo's free plan, a way
 * to burn all 300 of the day's emails in under a minute.
 */
export const RESEND_COOLDOWN_SECONDS = 60
export const MAX_SENDS_PER_ADDRESS_PER_DAY = 8

export type OtpPurpose = "signup" | "email_change"

export const normalizeIdentifier = (value: string): string =>
  value.trim().toLowerCase()

/**
 * Codes are compared by hash, never stored in plaintext.
 *
 * Plain SHA-256 rather than a slow KDF on purpose: the input space is a million
 * values, so no hash function makes an offline guess expensive. What actually
 * protects the code is the attempt ceiling and the ten-minute expiry. The hash is
 * here so that a leaked database — or the .sql export in backups/ — does not hand
 * over live codes for other people's addresses.
 */
export const hashCode = (code: string): string =>
  createHash("sha256").update(code).digest("hex")

/**
 * `randomInt` from node:crypto, not `Math.random()`. Math.random is seeded
 * pseudo-randomness and its output is predictable from previous values — fine for
 * shuffling a carousel, useless for anything an attacker wants to guess.
 *
 * Leading zeros are kept: "004821" is a perfectly good code, and dropping to five
 * digits when the first is zero would quietly shrink the space by a tenth.
 */
export const generateCode = (): string =>
  String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0")

type OtpService = {
  listOtpCodes: (filters: any, config?: any) => Promise<any[]>
  createOtpCodes: (data: any) => Promise<any>
  updateOtpCodes: (data: any) => Promise<any>
}

const service = (scope: any): OtpService => scope.resolve(OTP_MODULE)

/**
 * Issues a code, enforcing the throttles first.
 *
 * Returns the PLAINTEXT code so the caller can email it. It must never be put in
 * an HTTP response — that would hand the code to whoever asked for it, which is
 * precisely the thing being tested.
 */
export const issueCode = async (
  scope: any,
  identifier: string,
  purpose: OtpPurpose
): Promise<{ code: string; expiresAt: Date }> => {
  const otp = service(scope)
  const id = normalizeIdentifier(identifier)
  const now = Date.now()

  const recent = await otp.listOtpCodes(
    { identifier: id, purpose },
    { order: { created_at: "DESC" }, take: MAX_SENDS_PER_ADDRESS_PER_DAY }
  )

  const lastSent = recent[0]?.created_at
    ? new Date(recent[0].created_at).getTime()
    : 0
  const secondsSinceLast = (now - lastSent) / 1000
  if (lastSent && secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Please wait ${Math.ceil(
        RESEND_COOLDOWN_SECONDS - secondsSinceLast
      )} seconds before requesting another code.`
    )
  }

  const dayAgo = now - 24 * 60 * 60 * 1000
  const sentToday = recent.filter(
    (r: any) => new Date(r.created_at).getTime() > dayAgo
  ).length
  if (sentToday >= MAX_SENDS_PER_ADDRESS_PER_DAY) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Too many codes requested for this email today. Please try again tomorrow."
    )
  }

  const code = generateCode()
  const expiresAt = new Date(now + CODE_TTL_MINUTES * 60 * 1000)

  await otp.createOtpCodes({
    identifier: id,
    purpose,
    code_hash: hashCode(code),
    expires_at: expiresAt,
    attempts: 0,
    consumed_at: null,
  })

  return { code, expiresAt }
}

/**
 * Checks a code and, on success, consumes it so it cannot be replayed.
 *
 * Only the newest unconsumed code counts. Accepting any live code would mean a
 * customer who pressed Resend three times has three valid codes in flight, which
 * triples an attacker's odds for no benefit to anyone.
 *
 * Throws a MedusaError the caller can surface directly; returns nothing on success.
 */
export const consumeCode = async (
  scope: any,
  identifier: string,
  purpose: OtpPurpose,
  submitted: string
): Promise<void> => {
  const otp = service(scope)
  const id = normalizeIdentifier(identifier)
  const clean = (submitted ?? "").replace(/\D/g, "")

  const [latest] = await otp.listOtpCodes(
    { identifier: id, purpose, consumed_at: null },
    { order: { created_at: "DESC" }, take: 1 }
  )

  /*
   * "No code" and "expired code" get one message on purpose. Telling them apart
   * would confirm whether an address has a pending signup, and neither case is
   * fixed by anything other than requesting a new code.
   */
  if (!latest || new Date(latest.expires_at).getTime() < Date.now()) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "That code has expired. Please request a new one."
    )
  }

  if (latest.attempts >= MAX_ATTEMPTS) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Too many incorrect attempts. Please request a new code."
    )
  }

  if (clean.length !== CODE_LENGTH || hashCode(clean) !== latest.code_hash) {
    // Count the failure before returning, or the ceiling never moves.
    await otp.updateOtpCodes({ id: latest.id, attempts: latest.attempts + 1 })
    const left = MAX_ATTEMPTS - (latest.attempts + 1)
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      left > 0
        ? `That code is not correct. ${left} ${
            left === 1 ? "attempt" : "attempts"
          } remaining.`
        : "That code is not correct. Please request a new one."
    )
  }

  await otp.updateOtpCodes({ id: latest.id, consumed_at: new Date() })
}
