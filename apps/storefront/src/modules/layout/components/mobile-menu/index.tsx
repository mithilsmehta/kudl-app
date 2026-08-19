"use client"

import { MENU_LINKS, NAV_LINKS } from "@lib/kudl/config"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Home, Menu, ShoppingCart, Store, User, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import SearchBar from "../search-bar"

const MENU_ICONS = {
  home: Home,
  store: Store,
  cart: ShoppingCart,
  account: User,
}

type MenuCategory = { name: string; handle: string }

/**
 * Mobile navigation drawer. Categories are passed in from the server so the
 * menu reflects the real Medusa category tree rather than a hardcoded list.
 */
const MobileMenu = ({ categories }: { categories: MenuCategory[] }) => {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close the drawer whenever navigation happens.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="grid h-10 w-10 place-items-center rounded-lg text-kudl-ink hover:bg-kudl-light focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary small:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] small:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-kudl-ink/40"
          />

          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm animate-fade-in-right flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-kudl-border px-4 py-3">
              <span className="text-base font-bold tracking-tight text-kudl-primary">
                KUDL PETS
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="grid h-9 w-9 place-items-center rounded-lg text-kudl-ink hover:bg-kudl-light focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="border-b border-kudl-border px-4 py-3">
              <SearchBar />
            </div>

            <nav
              aria-label="Mobile navigation"
              className="flex-1 overflow-y-auto px-4 py-4"
            >
              {/* Quick links: Home, Store, Cart, Account */}
              <ul className="mb-4 flex flex-col gap-1 border-b border-kudl-border pb-4">
                {MENU_LINKS.map((link) => {
                  const Icon = MENU_ICONS[link.icon]

                  return (
                    <li key={link.label}>
                      <LocalizedClientLink
                        href={link.href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-kudl-ink hover:bg-kudl-light"
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {link.label}
                      </LocalizedClientLink>
                    </li>
                  )
                })}
              </ul>

              <ul className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.label}>
                    <LocalizedClientLink
                      href={link.href}
                      className="block rounded-lg px-3 py-2.5 text-base font-medium text-kudl-ink hover:bg-kudl-light"
                    >
                      {link.label}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>

              {categories.length > 0 && (
                <div className="mt-6">
                  <h2 className="px-3 text-[11px] font-semibold uppercase tracking-wide text-kudl-muted">
                    Categories
                  </h2>
                  <ul className="mt-2 flex flex-col gap-1">
                    {categories.map((category) => (
                      <li key={category.handle}>
                        <LocalizedClientLink
                          href={`/categories/${category.handle}`}
                          className="block rounded-lg px-3 py-2 text-sm text-kudl-muted hover:bg-kudl-light hover:text-kudl-ink"
                        >
                          {category.name}
                        </LocalizedClientLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </nav>

            <div className="border-t border-kudl-border px-4 py-3">
              <LocalizedClientLink
                href="/account"
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-kudl-ink hover:bg-kudl-light"
              >
                <User className="h-4 w-4" aria-hidden="true" />
                My Account
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MobileMenu
