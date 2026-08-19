import { getProductBrand } from "@lib/kudl/config"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

const ProductInfo = ({ product }: ProductInfoProps) => {
  const brand = getProductBrand(product)
  const category = product.categories?.[0]

  return (
    <div id="product-info" className="flex flex-col gap-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {brand && (
          <span className="text-xs font-semibold uppercase tracking-wide text-kudl-primary">
            {brand}
          </span>
        )}
        {category && (
          <LocalizedClientLink
            href={`/categories/${category.handle}`}
            className="rounded text-xs text-kudl-muted hover:text-kudl-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary"
          >
            {category.name}
          </LocalizedClientLink>
        )}
      </div>

      <h1
        className="text-2xl font-semibold leading-tight tracking-tight text-kudl-ink small:text-3xl"
        data-testid="product-title"
      >
        {product.title}
      </h1>

      {product.description && (
        <p
          className="whitespace-pre-line text-sm leading-6 text-kudl-muted"
          data-testid="product-description"
        >
          {product.description}
        </p>
      )}
    </div>
  )
}

export default ProductInfo
