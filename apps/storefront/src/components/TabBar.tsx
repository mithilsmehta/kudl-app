"use client"

/**
 * The app's bottom tab bar, reproduced for narrow viewports only. On md+ the
 * same four destinations live in the sticky top nav instead (see TopNav), which
 * is why this is hidden rather than duplicated there.
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Grid, ShoppingCart, User } from "@/components/icons"
import { useCart } from "@/context/CartContext"

const TABS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/products", label: "Products", Icon: Grid },
  { href: "/cart", label: "Cart", Icon: ShoppingCart },
  { href: "/profile", label: "Profile", Icon: User },
]

export default function TabBar() {
  const pathname = usePathname()
  const { itemCount } = useCart()

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-kudl-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex items-stretch">
        {TABS.map(({ href, label, Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-1 pb-2 pt-2 text-xs font-semibold ${
                  isActive ? "text-kudl-primary" : "text-kudl-muted"
                }`}
              >
                <span className="relative">
                  <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
                  {href === "/cart" && itemCount > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-kudl-danger px-1 text-[10px] font-extrabold leading-none text-white">
                      {itemCount}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
