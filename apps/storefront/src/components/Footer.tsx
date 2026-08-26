/**
 * Site-wide footer. Rendered once from the root layout, below every page's
 * <main>. pb-20/md:pb-0 on the wrapper keeps it clear of the fixed mobile
 * TabBar the same way <main> already does.
 */

import Link from "next/link"
import { Instagram, Facebook, Mail } from "@/components/icons"

const SHOP_LINKS = [
  { href: "/products?category=Dogs", label: "Dogs" },
  { href: "/products?category=Cats", label: "Cats" },
  { href: "/products?pharmacyOnly=1", label: "Pharmacy" },
  { href: "/products", label: "All Products" },
]

const SERVICE_LINKS = [
  { href: "/orders", label: "Track Orders" },
  { href: "/profile", label: "My Account" },
  { href: "/cart", label: "Cart" },
]

export default function Footer() {
  return (
    <footer className="mt-10 bg-kudl-ink pb-20 pt-10 text-gray-300 md:pb-10">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <p className="text-lg font-extrabold text-white">KUDL Pet Store</p>
            <p className="mt-2 text-sm text-gray-400">
              Everything your pet needs, delivered across India.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="KUDL Pet Store on Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              >
                <Instagram className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="KUDL Pet Store on Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              >
                <Facebook className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="mailto:hello@kudlpetstore.in"
                aria-label="Email KUDL Pet Store"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-white">Shop</p>
            <ul className="mt-3 space-y-2">
              {SHOP_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-bold text-white">Customer Service</p>
            <ul className="mt-3 space-y-2">
              {SERVICE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-bold text-white">Company</p>
            <ul className="mt-3 space-y-2">
              <li className="text-sm text-gray-400">About Us</li>
              <li className="text-sm text-gray-400">Careers</li>
              <li className="text-sm text-gray-400">Contact</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} KUDL Pet Store. All rights reserved.</p>
          <div className="flex gap-4">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
