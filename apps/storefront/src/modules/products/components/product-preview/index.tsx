import { getProductPrice } from "@lib/util/get-product-price"
import { getProductBrand, resolveProductImage } from "@lib/kudl/config"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WishlistButton from "@modules/common/components/wishlist-button"
import Image from "next/image"
import QuickAddToCart from "./quick-add-to-cart"

/**
 * Product card used across the homepage rails, the shop grid and category
 * pages. Every value shown here comes from Medusa -- title, brand metadata,
 * calculated price, sale price and inventory. Nothing is invented: there is no
 * rating UI because this project has no review data.
 */
export default function ProductPreview({
  product,
  isFeatured,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region?: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({ product })

  const brand = getProductBrand(product)
  const imageSrc = resolveProductImage(product)

  const variants = product.variants ?? []
  const needsVariantChoice = variants.length > 1
  const onlyVariant = variants.length === 1 ? variants[0] : undefined

  // Mirrors the product page's in-stock logic so the grid agrees with detail.
  const variantInStock = (variant: HttpTypes.StoreProductVariant) =>
    !variant.manage_inventory ||
    Boolean(variant.allow_backorder) ||
    (variant.inventory_quantity ?? 0) > 0

  const inStock = variants.some(variantInStock)

  const isOnSale = cheapestPrice?.price_type === "sale"

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-kudl-border bg-white transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(23,23,23,0.08)]">
      <LocalizedClientLink
        href={`/products/${product.handle}`}
        className="flex flex-1 flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-inset"
      >
        {/* Fixed 1:1 image area on a soft ground, so cards line up exactly. */}
        <div className="relative aspect-square w-full overflow-hidden bg-kudl-soft">
          <Image
            src={imageSrc}
            alt={product.title ?? "Product"}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-6 transition-transform duration-300 group-hover:scale-[1.04]"
          />

          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {isOnSale && cheapestPrice?.percentage_diff && (
              <span className="rounded-md bg-kudl-sale px-2 py-1 text-[11px] font-semibold leading-none text-white">
                {cheapestPrice.percentage_diff}% OFF
              </span>
            )}
            {isFeatured && !isOnSale && (
              <span className="rounded-md bg-kudl-light px-2 py-1 text-[11px] font-semibold leading-none text-kudl-dark">
                Featured
              </span>
            )}
            {!inStock && (
              <span className="rounded-md bg-kudl-ink/80 px-2 py-1 text-[11px] font-semibold leading-none text-white">
                Out of stock
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-4">
          {brand && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-kudl-primary">
              {brand}
            </span>
          )}

          {/* Clamped to two lines so a long title can never push the CTA row. */}
          <h3
            className="line-clamp-2 text-sm font-medium leading-snug text-kudl-ink min-h-[2.5rem]"
            data-testid="product-title"
          >
            {product.title}
          </h3>

          <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2">
            {cheapestPrice ? (
              <>
                <span className="text-base font-semibold text-kudl-ink">
                  {cheapestPrice.calculated_price}
                </span>
                {isOnSale && (
                  <span className="text-xs text-kudl-muted line-through">
                    {cheapestPrice.original_price}
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-kudl-muted">
                Price unavailable
              </span>
            )}
          </div>

          {needsVariantChoice && (
            <span className="text-[11px] text-kudl-muted">
              {variants.length} pack sizes
            </span>
          )}
        </div>
      </LocalizedClientLink>

      <div className="px-4 pb-4">
        <QuickAddToCart
          variantId={onlyVariant?.id}
          productHandle={product.handle ?? ""}
          inStock={inStock}
          needsVariantChoice={needsVariantChoice}
        />
      </div>

      <div className="absolute right-3 top-3">
        <WishlistButton productId={product.id!} />
      </div>
    </div>
  )
}
