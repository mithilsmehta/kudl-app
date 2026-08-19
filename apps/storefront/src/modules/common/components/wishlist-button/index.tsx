"use client"

import { Heart } from "lucide-react"
import { useEffect, useState } from "react"

const STORAGE_KEY = "kudl_wishlist"

/**
 * Demo-only wishlist. Medusa has no wishlist module in this project, so this
 * persists to localStorage purely so the UI is interactive. Nothing here is
 * sent to Medusa, and it is intentionally not presented as a saved account
 * feature. Replace with a real wishlist module before shipping.
 */
const WishlistButton = ({
  productId,
  className = "",
}: {
  productId: string
  className?: string
}) => {
  const [wishlisted, setWishlisted] = useState(false)

  useEffect(() => {
    try {
      const stored = JSON.parse(
        window.localStorage.getItem(STORAGE_KEY) ?? "[]"
      )
      setWishlisted(Array.isArray(stored) && stored.includes(productId))
    } catch {
      setWishlisted(false)
    }
  }, [productId])

  const toggle = (event: React.MouseEvent) => {
    // The card is wrapped in a link; keep the click local to the button.
    event.preventDefault()
    event.stopPropagation()

    try {
      const stored = JSON.parse(
        window.localStorage.getItem(STORAGE_KEY) ?? "[]"
      )
      const list: string[] = Array.isArray(stored) ? stored : []
      const next = list.includes(productId)
        ? list.filter((id) => id !== productId)
        : [...list, productId]

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setWishlisted(next.includes(productId))
    } catch {
      // localStorage unavailable (private mode) - keep the UI responsive only.
      setWishlisted((prev) => !prev)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={wishlisted}
      aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
      title="Wishlist (demo)"
      className={`grid place-items-center h-9 w-9 rounded-full bg-white/90 backdrop-blur border border-kudl-border text-kudl-muted transition-colors hover:text-kudl-sale focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-1 ${className}`}
    >
      <Heart
        className="h-4 w-4"
        strokeWidth={2}
        fill={wishlisted ? "#D9534F" : "none"}
        stroke={wishlisted ? "#D9534F" : "currentColor"}
        aria-hidden="true"
      />
    </button>
  )
}

export default WishlistButton
