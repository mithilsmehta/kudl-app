import { model } from "@medusajs/framework/utils"

/**
 * A one-time code issued to an email address.
 *
 * Deliberately keyed by `identifier` (the email) rather than by customer, because
 * the main use is signup — at that point there is no customer to point at, and the
 * whole purpose is proving the address belongs to whoever is typing.
 *
 * `purpose` keeps flows apart. A code issued to verify a signup must not be usable
 * to authorise an email change, so every lookup filters on both identifier and
 * purpose. Adding a flow means adding a value here, not a second table.
 */
const OtpCode = model
  .define("otp_code", {
    id: model.id({ prefix: "otp" }).primaryKey(),

    /** The email the code was sent to, always lower-cased and trimmed. */
    identifier: model.text(),

    /**
     * What the code authorises.
     *   signup       — proving an address before an account is created
     *   email_change — proving a new address on an existing account
     */
    purpose: model.enum(["signup", "email_change"]),

    /*
     * A SHA-256 hash of the code, never the code itself.
     *
     * The plaintext exists only in the email that was sent. Anyone who can read
     * this table — a leaked backup, a compromised admin, the .sql export sitting
     * in backups/ — must not be able to walk up to the verify endpoint with a
     * valid code for somebody else's address.
     */
    code_hash: model.text(),

    expires_at: model.dateTime(),

    /**
     * Wrong guesses so far. A six-digit code is one-in-a-million per guess, which
     * is only strong while guessing is bounded — unlimited attempts crack it in
     * minutes. The verify route refuses the code once this passes its ceiling.
     */
    attempts: model.number().default(0),

    /**
     * Set the moment a code is accepted. Single use: a code that has been spent
     * cannot be replayed, even before it expires.
     */
    consumed_at: model.dateTime().nullable(),
  })
  .indexes([
    // The only lookup: newest live code for this address and purpose.
    { on: ["identifier", "purpose", "created_at"] },
  ])

export default OtpCode
