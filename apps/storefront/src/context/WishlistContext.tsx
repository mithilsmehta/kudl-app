"use client"

/**
 * Wishlist is web-only for now — there's no `/store/wishlist` endpoint on the
 * backend (unlike cart, which is real Medusa state), so this persists to
 * localStorage rather than pretending to sync with a server the app doesn't
 * have. If a backend wishlist ships later, swap the storage calls here for
 * API calls without touching any component that calls useWishlist().
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

const STORAGE_KEY = "kudl_wishlist"

interface WishlistContextValue {
  ids: Set<string>
  has: (productId: string) => boolean
  toggle: (productId: string) => void
}

const WishlistContext = createContext<WishlistContextValue | undefined>(
  undefined
)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) setIds(new Set(JSON.parse(stored)))
    } catch (e) {
      console.log("Error reading wishlist from storage:", e)
    }
  }, [])

  const toggle = useCallback((productId: string) => {
    setIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      } catch (e) {
        console.log("Error saving wishlist to storage:", e)
      }
      return next
    })
  }, [])

  const has = useCallback((productId: string) => ids.has(productId), [ids])

  const value = useMemo(() => ({ ids, has, toggle }), [ids, has, toggle])

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider")
  return ctx
}
