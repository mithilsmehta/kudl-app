"use client"

/**
 * Desktop navigation (md+). It carries the same gradient, greeting, search and
 * cart badge as the app's home-screen header, so the brand reads identically —
 * but laid out as a persistent site nav, which is what a wide viewport wants.
 * On narrow viewports this is hidden and TabBar takes over.
 */

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { Search, ShoppingCart, User } from "@/components/icons"
import { useAuth } from "@/context/AuthContext"
import { useCart } from "@/context/CartContext"

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/orders", label: "Orders" },
]

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { itemCount } = useCart()
  const { user } = useAuth()
  const [query, setQuery] = useState("")

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products")
  }

  return (
    <header className="sticky top-0 z-40 hidden bg-kudl-header md:block">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="shrink-0">
          <span className="block text-[11px] font-medium text-blue-200">
            {user?.first_name ? `Hello, ${user.first_name}` : "Welcome to"}
          </span>
          <span className="block text-lg font-extrabold leading-tight text-white">
            KUDL Pet Store
          </span>
        </Link>

        <form onSubmit={submitSearch} className="flex-1" role="search">
          <label className="flex h-11 items-center gap-2 rounded-[14px] bg-white px-4">
            <Search className="h-[18px] w-[18px] shrink-0 text-kudl-faint" aria-hidden="true" />
            <span className="sr-only">Search products</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for food, toys, treats..."
              className="w-full bg-transparent text-sm text-kudl-ink outline-none placeholder:text-kudl-faint"
            />
          </label>
        </form>

        <nav aria-label="Primary" className="flex items-center gap-5">
          {LINKS.map(({ href, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`text-sm font-semibold transition-colors ${
                  isActive ? "text-white" : "text-blue-200 hover:text-white"
                }`}
              >
                {label}
              </Link>
            )
          })}

          <Link
            href="/profile"
            aria-label="Account"
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/[0.18] text-white transition-colors hover:bg-white/25"
          >
            <User className="h-5 w-5" aria-hidden="true" />
          </Link>

          <Link
            href="/cart"
            aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
            className="relative flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/[0.18] text-white transition-colors hover:bg-white/25"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-kudl-dark bg-kudl-danger px-1 text-[10px] font-extrabold leading-none text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  )
}
