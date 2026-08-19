"use client"

import { MENU_LINKS } from "@lib/kudl/config"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Home, Menu, ShoppingCart, Store, User } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

const ICONS = {
  home: Home,
  store: Store,
  cart: ShoppingCart,
  account: User,
}

/** Header menu button with quick links to Home, Store, Cart and Account. */
const MainMenu = () => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close after navigating.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-10 w-10 place-items-center rounded-lg text-kudl-ink transition-colors hover:bg-kudl-light focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Quick links"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-48 animate-fade-in-top overflow-hidden rounded-xl border border-kudl-border bg-white py-1.5 shadow-[0_10px_30px_rgba(23,23,23,0.12)]"
        >
          {MENU_LINKS.map((link) => {
            const Icon = ICONS[link.icon]

            return (
              <LocalizedClientLink
                key={link.label}
                href={link.href}
                role="menuitem"
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-kudl-ink transition-colors hover:bg-kudl-light hover:text-kudl-primary focus:outline-none focus-visible:bg-kudl-light"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {link.label}
              </LocalizedClientLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MainMenu
