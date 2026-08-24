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
   * Artwork. Unsplash cannot be searched from here, and inventing photo ids
   * would ship URLs that 404, so these are on-brand generated placeholders.
   * Uploading a real image in Medusa Admin replaces them — the storefront and app
   * both read product.thumbnail, so whatever Medusa serves wins automatically.
   */
  const placeholder = (label: string) =>
    `https://placehold.co/1200x1200/eff6ff/2563eb/png?text=${encodeURIComponent(
      label
    )}`

  type ProductSeed = {
    title: string
    handle: string
    /** Which small pet this is for — used only for the placeholder label. */
    pet: string
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
      pet: "Bird",
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
      pet: "Bird",
      description:
        "Natural hardwood perch with a hanging swing and bell. Gives birds something to climb and chew, which keeps beaks trimmed and boredom down.",
      weight: 400,
      variants: [{ title: "Standard", sku: "KUDL-SP-BIRDPERCH-STD", amount: 499 }],
    },
    // ---- Fish ----
    {
      title: "Tropical Fish Flakes",
      handle: "tropical-fish-flakes",
      pet: "Fish",
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
      pet: "Fish",
      description:
        "Air-driven sponge filter for tanks up to 40 litres. Provides gentle biological filtration that will not pull in fry or long-finned fish.",
      weight: 300,
      variants: [{ title: "Up to 40L", sku: "KUDL-SP-SPONGEFILTER-40L", amount: 749 }],
    },
    // ---- Hamsters ----
    {
      title: "Hamster Wooden Chew Sticks",
      handle: "hamster-wooden-chew-sticks",
      pet: "Hamster",
      description:
        "Untreated applewood sticks for hamsters, gerbils and mice. Rodent teeth grow continuously, so daily chewing is a need rather than a treat.",
      weight: 150,
      variants: [{ title: "Pack of 10", sku: "KUDL-SP-CHEWSTICK-10PK", amount: 149 }],
    },
    {
      title: "Silent Spinner Exercise Wheel",
      handle: "silent-spinner-exercise-wheel",
      pet: "Hamster",
      description:
        "Ball-bearing exercise wheel with a solid running surface, so no tail or foot can slip through. Quiet enough to leave in a bedroom overnight.",
      weight: 500,
      variants: [{ title: "18cm", sku: "KUDL-SP-WHEEL-18CM", amount: 599 }],
    },
    // ---- Rabbits ----
    {
      title: "Timothy Hay for Rabbits",
      handle: "timothy-hay-rabbits",
      pet: "Rabbit",
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
      pet: "Rabbit",
      description:
        "Soft-pin brush sized for rabbits and guinea pigs. Regular brushing during a moult reduces the loose fur they would otherwise swallow.",
      weight: 200,
      variants: [{ title: "Standard", sku: "KUDL-SP-RABBITBRUSH-STD", amount: 299 }],
    },
    // ---- Shared across small pets ----
    {
      title: "Aspen Bedding for Small Pets",
      handle: "aspen-bedding-small-pets",
      pet: "Small Pet",
      description:
        "Kiln-dried aspen shavings, absorbent and free of the aromatic oils in pine and cedar that irritate small-animal airways. Suits hamsters, gerbils and rabbits.",
      weight: 2000,
      variants: [{ title: "2kg", sku: "KUDL-SP-BEDDING-2KG", amount: 399 }],
    },
    {
      title: "No-Drip Water Bottle",
      handle: "no-drip-water-bottle",
      pet: "Small Pet",
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
          images: [{ url: placeholder(`${p.pet}\n${p.title}`) }],
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
