"use client"

/** Create Account — port of apps/mobile/app/register.tsx. */

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import FormField from "@/components/FormField"
import ScreenHeader from "@/components/ScreenHeader"
import Spinner from "@/components/Spinner"
import ErrorBanner from "@/components/ErrorBanner"

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register } = useAuth()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      await register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      })
      router.replace(next)
    } catch (e: any) {
      setError(e?.message || "Could not register customer.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white md:bg-kudl-bg">
      <ScreenHeader title="Create Account" />

      <div className="mx-auto max-w-md p-6 md:mt-6 md:rounded-kudl-card md:border md:border-kudl-border md:bg-white md:p-8">
        <h2 className="mt-2.5 text-2xl font-bold text-kudl-ink">
          Create Account
        </h2>
        <p className="mt-1 text-sm text-kudl-muted">
          Join KUDL for seamless shopping
        </p>

        <form onSubmit={handleSubmit} className="mt-5">
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
          <FormField
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-2.5"
          />

          <ErrorBanner message={error} />

          <button
            type="submit"
            disabled={isLoading}
            className="mt-7 flex h-[50px] w-full items-center justify-center rounded-xl bg-kudl-primary text-base font-bold text-white transition-colors hover:bg-kudl-dark disabled:opacity-70"
          >
            {isLoading ? (
              <Spinner className="h-5 w-5 text-white" label="Creating account" />
            ) : (
              "Register"
            )}
          </button>
        </form>

        <Link
          href={`/login${rawNext ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="mt-4 block text-center text-sm font-semibold text-kudl-primary"
        >
          Already have an account? Sign In
        </Link>
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
