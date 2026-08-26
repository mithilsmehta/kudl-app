import { Product } from "@/lib/api"
import ProductCard from "@/components/ProductCard"

export default function ProductGrid({
  products,
  onQuickView,
}: {
  products: Product[]
  onQuickView: (product: Product) => void
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 transition-opacity duration-200 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} onQuickView={onQuickView} />
        </li>
      ))}
    </ul>
  )
}
