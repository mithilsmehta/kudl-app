"use client"

/**
 * Create Account — port of apps/mobile/app/register.tsx.
 *
 * Two steps: details, then a code emailed to the address given. Nothing is
 * created until the code is accepted — step one only asks the backend to send a
 * code, so abandoning the flow leaves no half-made account behind. The password
 * is held in component state between the steps and submitted with the code, so
 * the account is created in a single server call that cannot be reached without
 * passing verification.
 *
 * On the web the six boxes are six real inputs, unlike the app's single hidden
 * input behind painted boxes: browsers give focus management, paste-across-inputs
 * and `autocomplete="one-time-code"` for free here.
 */

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"
import { Mail, Info } from "@/components/icons"
import { useAuth } from "@/context/AuthContext"
import { requestSignupOtp } from "@/lib/api"
import FormField from "@/components/FormField"
import ScreenHeader from "@/components/ScreenHeader"
import Spinner from "@/components/Spinner"
import ErrorBanner from "@/components/ErrorBanner"

const CODE_LENGTH = 6
const MIN_PASSWORD_LENGTH = 8

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register } = useAuth()

  const [step, setStep] = useState<"details" | "code">("details")

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [emailSent, setEmailSent] = useState(true)
  const [expiresInMinutes, setExpiresInMinutes] = useState(10)
  const [resendIn, setResendIn] = useState(0)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const boxRefs = useRef<Array<HTMLInputElement | null>>([])

  const rawNext = searchParams.get("next")
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/profile"

  const code = digits.join("")

  useEffect(() => {
    if (step === "code") boxRefs.current[0]?.focus()
  }, [step])

  // Counts the resend cooldown down. The backend enforces the real limit; this
  // only stops the customer pressing a button that is going to be refused.
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const setDigitAt = (index: number, value: string) => {
    // Handles a pasted or autofilled code landing in one box: spread it across
    // the rest instead of keeping only the first character.
    const cleaned = value.replace(/[^\d]/g, "")
    if (!cleaned) {
      setDigits((d) => d.map((v, i) => (i === index ? "" : v)))
      return
    }
    setDigits((d) => {
      const nextDigits = [...d]
      for (let i = 0; i < cleaned.length && index + i < CODE_LENGTH; i++) {
        nextDigits[index + i] = cleaned[i]
      }
      return nextDigits
    })
    boxRefs.current[Math.min(index + cleaned.length, CODE_LENGTH - 1)]?.focus()
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

  const sendCode = async (isResend = false) => {
    setError(null)
    const cleanEmail = email.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Enter a valid email address.")
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (!firstName.trim() && !lastName.trim()) {
      setError("Enter at least a first or last name.")
      return
    }

    setIsLoading(true)
    try {
      const result = await requestSignupOtp(cleanEmail)
      setEmailSent(result.email_sent)
      setExpiresInMinutes(result.expires_in_minutes)
      setResendIn(result.resend_after_seconds)
      setDigits(Array(CODE_LENGTH).fill(""))
      if (!isResend) setStep("code")
    } catch (e: any) {
      setError(e?.message || "Could not send the verification code.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (code.length !== CODE_LENGTH) {
      setError(`Type the ${CODE_LENGTH}-digit code we emailed you.`)
      return
    }

    setIsLoading(true)
    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        code,
        first_name: firstName,
        last_name: lastName,
      })
      /*
       * New customers go straight into pet onboarding rather than to `next`.
       * The pet profile is what makes the rest of the store useful — food,
       * treats and pharmacy suggestions all key off it — and the moment just
       * after signing up is the only point where someone is already in a
       * form-filling frame of mind.
       *
       * `next` is carried through rather than dropped, so the interruption is
       * never a dead end: whatever the customer was heading for (checkout, a
       * product, the profile by default) is where Skip and the final CTA both
       * land them. Onboarding itself is fully skippable in one click.
       */
      router.replace(`/onboarding?next=${encodeURIComponent(next)}`)
    } catch (err: any) {
      setError(err?.message || "Could not create your account.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white md:bg-kudl-bg">
      <ScreenHeader title="Create Account" />

      <div className="mx-auto max-w-md p-6 md:mt-6 md:rounded-kudl-card md:border md:border-kudl-border md:bg-white md:p-8">
        {step === "details" ? (
          <>
            <h2 className="mt-2.5 text-2xl font-bold text-kudl-ink">
              Create Account
            </h2>
            <p className="mt-1 text-sm text-kudl-muted">
              Join KUDL for seamless shopping
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendCode()
              }}
              className="mt-5"
            >
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="First Name"
                  name="first_name"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
                <FormField
                  label="Last Name"
                  name="last_name"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
              <FormField
                label="Email Address"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="mt-2.5"
              />
              <p className="mt-1.5 text-xs text-kudl-muted">
                We will email you a code to verify this address.
              </p>
              <FormField
                label="Password"
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="mt-2.5"
              />

              <ErrorBanner message={error} />

              <button
                type="submit"
                disabled={isLoading}
                className="mt-7 flex h-[50px] w-full items-center justify-center rounded-xl bg-kudl-primary text-base font-bold text-white transition-colors hover:bg-kudl-dark disabled:opacity-70"
              >
                {isLoading ? (
                  <Spinner className="h-5 w-5 text-white" label="Sending code" />
                ) : (
                  "Continue"
                )}
              </button>
            </form>

            <Link
              href={`/login${rawNext ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="mt-4 block text-center text-sm font-semibold text-kudl-primary"
            >
              Already have an account? Sign In
            </Link>
          </>
        ) : (
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-kudl-tint">
              <Mail className="h-6 w-6 text-kudl-primary" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-2xl font-bold text-kudl-ink">
              Check your email
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-kudl-muted">
              We sent a {CODE_LENGTH}-digit code to{" "}
              <span className="font-semibold text-kudl-ink">
                {email.trim().toLowerCase()}
              </span>
            </p>

            {!emailSent && (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <Info
                  className="mt-px h-4 w-4 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
                <p className="text-xs leading-relaxed text-amber-800">
                  Email sending isn&apos;t configured on this backend yet, so no email
                  was sent. The code was printed in the backend terminal instead.
                </p>
              </div>
            )}

            <form onSubmit={handleCreateAccount}>
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
                    // Only the first box carries it, so the browser fills the
                    // whole code into one field and setDigitAt spreads the rest.
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

              <p className="mt-3.5 text-xs text-kudl-faint">
                This code expires in {expiresInMinutes} minutes.
              </p>

              <ErrorBanner message={error} />

              <button
                type="submit"
                disabled={isLoading}
                className="mt-6 flex h-[50px] w-full items-center justify-center rounded-xl bg-kudl-primary text-base font-bold text-white transition-colors hover:bg-kudl-dark disabled:opacity-70"
              >
                {isLoading ? (
                  <Spinner className="h-5 w-5 text-white" label="Creating account" />
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => sendCode(true)}
              disabled={isLoading || resendIn > 0}
              className="mt-4 w-full text-sm font-semibold text-kudl-primary disabled:text-kudl-faint"
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </button>

            <button
              type="button"
              onClick={() => setStep("details")}
              disabled={isLoading}
              className="mt-3 w-full text-sm font-semibold text-kudl-muted hover:underline"
            >
              Use a different email
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8 text-kudl-primary" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  )
}
