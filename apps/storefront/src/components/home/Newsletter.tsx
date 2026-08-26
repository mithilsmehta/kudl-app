"use client"

/**
 * There's no newsletter/marketing backend endpoint yet, so this only confirms
 * client-side rather than pretending to submit somewhere real.
 */

import { useState } from "react"
import { Mail, Check } from "@/components/icons"

export default function Newsletter() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
  }

  return (
    <section className="mt-5 md:mt-10">
      <div className="rounded-2xl bg-kudl-tint px-5 py-8 text-center md:px-10 md:py-12">
        <h2 className="text-lg font-extrabold text-kudl-ink md:text-2xl">
          Join the Pack — Get 10% Off Your First Order
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-kudl-muted">
          Deals, new arrivals and pet care tips in your inbox.
        </p>

        {submitted ? (
          <p className="mx-auto mt-5 flex max-w-md items-center justify-center gap-2 text-sm font-semibold text-kudl-success">
            <Check className="h-4 w-4" aria-hidden="true" />
            You&apos;re on the list — check your inbox for the code.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-5 flex max-w-md flex-col gap-3 md:flex-row"
          >
            <label className="flex h-12 flex-1 items-center gap-2 rounded-full border border-kudl-border bg-white px-4">
              <Mail className="h-4 w-4 shrink-0 text-kudl-faint" aria-hidden="true" />
              <span className="sr-only">Email address</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent text-sm text-kudl-ink outline-none placeholder:text-kudl-faint"
              />
            </label>
            <button
              type="submit"
              className="h-12 shrink-0 rounded-full bg-kudl-primary px-6 text-sm font-bold text-white transition-colors hover:bg-kudl-dark"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
