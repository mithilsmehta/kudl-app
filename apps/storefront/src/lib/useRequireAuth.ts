"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"

/**
 * Redirects signed-out visitors to sign-in, mirroring the guard the app runs at
 * the top of its Orders, Addresses and Checkout screens. The current path is
 * passed as `next` so the customer resumes where they were aiming.
 *
 * Returns `isReady` — false while the token is still being restored from
 * storage, so callers can hold off rendering instead of flashing empty state.
 */
export function useRequireAuth() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [isLoading, user, router, pathname])

  return { user, isReady: !isLoading && !!user }
}
