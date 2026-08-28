"use client"

/**
 * Change Password — port of apps/mobile/app/change-password.tsx.
 *
 * The current password is required, and that requirement is the whole security
 * value of this page: without it, a browser left signed in is enough to lock the
 * real owner out. The backend enforces it too — this is not a client-side
 * courtesy.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Eye, EyeOff, CheckCircle } from "@/components/icons"
import { useRequireAuth } from "@/lib/useRequireAuth"
import { changeCustomerPassword } from "@/lib/api"
import ScreenHeader from "@/components/ScreenHeader"
import Spinner from "@/components/Spinner"
import ErrorBanner from "@/components/ErrorBanner"
import FormField from "@/components/FormField"

const MIN_LENGTH = 8

export default function ChangePasswordPage() {
  const router = useRouter()
  const { isReady } = useRequireAuth()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [reveal, setReveal] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!currentPassword || !newPassword) {
      setError("Enter your current and new password.")
      return
    }
    if (newPassword.length < MIN_LENGTH) {
      setError(`Your new password must be at least ${MIN_LENGTH} characters.`)
      return
    }
    // Caught here as well as in the backend so the customer is told before the
    // round trip, and told about the field rather than about a rejected request.
    if (newPassword === currentPassword) {
      setError("Your new password must be different from your current one.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Re-enter your new password to confirm it.")
      return
    }

    setIsBusy(true)
    try {
      await changeCustomerPassword(currentPassword, newPassword)
      setDone(true)
      setTimeout(() => router.push("/account-settings"), 1400)
    } catch (err: any) {
      setError(err?.message || "Could not change your password. Please try again.")
    } finally {
      setIsBusy(false)
    }
  }

  if (!isReady) {
    return (
      <div>
        <ScreenHeader title="Change Password" fallbackHref="/account-settings" />
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8 text-kudl-primary" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <ScreenHeader title="Change Password" fallbackHref="/account-settings" />

      <div className="mx-auto max-w-md p-4 md:px-6 md:pb-16">
        {done ? (
          <div className="rounded-kudl-card border border-kudl-border bg-white p-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <CheckCircle className="h-7 w-7 text-green-600" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-kudl-ink">Password changed</h2>
            <p className="mt-1.5 text-sm text-kudl-muted">
              Use your new password next time you sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-kudl-tint">
              <Lock className="h-6 w-6 text-kudl-primary" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-[22px] font-bold text-kudl-ink">
              Change password
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-kudl-muted">
              Enter your current password to confirm it&apos;s you, then pick a new one.
            </p>

            <div className="mt-5 space-y-4">
              <FormField
                label="Current password"
                type={reveal ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <FormField
                label="New password"
                type={reveal ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <FormField
                label="Confirm new password"
                type={reveal ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter the new password"
                autoComplete="new-password"
              />
            </div>

            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              className="mt-3.5 flex items-center gap-1.5 text-[13px] font-semibold text-kudl-primary hover:underline"
            >
              {reveal ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
              {reveal ? "Hide passwords" : "Show passwords"}
            </button>

            <ErrorBanner message={error} />

            <button
              type="submit"
              disabled={isBusy}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-kudl-primary text-base font-bold text-white transition-colors hover:bg-kudl-dark disabled:bg-kudl-primary/40"
            >
              {isBusy ? (
                <Spinner className="h-5 w-5 text-white" />
              ) : (
                "Update password"
              )}
            </button>

            {/*
              Said out loud because the opposite is the common assumption.
              Medusa's customer tokens are stateless JWTs, so there is no
              server-side session to revoke and a password change cannot sign
              other devices out.
            */}
            <p className="mt-4 text-xs leading-relaxed text-kudl-faint">
              Changing your password does not sign you out on other devices. Tokens already
              issued stay valid until they expire.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
