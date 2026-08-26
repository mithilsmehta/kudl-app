"use client"

/**
 * Floating back-to-top button, homepage only. Sits above the mobile TabBar
 * (bottom-24) and off to the side so it never overlaps the fixed cart/tab
 * controls that are always on screen.
 */

import { useEffect, useState } from "react"
import { ArrowRight } from "@/components/icons"

export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 800)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="fixed bottom-24 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-kudl-ink text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary md:bottom-8"
    >
      <ArrowRight className="h-4 w-4 -rotate-90" aria-hidden="true" />
    </button>
  )
}
