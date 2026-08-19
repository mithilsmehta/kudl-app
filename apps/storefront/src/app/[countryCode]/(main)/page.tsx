import { Metadata } from "next"

import { getRegion } from "@lib/data/regions"
import { BEST_SELLER_HANDLES, FEATURED_HANDLES } from "@lib/kudl/config"
import BrandSection from "@modules/home/components/brand-section"
import CategoryCards from "@modules/home/components/category-cards"
import Hero from "@modules/home/components/hero"
import Newsletter from "@modules/home/components/newsletter"
import PetCareSection from "@modules/home/components/pet-care-section"
import ProductSection from "@modules/home/components/product-section"
import PromoBanner from "@modules/home/components/promo-banner"
import ShopByPet from "@modules/home/components/shop-by-pet"
import TrustSection from "@modules/home/components/trust-section"

export const metadata: Metadata = {
  title: "KUDL Pets | Everything Your Pet Needs",
  description:
    "KUDL Pets is an Indian pet store for dogs and cats — food, treats, toys and grooming essentials, delivered across India.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  return (
    <>
      <Hero />
      <ShopByPet />
      <CategoryCards />
      <ProductSection
        title="Featured Products"
        subtitle="Hand-picked essentials for dogs and cats."
        handles={FEATURED_HANDLES}
        countryCode={countryCode}
        region={region}
        isFeatured
      />
      <PromoBanner />
      <ProductSection
        title="Best Sellers"
        subtitle="What pet parents keep reordering."
        handles={BEST_SELLER_HANDLES}
        countryCode={countryCode}
        region={region}
      />
      <TrustSection />
      <BrandSection />
      <PetCareSection />
      <Newsletter />
    </>
  )
}
