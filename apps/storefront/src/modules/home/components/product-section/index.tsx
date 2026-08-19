import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import SectionHeading from "@modules/home/components/section-heading"
import ProductPreview from "@modules/products/components/product-preview"

/**
 * A homepage product rail. Products are fetched from Medusa by handle; the
 * handles themselves come from the KUDL config layer, which is the only
 * merchandising decision made outside Medusa.
 */
const ProductSection = async ({
  title,
  subtitle,
  handles,
  countryCode,
  region,
  isFeatured,
  className = "",
}: {
  title: string
  subtitle?: string
  handles: string[]
  countryCode: string
  region: HttpTypes.StoreRegion
  isFeatured?: boolean
  className?: string
}) => {
  const {
    response: { products },
  } = await listProducts({
    countryCode,
    queryParams: { handle: handles, limit: handles.length },
  })

  if (!products.length) {
    return null
  }

  // Preserve the configured order rather than Medusa's default ordering.
  const ordered = handles
    .map((handle) => products.find((product) => product.handle === handle))
    .filter((product): product is HttpTypes.StoreProduct => Boolean(product))

  return (
    <section className={`content-container py-14 small:py-16 ${className}`}>
      <SectionHeading
        title={title}
        subtitle={subtitle}
        href="/shop"
        linkLabel="View all"
      />

      <ul className="grid grid-cols-2 gap-4 small:grid-cols-4 small:gap-6">
        {ordered.map((product) => (
          <li key={product.id} className="flex">
            <div className="w-full">
              <ProductPreview
                product={product}
                region={region}
                isFeatured={isFeatured}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ProductSection
