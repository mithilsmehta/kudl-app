"use client"

/**
 * Change Email — port of apps/mobile/app/change-email.tsx.
 *
 * Two steps: enter the new address, then confirm it with a one-time code.
 *
 * The code step is real UI against a real endpoint, but code DELIVERY is not
 * built yet — the backend reports this as `otp_required: false` and applies the
 * change on the strength of the session alone. Rather than hide the step or fake
 * it, the page renders the code boxes and says plainly, in the banner, that no
 * code is being sent yet. When delivery lands, `otp_required` flips to true and
 * the only thing that changes here is that the banner and the button stop being
 * in "no code needed" mode.
 *
 * That is why the flow is two steps' worth of state rather than one submit: the
 * shape has to be right now so wiring the code in later is a backend change, not
 * a redesign.
 *
 * On the web the six boxes are six real inputs, unlike the app's single hidden
 * input behind painted boxes. Browsers give focus management, paste-across-inputs
 * and `autocomplete="one-time-code"` for free here, and a hidden input would fight
 * all three.
 */

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Shield, Info, CheckCircle } from "@/components/icons"
import { useAuth } from "@/context/AuthContext"
import { useRequireAuth } from "@/lib/useRequireAuth"
import {
  cancelEmailChange,
  confirmEmailChange,
  requestEmailChange,
} from "@/lib/api"
import ScreenHeader from "@/components/ScreenHeader"
import Spinner from "@/components/Spinner"
import ErrorBanner from "@/components/ErrorBanner"
import FormField from "@/components/FormField"

const CODE_LENGTH = 6

export default function ChangeEmailPage() {
  const router = useRouter()
  const { isReady } = useRequireAuth()
  const { user, refreshUser } = useAuth()

  const [step, setStep] = useState<"email" | "code">("email")
  const [newEmail, setNewEmail] = useState("")
  const [otpRequired, setOtpRequired] = useState(false)
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const boxRefs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (step === "code") boxRefs.current[0]?.focus()
  }, [step])

  const code = digits.join("")

  const setDigitAt = (index: number, value: string) => {
    // Handles a pasted or autofilled code arriving into one box: spread it
    // across the remaining boxes instead of keeping only the first character.
    const cleaned = value.replace(/[^\d]/g, "")
    if (!cleaned) {
      setDigits((d) => d.map((v, i) => (i === index ? "" : v)))
      return
    }

    setDigits((d) => {
      const next = [...d]
      for (let i = 0; i < cleaned.length && index + i < CODE_LENGTH; i++) {
        next[index + i] = cleaned[i]
      }
      return next
    })

    const landedAt = Math.min(index + cleaned.length, CODE_LENGTH - 1)
    boxRefs.current[landedAt]?.focus()
  }

  const handleBoxKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Backspace in an empty box steps back rather than doing nothing, which is
    // what makes correcting a mistyped code feel normal.
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault()
      setDigits((d) => d.map((v, i) => (i === index - 1 ? "" : v)))
      boxRefs.current[index - 1]?.focus()
    }
    if (e.key === "ArrowLeft" && index > 0) boxRefs.current[index - 1]?.focus()
    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      boxRefs.current[index + 1]?.focus()
    }
  }

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const email = newEmail.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.")
      return
    }
    if (email === (user?.email || "").toLowerCase()) {
      setError("That is already your email address.")
      return
    }

    setIsBusy(true)
    try {
      const result = await requestEmailChange(email)
      setOtpRequired(result.otp_required)
      setDigits(Array(CODE_LENGTH).fill(""))
      setStep("code")
    } catch (err: any) {
      setError(err?.message || "Could not continue. Please try again.")
    } finally {
      setIsBusy(false)
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (otpRequired && code.length !== CODE_LENGTH) {
      setError(`Type the ${CODE_LENGTH}-digit code we sent you.`)
      return
    }

    setIsBusy(true)
    try {
      await confirmEmailChange(otpRequired ? code : undefined)
      await refreshUser()
      setDone(true)
      // Long enough to read the confirmation, short enough not to feel stuck.
      setTimeout(() => router.push("/account-settings"), 1400)
    } catch (err: any) {
      setError(err?.message || "Could not update your email. Please try again.")
    } finally {
      setIsBusy(false)
    }
  }

  const handleStartOver = async () => {
    setIsBusy(true)
    try {
      // Clears the staged address server-side too, so a mistyped one is not left
      // sitting on the account waiting to be confirmed for the next 15 minutes.
      await cancelEmailChange()
    } catch {
      // Best-effort: the staged address expires on its own, and blocking the
      // customer from fixing their typo because the discard call failed would be
      // the worse outcome.
    } finally {
      setIsBusy(false)
      setDigits(Array(CODE_LENGTH).fill(""))
      setError(null)
      setStep("email")
    }
  }

  if (!isReady || !user) {
    return (
      <div>
        <ScreenHeader title="Change Email" fallbackHref="/account-settings" />
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8 text-kudl-primary" />
        </div>
      </div>
    )
  }

  const stagedEmail = newEmail.trim().toLowerCase()

  return (
    <div>
      <ScreenHeader title="Change Email" fallbackHref="/account-settings" />

      <div className="mx-auto max-w-md p-4 md:px-6 md:pb-16">
        {done ? (
          <div className="rounded-kudl-card border border-kudl-border bg-white p-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <CheckCircle className="h-7 w-7 text-green-600" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-kudl-ink">Email updated</h2>
            <p className="mt-1.5 text-sm text-kudl-muted">
              You will sign in with{" "}
              <span className="font-semibold text-kudl-ink">{stagedEmail}</span> from now on.
            </p>
          </div>
        ) : step === "email" ? (
          <form onSubmit={handleRequest}>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-kudl-tint">
              <Mail className="h-6 w-6 text-kudl-primary" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-[22px] font-bold text-kudl-ink">
              Change your email
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-kudl-muted">
              This is also how you sign in, so we will confirm the new address before
              switching.
            </p>

            <div className="mt-5 rounded-xl border border-kudl-border bg-kudl-bg p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-kudl-muted">
                Current email
              </p>
              <p className="mt-1 break-all text-[15px] font-medium text-kudl-ink">
                {user.email}
              </p>
            </div>

            <div className="mt-5">
              <FormField
                label="New email address"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
              />
            </div>

            <ErrorBanner message={error} />

            <button
              type="submit"
              disabled={isBusy}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-kudl-primary text-base font-bold text-white transition-colors hover:bg-kudl-dark disabled:bg-kudl-primary/40"
            >
              {isBusy ? <Spinner className="h-5 w-5 text-white" /> : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirm}>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-kudl-tint">
              <Shield className="h-6 w-6 text-kudl-primary" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-[22px] font-bold text-kudl-ink">
              Verify the new address
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-kudl-muted">
              Enter the {CODE_LENGTH}-digit code sent to{" "}
              <span className="font-semibold text-kudl-ink">{stagedEmail}</span>
            </p>

            {!otpRequired && (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <Info
                  className="mt-px h-4 w-4 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
                <p className="text-xs leading-relaxed text-amber-800">
                  Code delivery isn&apos;t switched on yet, so no email has been sent and
                  this step isn&apos;t checked. Press Confirm to apply the change.
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    boxRefs.current[i] = el
                  }}
                  value={digit}
                  onChange={(e) => setDigitAt(i, e.target.value)}
                  onKeyDown={(e) => handleBoxKeyDown(i, e)}
                  inputMode="numeric"
                  // Only the first box carries it, so the browser fills the whole
                  // code into one field and setDigitAt spreads it across the rest.
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
                  className={`h-14 min-w-0 flex-1 rounded-xl border-[1.5px] text-center text-[22px] font-bold text-kudl-ink outline-none transition-colors focus:border-kudl-primary focus:ring-2 focus:ring-kudl-primary/30 ${
                    digit
                      ? "border-blue-300 bg-white"
                      : "border-kudl-border bg-kudl-bg"
                  }`}
                />
              ))}
            </div>

            <ErrorBanner message={error} />

            <button
              type="submit"
              disabled={isBusy}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-kudl-primary text-base font-bold text-white transition-colors hover:bg-kudl-dark disabled:bg-kudl-primary/40"
            >
              {isBusy ? (
                <Spinner className="h-5 w-5 text-white" />
              ) : (
                "Confirm new email"
              )}
            </button>

            <button
              type="button"
              onClick={handleStartOver}
              disabled={isBusy}
              className="mt-4 w-full text-sm font-semibold text-kudl-primary hover:underline"
            >
              Use a different address
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
