"use client"

/**
 * Pet onboarding page.
 *
 * Reached automatically straight after registering (see app/register/page.tsx),
 * and directly from the profile page's "Add a pet".
 *
 * Guarded by useRequireAuth: pets belong to a customer, and every /store/pets
 * route derives the owner from the auth token, so an anonymous visitor has
 * nothing to save to. Signing in first and coming back is better than letting
 * someone fill three steps and only then discover they need an account.
 *
 * `?next=` carries whatever the customer was originally trying to reach before
 * registration interrupted them. Both "Skip for now" and "Start Exploring" go
 * there, so being shown this form never costs someone their place — a customer
 * who was mid-checkout lands back in checkout, not on a dead end.
 */

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import PetOnboarding from "@/components/onboarding/PetOnboarding"
import Spinner from "@/components/Spinner"
import { useRequireAuth } from "@/lib/useRequireAuth"

/**
 * Only same-origin paths are honoured. Without this, `?next=//evil.example`
 * would be read by the browser as a protocol-relative URL and turn our own
 * redirect into an off-site one. Mirrors the check in register/page.tsx.
 */
const safeNext = (raw: string | null): string =>
  raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/profile"

function Onboarding() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isReady } = useRequireAuth()

  const next = safeNext(searchParams.get("next"))

  if (!isReady) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8 text-kudl-primary" label="Loading" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-10">
      <PetOnboarding
        onDone={() => router.replace(next)}
        /*
         * `replace`, not `push`: this page is a one-time step in a flow, and
         * leaving it in history means Back from the destination drops the
         * customer into a form they have already finished.
         */
        doneLabel={next === "/profile" ? "See my profile" : "Continue"}
      />
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8 text-kudl-primary" />
        </div>
      }
    >
      <Onboarding />
    </Suspense>
  )
}
