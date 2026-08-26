"use client"

/**
 * Scroll-reveal wrapper for homepage sections. Fires once per element via
 * IntersectionObserver, then disconnects — sections don't re-animate on
 * scroll-back-up. prefers-reduced-motion is handled in globals.css (the
 * animation is stripped there), not here, so this stays render-only.
 */

import { useEffect, useRef, useState } from "react"

export default function Reveal({
  children,
  className = "",
  delayMs = 0,
}: {
  children: React.ReactNode
  className?: string
  delayMs?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`${visible ? "animate-fade-up" : "opacity-0"} ${className}`}
      style={visible && delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  )
}
