/**
 * Brevo transactional email.
 *
 * A direct HTTP call rather than a Medusa notification provider, and that is a
 * deliberate trade. The notification module is the right home for order
 * confirmations and other fire-and-forget mail, where "queued" is as good as
 * "sent". A one-time code is the opposite: if the send fails, the customer is
 * staring at a code entry box waiting for something that will never arrive, so
 * the route has to learn about the failure synchronously and say so. That is
 * awkward through the notification module and trivial here.
 *
 * When order emails arrive, add the notification module then — this file does not
 * get in the way of it.
 */

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email"

/** Brevo's free plan allows 300 emails a day. See enforceSendBudget in ./otp.ts. */
export const BREVO_API_KEY = process.env.BREVO_API_KEY || ""
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || ""
const SENDER_NAME = process.env.BREVO_SENDER_NAME || "KUDL Pet Store"

/**
 * With no API key configured, codes are logged to the backend console instead of
 * emailed, and nothing is sent anywhere.
 *
 * This exists so the whole signup flow can be built and exercised before anyone
 * has a Brevo account, and so a developer running locally is not burning a shared
 * daily quota. It is NOT a silent fallback in disguise: every send logs loudly
 * that it happened, and `isEmailDeliveryConfigured` is exported so routes can tell
 * the client whether a real email is on its way.
 */
export const isEmailDeliveryConfigured = (): boolean =>
  Boolean(BREVO_API_KEY && SENDER_EMAIL)

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  /** Plain-text alternative. Some clients prefer it, and spam filters expect it. */
  text: string
}

export class EmailDeliveryError extends Error {}

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: SendEmailInput): Promise<{ delivered: boolean }> => {
  if (!isEmailDeliveryConfigured()) {
    console.warn(
      [
        "",
        "  ┌─────────────────────────────────────────────────────────────────┐",
        "  │  EMAIL NOT SENT — Brevo is not configured                       │",
        "  │  Set BREVO_API_KEY and BREVO_SENDER_EMAIL in apps/backend/.env  │",
        "  └─────────────────────────────────────────────────────────────────┘",
        `  to:      ${to}`,
        `  subject: ${subject}`,
        `  body:    ${text.replace(/\s+/g, " ").trim()}`,
        "",
      ].join("\n")
    )
    return { delivered: false }
  }

  let response: Response
  try {
    response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    })
  } catch (e: any) {
    // Network-level failure: DNS, timeout, no outbound access from the container.
    throw new EmailDeliveryError(
      `Could not reach the email service: ${e?.message ?? "unknown error"}`
    )
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    /*
     * Brevo's own message is kept, because its 400s are specific and actionable
     * in a way a generic "send failed" is not — an unverified sender address and
     * an exhausted daily quota are the two you will actually hit, and they need
     * completely different fixes.
     */
    throw new EmailDeliveryError(
      `Email service rejected the message (HTTP ${response.status}): ${body.slice(0, 300)}`
    )
  }

  return { delivered: true }
}

/**
 * The signup code email.
 *
 * Inline styles only, and a plain-text part that carries the code on its own line:
 * email clients strip <style> blocks, and a good few people read mail as plain
 * text or have images off.
 */
export const buildOtpEmail = (code: string, minutes: number) => ({
  subject: `${code} is your KUDL verification code`,
  text: [
    "Your KUDL verification code is:",
    "",
    code,
    "",
    `This code expires in ${minutes} minutes.`,
    "If you did not try to create a KUDL account, you can ignore this email.",
  ].join("\n"),
  html: `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111827">
  <p style="margin:0 0 4px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2563eb">KUDL Pet Store</p>
  <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827">Verify your email</h1>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151">
    Enter this code to finish creating your account.
  </p>
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
    <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:.28em;color:#1e3a8a">${code}</span>
  </div>
  <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6b7280">
    This code expires in ${minutes} minutes.
  </p>
  <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280">
    If you did not try to create a KUDL account, you can ignore this email — nothing has been created.
  </p>
</div>`.trim(),
})
