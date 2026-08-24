"use client"

/**
 * Sign In — port of apps/mobile/app/login.tsx.
 *
 * The app presents this as a modal and calls router.back() on success. On the
 * web a `?next=` param is honoured instead, so "Proceed to Checkout" while
 * signed out lands the customer back at checkout rather than wherever they came
 * from. Failures render inline rather than as an Alert.
 */

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import FormField from "@/components/FormField"
import ScreenHeader from "@/components/ScreenHeader"
import Spinner from "@/components/Spinner"
import ErrorBanner from "@/components/ErrorBanner"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only same-origin relative paths are accepted, so ?next= can't be used to
  // bounce a signed-in customer off to another site.
  const rawNext = searchParams.get("next")
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
    ? rawNext
    : "/profile"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Please enter email and password.")
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      await login(email, password)
      router.replace(next)
    } catch (e: any) {
      setError(
        e?.message || "Invalid credentials or backend unreached."
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white md:bg-kudl-bg">
      <ScreenHeader title="Sign In" />

      <div className="mx-auto max-w-md p-6 md:mt-6 md:rounded-kudl-card md:border md:border-kudl-border md:bg-white md:p-8">
        <h2 className="mt-2.5 text-2xl font-bold text-kudl-ink">
          Welcome Back
        </h2>
        <p className="mt-1 text-sm text-kudl-muted">
          Sign in to your KUDL account
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          <FormField
            label="Email Address"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@example.com"
          />
          <FormField
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-3"
          />

          <ErrorBanner message={error} />

          <button
            type="submit"
            disabled={isLoading}
            className="mt-7 flex h-[50px] w-full items-center justify-center rounded-xl bg-kudl-primary text-base font-bold text-white transition-colors hover:bg-kudl-dark disabled:opacity-70"
          >
            {isLoading ? (
              <Spinner className="h-5 w-5 text-white" label="Signing in" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <Link
          href={`/register${rawNext ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="mt-4 block text-center text-sm font-semibold text-kudl-primary"
        >
          Don&apos;t have an account? Register
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8 text-kudl-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
