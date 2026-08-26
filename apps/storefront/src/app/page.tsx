"use client"

/**
 * Home — port of apps/mobile/app/(tabs)/index.tsx, extended with web-only
 * merchandising sections (Shop by Breed, deals, brands, testimonials, blog,
 * newsletter) that have no mobile-app equivalent to stay in parity with.
 *
 * Section order, copy and colours for the mobile-parity parts follow the app.
 * The layout adapts: the gradient header collapses into the desktop TopNav on
 * md+, the two pet tiles spread wider, and the horizontally-scrolling
 * featured rail becomes a grid.
 */

import Link from "next/link"
import { useEffect, useState } from "react"
import { Search, ShoppingCart, ShoppingBag, ChevronRight, Grid } from "@/components/icons"
import { Product, getProducts, getCategories } from "@/lib/api"
import { isStorefrontPet } from "@/lib/productFacets"
import { useAuth } from "@/context/AuthContext"
import { useCart } from "@/context/CartContext"
import Spinner from "@/components/Spinner"
import ProductCard from "@/components/ProductCard"
import PersonalizedRecommendations from "@/components/recommendations/PersonalizedRecommendations"
import Hero from "@/components/home/Hero"
import CategoryQuickLinks from "@/components/home/CategoryQuickLinks"
import TrustBadges from "@/components/home/TrustBadges"
import ShopByPet from "@/components/home/ShopByPet"
import ShopByBreed from "@/components/home/ShopByBreed"
import StatsStrip from "@/components/home/StatsStrip"
import DealsBanner from "@/components/home/DealsBanner"
import PharmacyStrip from "@/components/home/PharmacyStrip"
import AppPromo from "@/components/home/AppPromo"
import ShopByBrand from "@/components/home/ShopByBrand"
import Testimonials from "@/components/home/Testimonials"
import BlogPreview from "@/components/home/BlogPreview"
import Newsletter from "@/components/home/Newsletter"
import Reveal from "@/components/home/Reveal"
import BackToTop from "@/components/home/BackToTop"

export default function HomePage() {
  const { itemCount } = useCart()
  const { user } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [prods, cats] = await Promise.all([
          getProducts(),
          getCategories(),
        ])
        if (cancelled) return
        setProducts(prods.filter(isStorefrontPet))
        setCategories(cats.filter((c) => c.name !== "Small Pets"))
      } catch (e) {
        console.log("Error loading home data:", e)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const featured = products.slice(0, 6)
  const firstName = user?.first_name

  return (
    <div>
      {/* ---- Mobile gradient header (desktop uses TopNav) ---- */}
      <div className="rounded-b-kudl-header bg-kudl-header px-4 pb-5 pt-4 md:hidden">
        <div className="mb-[18px] flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-blue-200">
              {firstName ? `Hello, ${firstName}` : "Welcome to"}
            </p>
            <p className="mt-0.5 text-[22px] font-extrabold text-white">
              KUDL Pet Store
            </p>
          </div>

          <Link
            href="/cart"
            aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
            className="relative flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/[0.18] text-white"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-kudl-dark bg-kudl-danger px-1 text-[10px] font-extrabold leading-none text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </div>

        {/* Search — tapping jumps to the full catalogue, as in the app */}
        <Link
          href="/products"
          className="flex h-12 items-center gap-2.5 rounded-[14px] bg-white px-3.5"
        >
          <Search className="h-[18px] w-[18px] text-kudl-faint" aria-hidden="true" />
          <span className="text-sm text-kudl-faint">
            Search for food, toys, treats...
          </span>
        </Link>
      </div>

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Hero />

        <CategoryQuickLinks categories={categories} />

        <Reveal><TrustBadges /></Reveal>

        <Reveal><ShopByPet categories={categories} products={products} /></Reveal>

        <Reveal><ShopByBreed /></Reveal>

        <Reveal><StatsStrip /></Reveal>

        {/* ---- Personalized recommendations (falls back to Trending Now) ---- */}
        <Reveal><PersonalizedRecommendations /></Reveal>

        <Reveal><DealsBanner /></Reveal>

        <Reveal><PharmacyStrip /></Reveal>

        {/* ---- Featured products ---- */}
        <Reveal>
          <section className="mt-5 md:mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-kudl-ink md:text-2xl">
                Featured Products
              </h2>
              <Link
                href="/products"
                className="flex items-center gap-0.5 text-[13px] font-semibold text-kudl-primary"
              >
                View All
                <ChevronRight className="h-[15px] w-[15px]" aria-hidden="true" />
              </Link>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner className="h-7 w-7 text-kudl-primary" label="Loading products" />
              </div>
            ) : featured.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-kudl-border bg-white py-8">
                <ShoppingBag className="h-9 w-9 text-kudl-hairline" aria-hidden="true" />
                <p className="mt-2 text-[13px] text-kudl-muted">
                  No products available yet
                </p>
              </div>
            ) : (
              /*
                The app scrolls this rail horizontally. That's kept on mobile, but
                on md+ there's room to show every card at once, so it becomes a grid.
              */
              <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0 xl:grid-cols-6">
                {featured.map((item) => (
                  <li key={item.id} className="w-40 shrink-0 snap-start md:w-auto">
                    <ProductCard product={item} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Reveal>

        {/* ---- Full catalogue CTA ---- */}
        <Reveal>
          <section className="mt-5 md:mt-10">
            <Link
              href="/products"
              className="flex items-center gap-3 rounded-2xl border border-kudl-border bg-white p-3.5 transition-shadow hover:shadow-md"
            >
              <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-kudl-primary">
                <Grid className="h-5 w-5 text-white" aria-hidden="true" />
              </span>
              <span className="flex-1">
                <span className="block text-[14.5px] font-bold text-kudl-ink">
                  Browse full catalogue
                </span>
                <span className="mt-0.5 block text-xs text-kudl-muted">
                  {products.length} {products.length === 1 ? "product" : "products"}{" "}
                  across all categories
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-kudl-faint" aria-hidden="true" />
            </Link>
          </section>
        </Reveal>

        <Reveal><AppPromo /></Reveal>

        <Reveal><ShopByBrand /></Reveal>

        <Reveal><Testimonials /></Reveal>

        <Reveal><BlogPreview /></Reveal>

        <Reveal><Newsletter /></Reveal>
      </div>

      <BackToTop />
    </div>
  )
}
