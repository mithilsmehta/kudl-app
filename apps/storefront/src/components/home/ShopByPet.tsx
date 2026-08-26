/**
 * Extracted from the homepage's inline "Shop by Pet" grid. Scoped to exactly
 * the three departments this storefront sells into — Dogs, Cats, Pharmacy —
 * so it no longer mirrors whatever categories happen to exist in Medusa
 * (that used to also surface "Small Pets", which this storefront doesn't
 * carry). Dogs/Cats still pick a real product thumbnail per category rather
 * than stock art; Pharmacy has no Medusa category of its own (it's a
 * cross-species taxonomy branch — see lib/taxonomy.ts), so its tile uses the
 * thumbnail of any product tagged with a pharmacyCategory instead.
 */

import Link from "next/link"
import { Product } from "@/lib/api"
import { getPharmacyCategory } from "@/lib/productFacets"
import { PET_THEMES, PET_THEME_FALLBACK } from "@/lib/config"
import ProductImage from "@/components/ProductImage"

interface ShopByPetProps {
  categories: Array<{ id: string; name: string }>
  products: Product[]
}

const SHOP_BY_PET_NAMES = ["Dogs", "Cats"]

export default function ShopByPet({ categories, products }: ShopByPetProps) {
  const petCategories = categories.filter((c) => SHOP_BY_PET_NAMES.includes(c.name))
  if (petCategories.length === 0) return null

  const imageForCategory = (categoryId: string) =>
    products.find(
      (p) => p.categories?.some((c) => c.id === categoryId) && p.thumbnail
    )?.thumbnail

  const pharmacyImage = products.find((p) => getPharmacyCategory(p) && p.thumbnail)?.thumbnail

  const tiles = [
    ...petCategories.map((cat) => ({
      key: cat.id,
      href: `/products?category=${cat.id}`,
      name: cat.name,
      image: imageForCategory(cat.id),
      theme: PET_THEMES[cat.name] || PET_THEME_FALLBACK,
    })),
    {
      key: "pharmacy",
      href: "/products?pharmacyOnly=1",
      name: "Pharmacy",
      image: pharmacyImage,
      theme: PET_THEMES.Pharmacy || PET_THEME_FALLBACK,
    },
  ]

  return (
    <section className="mt-5 md:mt-10">
      <h2 className="mb-3 text-[17px] font-bold text-kudl-ink md:text-2xl">
        Shop by Pet
      </h2>
      {/* Fixed three tiles, so a plain 3-up grid rather than the old auto-fit one. */}
      <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
        {tiles.map((tile) => (
          <Link
            key={tile.key}
            href={tile.href}
            className={`relative block h-[150px] overflow-hidden rounded-kudl-tile bg-kudl-border md:h-[260px] ${
              // Odd tile count on the 2-column mobile grid — let the last
              // tile (Pharmacy) span the row instead of leaving a gap.
              tiles.length % 2 === 1 && tile.key === "pharmacy" ? "col-span-2 md:col-span-1" : ""
            }`}
          >
            <ProductImage
              src={tile.image}
              alt={`${tile.name} products`}
              sizes="(max-width: 767px) 50vw, 560px"
              iconClassName="h-10 w-10"
            />
            {/* Gradient scrim so the white label stays readable over any photo */}
            <div
              className="absolute inset-x-0 bottom-0 h-[72%]"
              style={{
                backgroundImage: `linear-gradient(to bottom, transparent, ${tile.theme.to})`,
              }}
              aria-hidden="true"
            />
            <div className="absolute inset-x-3.5 bottom-3">
              <p className="text-lg font-extrabold text-white md:text-2xl">
                {tile.name}
              </p>
              <p className="mt-px text-[11.5px] text-white/90 md:text-sm">
                {tile.theme.tagline}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
