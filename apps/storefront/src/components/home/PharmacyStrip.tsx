/**
 * Compact promo band for the Pharmacy branch of the taxonomy (lib/taxonomy.ts)
 * — it's cross-species and condition-based rather than a pet-category tile,
 * so it doesn't fit ShopByPet's grid and gets its own strip instead.
 */

import Link from "next/link"
import { Pill } from "@/components/icons"
import { pharmacyMenu } from "@/lib/taxonomy"

const FEATURED_CATEGORIES = ["Supplements", "Prescription Diet", "Preventive Care", "Pain Medication"]

export default function PharmacyStrip() {
  const pills = pharmacyMenu.filter((cat) => FEATURED_CATEGORIES.includes(cat.category))

  return (
    <section className="mt-5 rounded-kudl-card border border-kudl-border bg-kudl-tint/40 p-4 md:mt-10 md:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Pill className="h-5 w-5 text-kudl-primary" aria-hidden="true" />
        <h2 className="text-[17px] font-bold text-kudl-ink md:text-2xl">
          Pet Pharmacy — Vet-Trusted Care
        </h2>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {pills.map((cat) => (
          <Link
            key={cat.slug}
            href={`/products?pharmacy=${cat.items[0]?.slug ?? cat.slug}`}
            className="rounded-full border border-kudl-border bg-white px-4 py-2 text-sm font-semibold text-kudl-body transition-colors hover:border-kudl-primary hover:text-kudl-primary"
          >
            {cat.category}
          </Link>
        ))}
      </div>
    </section>
  )
}
