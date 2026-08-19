import { listCategories } from "@lib/data/categories"
import { CATEGORY_TILES } from "@lib/kudl/config"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SectionHeading from "@modules/home/components/section-heading"
import Image from "next/image"

/**
 * Category tiles. The configured tiles are intersected with the categories that
 * actually exist in Medusa, so a tile can never link to a missing category.
 */
const CategoryCards = async () => {
  const categories = await listCategories().catch(() => [])

  const existingHandles = new Set(
    (categories ?? []).map((category) => category.handle)
  )

  const tiles = CATEGORY_TILES.filter((tile) =>
    existingHandles.has(tile.handle)
  )

  if (!tiles.length) {
    return null
  }

  return (
    <section className="bg-kudl-soft py-14 small:py-16">
      <div className="content-container">
        <SectionHeading
          title="Shop by Category"
          subtitle="Straight to what you came for."
          href="/shop"
          linkLabel="View all products"
        />

        <ul className="grid grid-cols-2 gap-4 xsmall:grid-cols-3 small:grid-cols-5">
          {tiles.map((tile) => (
            <li key={tile.handle}>
              <LocalizedClientLink
                href={`/categories/${tile.handle}`}
                className="group flex h-full flex-col items-center gap-3 rounded-xl border border-kudl-border bg-white p-5 text-center transition-all hover:border-kudl-primary hover:shadow-[0_6px_18px_rgba(23,23,23,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2"
              >
                <span className="grid h-14 w-14 place-items-center rounded-full bg-kudl-light">
                  <Image
                    src={tile.icon}
                    alt=""
                    width={28}
                    height={28}
                    aria-hidden="true"
                    className="h-7 w-7 transition-transform duration-200 group-hover:scale-110"
                  />
                </span>
                <span className="text-sm font-medium leading-snug text-kudl-ink">
                  {tile.label}
                </span>
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default CategoryCards
