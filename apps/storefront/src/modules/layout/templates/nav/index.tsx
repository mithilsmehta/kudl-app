import { Suspense } from "react"

import { listCategories } from "@lib/data/categories"
import { NAV_LINKS } from "@lib/kudl/config"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import AnnouncementBar from "@modules/layout/components/announcement-bar"
import CartButton from "@modules/layout/components/cart-button"
import MainMenu from "@modules/layout/components/main-menu"
import MobileMenu from "@modules/layout/components/mobile-menu"
import SearchBar from "@modules/layout/components/search-bar"
import { Heart, ShoppingCart, User } from "lucide-react"

export default async function Nav() {
  // Real Medusa categories power the mobile drawer's category list.
  const categories = await listCategories().catch(() => [])

  const menuCategories = (categories ?? [])
    .filter((category) => !category.parent_category)
    .map((category) => ({
      name: category.name,
      handle: category.handle,
    }))

  return (
    <div className="sticky top-0 inset-x-0 z-50">
      <AnnouncementBar />

      <header className="border-b border-kudl-border bg-white">
        <div className="content-container">
          {/* Row 1: brand, search, actions */}
          <div className="flex h-16 items-center gap-3 small:gap-6">
            <div className="flex items-center small:hidden">
              <MobileMenu categories={menuCategories} />
            </div>

            <LocalizedClientLink
              href="/"
              className="shrink-0 rounded text-lg font-bold tracking-tight text-kudl-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary small:text-xl"
              data-testid="nav-store-link"
            >
              KUDL PETS
            </LocalizedClientLink>

            <div className="hidden max-w-md flex-1 small:ml-6 small:block">
              <SearchBar />
            </div>

            <div className="ml-auto flex items-center gap-1">
              <LocalizedClientLink
                href="/account"
                aria-label="Account"
                className="hidden h-10 w-10 place-items-center rounded-lg text-kudl-ink transition-colors hover:bg-kudl-light focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary small:grid"
                data-testid="nav-account-link"
              >
                <User className="h-5 w-5" aria-hidden="true" />
              </LocalizedClientLink>

              {/*
                Wishlist is demo-only UI in this POC (there is no Medusa
                wishlist module), so it points at the shop rather than
                pretending to be a saved-items page.
              */}
              <LocalizedClientLink
                href="/shop"
                aria-label="Wishlist (demo)"
                title="Wishlist (demo)"
                className="hidden h-10 w-10 place-items-center rounded-lg text-kudl-ink transition-colors hover:bg-kudl-light focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary small:grid"
              >
                <Heart className="h-5 w-5" aria-hidden="true" />
              </LocalizedClientLink>

              <Suspense
                fallback={
                  <LocalizedClientLink
                    href="/cart"
                    aria-label="Cart, 0 items"
                    className="grid h-10 w-10 place-items-center rounded-lg text-kudl-ink transition-colors hover:bg-kudl-light"
                    data-testid="nav-cart-link"
                  >
                    <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                  </LocalizedClientLink>
                }
              >
                <CartButton />
              </Suspense>

              {/* Quick links: Home, Store, Cart, Account */}
              <div className="hidden small:block">
                <MainMenu />
              </div>
            </div>
          </div>

          {/* Row 2: primary navigation (desktop only) */}
          <nav
            aria-label="Primary"
            className="hidden h-11 items-center small:flex"
          >
            <ul className="flex items-center gap-7">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <LocalizedClientLink
                    href={link.href}
                    className="rounded text-sm font-medium text-kudl-ink transition-colors hover:text-kudl-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary"
                  >
                    {link.label}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Mobile search sits below the bar so the top row stays uncluttered. */}
        <div className="content-container pb-3 small:hidden">
          <SearchBar />
        </div>
      </header>
    </div>
  )
}
