/*
 * Prices here are in MAJOR units: `amount: 349` means ₹349, not ₹3.49. Medusa
 * v2's pricing module stores and returns decimal major units. See the same note
 * at the top of seed-kudl-pets.ts.
 */
import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Adds the "Small Pets" range — birds, fish, hamsters and rabbits — alongside the
 * existing Dogs and Cats categories.
 *
 * Kept as its own script rather than folded into seed-kudl-pets.ts so it can be
 * run against a store that is already seeded, without touching the dog and cat
 * catalogue. Re-running is safe: the category and every product are matched on a
 * stable key first and skipped if present.
 *
 * Run with:  npm run backend:seed:small-pets
 */
export default async function seedKudlSmallPets({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const CATEGORY_NAME = "Small Pets"

  // ---- Prerequisites created by the main seed ----
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const defaultSalesChannel = salesChannels[0]
  if (!defaultSalesChannel) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No sales channel found. Run seed-kudl-pets.ts first."
    )
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
  })
  const shippingProfile = shippingProfiles[0]
  if (!shippingProfile) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No shipping profile found. Run seed-kudl-pets.ts first."
    )
  }

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  const stockLocation = stockLocations[0]
  if (!stockLocation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No stock location found. Run seed-kudl-pets.ts first."
    )
  }

  // ---- Category ----
  logger.info(`Seeding "${CATEGORY_NAME}" category...`)
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  })

  if (!existingCategories.some((c: any) => c.name === CATEGORY_NAME)) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: [{ name: CATEGORY_NAME, is_active: true }],
      },
    })
    logger.info(`Created category "${CATEGORY_NAME}".`)
  } else {
    logger.info(`Category "${CATEGORY_NAME}" already exists, skipping.`)
  }

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  })
  const smallPets = categories.find((c: any) => c.name === CATEGORY_NAME)
  if (!smallPets) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Could not resolve the "${CATEGORY_NAME}" category after creating it.`
    )
  }

  /*
   * These products now ship WITH stock photography (Unsplash), matching the
   * pattern in seed-kudl-pets.ts's `productImages` map. They originally
   * shipped without images — real photography wasn't available and a
   * generated "text on a box" placeholder looked worse than the grey
   * fallback icon both clients render for a missing thumbnail — but a
   * products-listing page where a fifth of the catalogue is permanently
   * blank reads as broken rather than deliberate, so every product gets a
   * real (if generic) photo instead. Swap for real product photography in
   * Medusa Admin whenever it's available; both clients already prefer
   * whatever Medusa serves over these placeholders.
   */
  const productImages: Record<string, string> = {
    "budgie-cockatiel-seed-mix":
      "https://images.unsplash.com/photo-1591198936750-16d8e15edb9e?w=1200&h=1200&fit=crop",
    "bird-cage-perch-swing-set":
      "https://images.unsplash.com/photo-1522858547137-f1dcec554f55?w=1200&h=1200&fit=crop",
    "tropical-fish-flakes":
      "https://images.unsplash.com/photo-1524704796725-9fc3044a58b2?w=1200&h=1200&fit=crop",
    "aquarium-sponge-filter":
      "https://images.unsplash.com/photo-1520302519568-1c69dab5b19a?w=1200&h=1200&fit=crop",
    "hamster-wooden-chew-sticks":
      "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=1200&h=1200&fit=crop",
    "silent-spinner-exercise-wheel":
      "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=1200&h=1200&fit=crop",
    "timothy-hay-rabbits":
      "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=1200&h=1200&fit=crop",
    "rabbit-grooming-brush":
      "https://images.unsplash.com/photo-1591561582301-7ce6588cc286?w=1200&h=1200&fit=crop",
    "aspen-bedding-small-pets":
      "https://images.unsplash.com/photo-1591946614720-90a587da4a36?w=1200&h=1200&fit=crop",
    "no-drip-water-bottle":
      "https://images.unsplash.com/photo-1560743641-3914f2c45636?w=1200&h=1200&fit=crop",
  }

  /*
   * Facet metadata for the storefront's /products filters, following the
   * same brand/category/petType/rating pattern seed-kudl-merchandising.ts
   * stamps on the Dogs/Cats catalogue. Fixed demo values, not random, so
   * re-seeding is deterministic. There's no per-species brand here — all ten
   * products carry the KUDL Essentials house brand. `petType` splits the
   * single flat "Small Pets" category into the five pet types the storefront
   * filters by (birds / fish / small-pets for hamsters, rabbits and shared
   * supplies).
   */
  const productFacets: Record<
    string,
    {
      petType: "birds" | "fish" | "small-pets"
      category:
        | "food"
        | "treats"
        | "toys"
        | "grooming-health"
        | "litter-habitat"
        | "accessories"
      rating: number
      reviewCount: number
    }
  > = {
    "budgie-cockatiel-seed-mix": {
      petType: "birds",
      category: "food",
      rating: 4.2,
      reviewCount: 37,
    },
    "bird-cage-perch-swing-set": {
      petType: "birds",
      category: "accessories",
      rating: 4.0,
      reviewCount: 22,
    },
    "tropical-fish-flakes": {
      petType: "fish",
      category: "food",
      rating: 4.3,
      reviewCount: 61,
    },
    "aquarium-sponge-filter": {
      petType: "fish",
      category: "accessories",
      rating: 4.1,
      reviewCount: 29,
    },
    "hamster-wooden-chew-sticks": {
      petType: "small-pets",
      category: "treats",
      rating: 4.4,
      reviewCount: 44,
    },
    "silent-spinner-exercise-wheel": {
      petType: "small-pets",
      category: "accessories",
      rating: 4.6,
      reviewCount: 53,
    },
    "timothy-hay-rabbits": {
      petType: "small-pets",
      category: "food",
      rating: 4.5,
      reviewCount: 68,
    },
    "rabbit-grooming-brush": {
      petType: "small-pets",
      category: "grooming-health",
      rating: 3.9,
      reviewCount: 18,
    },
    "aspen-bedding-small-pets": {
      petType: "small-pets",
      category: "litter-habitat",
      rating: 4.2,
      reviewCount: 31,
    },
    "no-drip-water-bottle": {
      petType: "small-pets",
      category: "accessories",
      rating: 4.0,
      reviewCount: 26,
    },
  }

  type ProductSeed = {
    title: string
    handle: string
    description: string
    /** Grams, used by shipping calculations. */
    weight: number
    variants: { title: string; sku: string; amount: number }[]
  }

  const products: ProductSeed[] = [
    // ---- Birds ----
    {
      title: "Budgie & Cockatiel Seed Mix",
      handle: "budgie-cockatiel-seed-mix",
      description:
        "A balanced daily blend of millet, canary seed and oats for budgies, cockatiels and other small hookbills. Cleaned and dust-extracted so the cage stays tidy.",
      weight: 1000,
      variants: [
        { title: "500g", sku: "KUDL-SP-BIRDSEED-500G", amount: 249 },
        { title: "1kg", sku: "KUDL-SP-BIRDSEED-1KG", amount: 429 },
      ],
    },
    {
      title: "Bird Cage Perch & Swing Set",
      handle: "bird-cage-perch-swing-set",
      description:
        "Natural hardwood perch with a hanging swing and bell. Gives birds something to climb and chew, which keeps beaks trimmed and boredom down.",
      weight: 400,
      variants: [{ title: "Standard", sku: "KUDL-SP-BIRDPERCH-STD", amount: 499 }],
    },
    // ---- Fish ----
    {
      title: "Tropical Fish Flakes",
      handle: "tropical-fish-flakes",
      description:
        "Everyday flake food for community tropical fish. Floats long enough for surface feeders and sinks slowly for mid-water species, with colour-enhancing carotenoids.",
      weight: 200,
      variants: [
        { title: "100g", sku: "KUDL-SP-FISHFLAKE-100G", amount: 199 },
        { title: "250g", sku: "KUDL-SP-FISHFLAKE-250G", amount: 379 },
      ],
    },
    {
      title: "Aquarium Sponge Filter",
      handle: "aquarium-sponge-filter",
      description:
        "Air-driven sponge filter for tanks up to 40 litres. Provides gentle biological filtration that will not pull in fry or long-finned fish.",
      weight: 300,
      variants: [{ title: "Up to 40L", sku: "KUDL-SP-SPONGEFILTER-40L", amount: 749 }],
    },
    // ---- Hamsters ----
    {
      title: "Hamster Wooden Chew Sticks",
      handle: "hamster-wooden-chew-sticks",
      description:
        "Untreated applewood sticks for hamsters, gerbils and mice. Rodent teeth grow continuously, so daily chewing is a need rather than a treat.",
      weight: 150,
      variants: [{ title: "Pack of 10", sku: "KUDL-SP-CHEWSTICK-10PK", amount: 149 }],
    },
    {
      title: "Silent Spinner Exercise Wheel",
      handle: "silent-spinner-exercise-wheel",
      description:
        "Ball-bearing exercise wheel with a solid running surface, so no tail or foot can slip through. Quiet enough to leave in a bedroom overnight.",
      weight: 500,
      variants: [{ title: "18cm", sku: "KUDL-SP-WHEEL-18CM", amount: 599 }],
    },
    // ---- Rabbits ----
    {
      title: "Timothy Hay for Rabbits",
      handle: "timothy-hay-rabbits",
      description:
        "High-fibre first-cut Timothy hay for rabbits and guinea pigs. Hay should make up the bulk of a rabbit's diet — it keeps the gut moving and wears teeth down evenly.",
      weight: 1000,
      variants: [
        { title: "1kg", sku: "KUDL-SP-TIMOTHYHAY-1KG", amount: 449 },
        { title: "2.5kg", sku: "KUDL-SP-TIMOTHYHAY-2500G", amount: 899 },
      ],
    },
    {
      title: "Rabbit Grooming Brush",
      handle: "rabbit-grooming-brush",
      description:
        "Soft-pin brush sized for rabbits and guinea pigs. Regular brushing during a moult reduces the loose fur they would otherwise swallow.",
      weight: 200,
      variants: [{ title: "Standard", sku: "KUDL-SP-RABBITBRUSH-STD", amount: 299 }],
    },
    // ---- Shared across small pets ----
    {
      title: "Aspen Bedding for Small Pets",
      handle: "aspen-bedding-small-pets",
      description:
        "Kiln-dried aspen shavings, absorbent and free of the aromatic oils in pine and cedar that irritate small-animal airways. Suits hamsters, gerbils and rabbits.",
      weight: 2000,
      variants: [{ title: "2kg", sku: "KUDL-SP-BEDDING-2KG", amount: 399 }],
    },
    {
      title: "No-Drip Water Bottle",
      handle: "no-drip-water-bottle",
      description:
        "Cage-mounted water bottle with a stainless steel ball valve that releases water only when licked, so bedding stays dry. Fits wire cages and most hutches.",
      weight: 250,
      variants: [{ title: "500ml", sku: "KUDL-SP-WATERBOTTLE-500ML", amount: 249 }],
    },
  ]

  // ---- Products ----
  logger.info("Seeding Small Pets products...")
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  })
  const existingHandles = new Set(existingProducts.map((p: any) => p.handle))
  const newProducts = products.filter((p) => !existingHandles.has(p.handle))

  if (newProducts.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: newProducts.map((p) => ({
          title: p.title,
          category_ids: [smallPets.id],
          description: p.description,
          handle: p.handle,
          weight: p.weight,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [{ url: productImages[p.handle] }],
          metadata: {
            brand: "KUDL Essentials",
            inStock: true,
            ...productFacets[p.handle],
          },
          // Declared inline so each product owns an exclusive Pack Size option
          // holding only its own values, matching seed-kudl-pets.ts.
          options: [
            { title: "Pack Size", values: p.variants.map((v) => v.title) },
          ],
          variants: p.variants.map((v) => ({
            title: v.title,
            sku: v.sku,
            options: { "Pack Size": v.title },
            prices: [{ amount: v.amount, currency_code: "inr" }],
          })),
          sales_channels: [{ id: defaultSalesChannel.id }],
        })),
      },
    })
    logger.info(`Created ${newProducts.length} Small Pets products.`)
  } else {
    logger.info("Small Pets products already exist, skipping.")
  }

  // ---- Backfill images + facet metadata on products that already existed ----
  // createProductsWorkflow above only runs for brand-new products, so a store
  // seeded before this metadata/image support was added needs its existing
  // Small Pets products updated separately, matching the update-by-handle
  // pattern in seed-kudl-merchandising.ts.
  const { data: allSmallPetProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "metadata", "thumbnail"],
    filters: { handle: products.map((p) => p.handle) },
  })

  const facetUpdates = allSmallPetProducts
    .filter((p: any) => productFacets[p.handle])
    .map((p: any) => ({
      id: p.id,
      images: [{ url: productImages[p.handle] }],
      metadata: {
        ...(p.metadata ?? {}),
        brand: "KUDL Essentials",
        inStock: p.metadata?.inStock ?? true,
        ...productFacets[p.handle],
      },
    }))

  if (facetUpdates.length) {
    await updateProductsWorkflow(container).run({
      input: { products: facetUpdates },
    })
    logger.info(
      `Updated ${facetUpdates.length} Small Pets products with images + facet metadata.`
    )
  }

  // ---- Inventory ----
  // Without a stocked level every variant reads as out of stock and cannot be
  // added to a cart.
  const newSkus = new Set(
    newProducts.flatMap((p) => p.variants.map((v) => v.sku))
  )
  if (newSkus.size) {
    logger.info("Seeding Small Pets inventory levels...")
    const { data: inventoryItems } = await query.graph({
      entity: "inventory_item",
      fields: ["id", "sku"],
    })
    const newInventoryItems = inventoryItems.filter((i: any) =>
      newSkus.has(i.sku)
    )
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: newInventoryItems.map((item: any) => ({
          location_id: stockLocation.id,
          stocked_quantity: 1000,
          inventory_item_id: item.id,
        })),
      },
    })
  }

  logger.info("Finished seeding KUDL Small Pets data.")
}
