/**
 * Shop by dog breed. There's no breed photography in the product catalogue,
 * so each card stays a paw-print badge rather than a stock photo standing in
 * for a breed it doesn't actually depict — but /products?breed=<slug> is now
 * a real filter (the backend's seed-kudl-catalog.ts stamps `metadata.breeds`
 * on the Dogs catalogue), so each card deep-links into that instead of a
 * free-text search.
 */

import Link from "next/link"
import { BREEDS } from "@/lib/homeContent"
import { PawPrint, ChevronRight } from "@/components/icons"

const BADGE_COLORS = [
  "bg-kudl-tint text-kudl-primary ring-kudl-primary/20",
  "bg-kudl-coral-light text-kudl-coral ring-kudl-coral/20",
  "bg-kudl-teal-light text-kudl-teal ring-kudl-teal/20",
  "bg-kudl-violet-light text-kudl-violet ring-kudl-violet/20",
]

export default function ShopByBreed() {
  return (
    <section className="-mx-4 mt-5 bg-kudl-hero px-4 py-10 md:mx-0 md:mt-10 md:rounded-kudl-hero md:px-10 md:py-14">
      <div className="text-center">
        <h2 className="text-[17px] font-bold text-kudl-amber-ink md:text-2xl">
          Shop By Breed
        </h2>
        <p className="mx-auto mt-1 max-w-md text-[12.5px] text-kudl-amber-body md:text-sm">
          Personalized food, toys &amp; care picks for your dog&apos;s breed
        </p>
      </div>

      <ul className="no-scrollbar mt-6 flex snap-x gap-4 overflow-x-auto md:mt-8 md:flex-wrap md:justify-center md:overflow-visible">
        {BREEDS.map((breed, i) => (
          <li key={breed.slug} className="shrink-0 snap-start">
            <Link
              href={`/products?breed=${encodeURIComponent(breed.slug)}`}
              className="group flex w-28 flex-col items-center gap-2 rounded-2xl p-2 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary md:w-32"
            >
              <span
                className={`flex h-20 w-20 items-center justify-center rounded-full shadow-sm ring-4 transition-shadow group-hover:shadow-md md:h-28 md:w-28 ${BADGE_COLORS[i % BADGE_COLORS.length]}`}
              >
                <PawPrint className="h-8 w-8 md:h-10 md:w-10" aria-hidden="true" />
              </span>
              <span className="text-center text-[12.5px] font-bold leading-tight text-kudl-amber-ink md:text-sm">
                {breed.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-4 text-right md:mt-6">
        <Link
          href="/products?pet=dogs"
          className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-kudl-dark hover:underline"
        >
          View All Breeds
          <ChevronRight className="h-[15px] w-[15px]" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
