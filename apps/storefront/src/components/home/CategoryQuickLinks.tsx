/**
 * Quick-filter pill row directly under the hero — a shortcut into the same
 * `/products?category=` / `?q=` deep links Shop by Pet and the nav search
 * already use, just surfaced earlier on the page.
 */

import Link from "next/link"
import { Sparkles, Percent } from "@/components/icons"

interface CategoryQuickLinksProps {
  categories: Array<{ id: string; name: string }>
}

export default function CategoryQuickLinks({ categories }: CategoryQuickLinksProps) {
  return (
    <nav aria-label="Quick category filters" className="mt-4 md:mt-6">
      <ul className="no-scrollbar flex snap-x gap-2 overflow-x-auto">
        <li className="shrink-0 snap-start">
          <Link
            href="/products"
            className="inline-block rounded-full border border-kudl-border bg-white px-4 py-2 text-[13px] font-semibold text-kudl-ink transition-colors hover:border-kudl-primary hover:text-kudl-primary"
          >
            All Products
          </Link>
        </li>
        {categories.map((cat) => (
          <li key={cat.id} className="shrink-0 snap-start">
            <Link
              href={`/products?category=${cat.id}`}
              className="inline-block rounded-full border border-kudl-border bg-white px-4 py-2 text-[13px] font-semibold text-kudl-ink transition-colors hover:border-kudl-primary hover:text-kudl-primary"
            >
              {cat.name}
            </Link>
          </li>
        ))}
        <li className="shrink-0 snap-start">
          <Link
            href="/products?q=treat"
            className="inline-flex items-center gap-1 rounded-full border border-kudl-coral bg-kudl-coral-light px-4 py-2 text-[13px] font-semibold text-kudl-coral transition-opacity hover:opacity-80"
          >
            <Percent className="h-3.5 w-3.5" aria-hidden="true" />
            Deals
          </Link>
        </li>
        <li className="shrink-0 snap-start">
          <Link
            href="/products"
            className="inline-flex items-center gap-1 rounded-full border border-kudl-violet bg-kudl-violet-light px-4 py-2 text-[13px] font-semibold text-kudl-violet transition-opacity hover:opacity-80"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            New In
          </Link>
        </li>
      </ul>
    </nav>
  )
}
