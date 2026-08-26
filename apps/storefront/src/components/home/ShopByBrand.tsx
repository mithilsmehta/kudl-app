/**
 * Brand directory. No real brand logo assets exist yet, so each card is a
 * text wordmark rather than a placeholder image pretending to be a logo —
 * swap in real logo files under /public/images/brands/ when available.
 * Deep-links into /products?brand=<name>, a real filter as of the products
 * page redesign; a brand with no matching product (this list is broader than
 * the seeded catalog) lands on the listing's empty state rather than a dead
 * link.
 */

import Link from "next/link"
import { allBrands } from "@/lib/taxonomy"

export default function ShopByBrand() {
  // Duplicated once so the CSS-animated strip can loop seamlessly at -50%.
  const looped = [...allBrands, ...allBrands]

  return (
    <section className="mt-5 md:mt-10">
      <h2 className="mb-3 text-[17px] font-bold text-kudl-ink md:text-2xl">
        Top Brands We Carry
      </h2>

      {/* Auto-scrolling ticker — pauses on hover, and per globals.css is
          motion-reduced to a plain (still scrollable) static row. */}
      <div className="marquee-viewport group overflow-hidden no-scrollbar">
        <ul className="flex w-max animate-marquee gap-3 group-hover:[animation-play-state:paused] md:gap-4">
          {looped.map((brand, i) => (
            <li key={`${brand}-${i}`} className="shrink-0">
              <Link
                href={`/products?brand=${encodeURIComponent(brand)}`}
                className="flex h-16 w-40 items-center justify-center rounded-2xl border border-kudl-border bg-white px-3 text-center text-sm font-bold text-kudl-subtle transition-colors hover:border-kudl-primary hover:text-kudl-primary md:h-20 md:w-48 md:text-base"
              >
                {brand}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
