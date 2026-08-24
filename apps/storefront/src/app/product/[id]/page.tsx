/**
 * Product detail route. The interactive parts (variant choice, quantity, add to
 * cart) live in the client component; this server wrapper exists so each product
 * page ships real per-product metadata. The app has no equivalent — a phone
 * screen is never crawled — but a website that can't be indexed isn't much of a
 * storefront, so the one addition over a literal port is made here.
 */

import type { Metadata } from "next"
import { getProductById } from "@/lib/api"
import ProductDetail from "./ProductDetail"

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const product = await getProductById(id)

  if (!product) {
    return { title: "Product not found" }
  }

  return {
    title: product.title,
    description:
      product.description?.slice(0, 155) ||
      `Buy ${product.title} at KUDL Pet Store.`,
    openGraph: {
      title: product.title,
      description: product.description?.slice(0, 155) || undefined,
      images: product.thumbnail ? [product.thumbnail] : undefined,
    },
  }
}

export default async function ProductPage({ params }: Params) {
  const { id } = await params
  return <ProductDetail id={id} />
}
