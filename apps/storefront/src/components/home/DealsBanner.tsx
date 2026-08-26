"use client"

/**
 * Deal banner with a live countdown to midnight, local time. It's a genuine
 * client-side ticking timer (not a canned "23:59:59" screenshot state) —
 * there's no real deal-expiry field on the backend yet, so "resets nightly"
 * is the honest framing rather than implying a server-tracked flash sale.
 */

import Link from "next/link"
import { useEffect, useState } from "react"
import { Percent, ArrowRight } from "@/components/icons"

const msUntilMidnight = () => {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return midnight.getTime() - now.getTime()
}

const formatDuration = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export default function DealsBanner() {
  const [remainingMs, setRemainingMs] = useState<number | null>(null)

  useEffect(() => {
    setRemainingMs(msUntilMidnight())
    const interval = setInterval(() => {
      setRemainingMs(msUntilMidnight())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="mt-5 md:mt-10">
      <div className="flex flex-col items-center gap-5 rounded-kudl-hero bg-kudl-header p-6 text-center md:flex-row md:justify-between md:p-10 md:text-left">
        <div className="flex items-center gap-4">
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 md:flex">
            <Percent className="h-6 w-6 text-white" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-white md:text-2xl">
              Buy 2 Get 1 Free on Treats &amp; Chews
            </h2>
            <p className="mt-1 text-sm text-blue-100">
              Stock up on best-selling snacks — offer applied at checkout
            </p>
            {remainingMs !== null && (
              <p
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-xs font-semibold text-white"
                aria-live="polite"
              >
                Today&apos;s deal resets in
                <span className="font-mono tabular-nums">{formatDuration(remainingMs)}</span>
              </p>
            )}
          </div>
        </div>
        <Link
          href="/products?q=treat"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-kudl-amber-icon px-5 py-2.5 text-sm font-bold text-kudl-amber-ink transition-opacity hover:opacity-90"
        >
          Shop Treats
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
