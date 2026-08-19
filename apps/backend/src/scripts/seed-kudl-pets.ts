import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

// Seeds an India / INR region plus a KUDL Pets demo catalog (dog + cat
// products) on top of the starter's existing EU seed data. Safe to re-run:
// every step checks for an existing record before creating one.
export default async function seed_kudl_pets({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const defaultSalesChannel = salesChannels[0]
  if (!defaultSalesChannel) {
    throw new Error(
      "No sales channel found. Run the starter's initial-data-seed first."
    )
  }

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.currency_code", "supported_currencies.is_default"],
  })
  const store = stores[0]
  if (!store) {
    throw new Error("No store found. Run the starter's initial-data-seed first.")
  }

  const hasInr = store.supported_currencies?.some(
    (c: any) => c.currency_code === "inr"
  )
  if (!hasInr) {
    logger.info("Adding INR to store supported currencies...")
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: [
            ...(store.supported_currencies ?? []).map((c: any) => ({
              currency_code: c.currency_code,
              is_default: c.is_default,
            })),
            { currency_code: "inr", is_default: false },
          ],
        },
      },
    })
  }

  logger.info("Seeding India region...")
  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
  })
  let region: any = existingRegions.find(
    (r: any) => r.currency_code === "inr"
  )
  if (!region) {
    const { result: regionResult } = await createRegionsWorkflow(
      container
    ).run({
      input: {
        regions: [
          {
            name: "India",
            currency_code: "inr",
            countries: ["in"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    region = regionResult[0]
    logger.info("Finished seeding India region.")
  } else {
    logger.info("India region already exists, skipping.")
  }

  logger.info("Seeding India tax region...")
  const { data: existingTaxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
  })
  if (!existingTaxRegions.some((t: any) => t.country_code === "in")) {
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: "in", provider_id: "tp_system" }],
    })
  }

  logger.info("Seeding India stock location...")
  const { data: existingLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  let stockLocation: any = existingLocations.find(
    (l: any) => l.name === "India Warehouse"
  )
  if (!stockLocation) {
    const { result: stockLocationResult } = await createStockLocationsWorkflow(
      container
    ).run({
      input: {
        locations: [
          {
            name: "India Warehouse",
            address: {
              city: "Bengaluru",
              country_code: "IN",
              address_1: "",
            },
          },
        ],
      },
    })
    stockLocation = stockLocationResult[0]

    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })

    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocation.id, add: [defaultSalesChannel.id] },
    })
  } else {
    logger.info("India Warehouse already exists, skipping.")
  }

  logger.info("Seeding India fulfillment + shipping options...")
  const { data: shippingProfileResult } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfile = shippingProfileResult[0]

  const { data: existingFulfillmentSets } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "name", "service_zones.id", "service_zones.name"],
  })
  let fulfillmentSet: any = existingFulfillmentSets.find(
    (f: any) => f.name === "India Warehouse delivery"
  )
  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "India Warehouse delivery",
      type: "shipping",
      service_zones: [
        {
          name: "India",
          geo_zones: [{ country_code: "in", type: "country" }],
        },
      ],
    })

    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
    })

    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: "Ship in 3-5 days.",
            code: "standard",
          },
          prices: [
            { currency_code: "inr", amount: 99 },
            { region_id: region.id, amount: 99 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
        {
          name: "Express Shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Express",
            description: "Ship in 24-48 hours.",
            code: "express",
          },
          prices: [
            { currency_code: "inr", amount: 199 },
            { region_id: region.id, amount: 199 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    })
  } else {
    logger.info("India fulfillment set already exists, skipping.")
  }

  logger.info("Seeding Dogs/Cats categories...")
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  })
  const categoryNames = ["Dogs", "Cats"]
  const missingCategoryNames = categoryNames.filter(
    (name) => !existingCategories.some((c: any) => c.name === name)
  )
  if (missingCategoryNames.length) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingCategoryNames.map((name) => ({
          name,
          is_active: true,
        })),
      },
    })
  }
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  })
  const dogsCategory = categories.find((c: any) => c.name === "Dogs")
  const catsCategory = categories.find((c: any) => c.name === "Cats")

  logger.info("Seeding KUDL Pets product data...")
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  })
  const existingHandles = new Set(existingProducts.map((p: any) => p.handle))

  const productImages: Record<string, string> = {
    "pedigree-adult-dog-food":
      "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=1200&h=1200&fit=crop",
    "royal-canin-mini-adult":
      "https://images.unsplash.com/photo-1764249453850-faace6e57444?w=1200&h=1200&fit=crop",
    "drools-puppy-food":
      "https://images.unsplash.com/photo-1723065314557-e2a6b8a41d08?w=1200&h=1200&fit=crop",
    "dog-dental-chew":
      "https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=1200&h=1200&fit=crop",
    "rubber-dog-ball":
      "https://images.unsplash.com/photo-1670898839060-8b0a8902ee1e?w=1200&h=1200&fit=crop",
    "dog-grooming-shampoo":
      "https://images.unsplash.com/photo-1681305694935-9048ba34d72f?w=1200&h=1200&fit=crop",
    "whiskas-adult-cat-food":
      "https://images.unsplash.com/photo-1558993457-4bc6ec2c3734?w=1200&h=1200&fit=crop",
    "whiskas-tuna-treats":
      "https://images.unsplash.com/photo-1781120810307-e35a8dc5ca9e?w=1200&h=1200&fit=crop",
    "cat-litter-5kg":
      "https://images.unsplash.com/photo-1727510153658-643787acb16a?w=1200&h=1200&fit=crop",
    "interactive-cat-toy":
      "https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=1200&h=1200&fit=crop",
    "cat-grooming-brush":
      "https://images.unsplash.com/photo-1592404959620-886f59d6443a?w=1200&h=1200&fit=crop",
  }

  type ProductSeed = {
    title: string
    handle: string
    category: "dogs" | "cats"
    description: string
    weight: number
    variants: { title: string; sku: string; amount: number }[]
  }

  const products: ProductSeed[] = [
    {
      title: "Pedigree Adult Dog Food",
      handle: "pedigree-adult-dog-food",
      category: "dogs",
      description:
        "Complete and balanced nutrition for adult dogs, with real chicken and essential vitamins for a healthy coat and strong bones.",
      weight: 1000,
      variants: [
        { title: "1kg", sku: "KUDL-DOG-PEDIGREE-1KG", amount: 699 },
        { title: "3kg", sku: "KUDL-DOG-PEDIGREE-3KG", amount: 1899 },
      ],
    },
    {
      title: "Royal Canin Mini Adult",
      handle: "royal-canin-mini-adult",
      category: "dogs",
      description:
        "Tailored nutrition for adult small-breed dogs, supporting healthy digestion and a shiny coat.",
      weight: 1000,
      variants: [{ title: "1kg", sku: "KUDL-DOG-ROYALCANIN-1KG", amount: 1299 }],
    },
    {
      title: "Drools Puppy Food",
      handle: "drools-puppy-food",
      category: "dogs",
      description:
        "Specially formulated puppy food with optimal protein levels to support healthy growth and development.",
      weight: 1000,
      variants: [
        { title: "1kg", sku: "KUDL-DOG-DROOLS-1KG", amount: 599 },
        { title: "3kg", sku: "KUDL-DOG-DROOLS-3KG", amount: 1499 },
      ],
    },
    {
      title: "Dog Dental Chew",
      handle: "dog-dental-chew",
      category: "dogs",
      description:
        "Tasty dental chews that help reduce plaque and tartar buildup while freshening breath.",
      weight: 300,
      variants: [{ title: "Pack of 4", sku: "KUDL-DOG-DENTALCHEW-4PK", amount: 249 }],
    },
    {
      title: "Rubber Dog Ball",
      handle: "rubber-dog-ball",
      category: "dogs",
      description:
        "Durable bouncy rubber ball for fetch and chew play, built to withstand energetic dogs.",
      weight: 150,
      variants: [{ title: "Medium", sku: "KUDL-DOG-BALL-MED", amount: 199 }],
    },
    {
      title: "Dog Grooming Shampoo",
      handle: "dog-grooming-shampoo",
      category: "dogs",
      description:
        "Gentle, pH-balanced shampoo that cleans and conditions your dog's coat while soothing the skin.",
      weight: 250,
      variants: [{ title: "200ml", sku: "KUDL-DOG-SHAMPOO-200ML", amount: 349 }],
    },
    {
      title: "Whiskas Adult Cat Food",
      handle: "whiskas-adult-cat-food",
      category: "cats",
      description:
        "Nutritionally complete dry food for adult cats, made with real ingredients for a healthy, active life.",
      weight: 1200,
      variants: [
        { title: "1.2kg", sku: "KUDL-CAT-WHISKAS-1.2KG", amount: 499 },
        { title: "3kg", sku: "KUDL-CAT-WHISKAS-3KG", amount: 1199 },
      ],
    },
    {
      title: "Whiskas Tuna Treats",
      handle: "whiskas-tuna-treats",
      category: "cats",
      description:
        "Irresistible tuna-flavoured treats, perfect for rewarding your cat or as a between-meal snack.",
      weight: 100,
      variants: [{ title: "8x Pack", sku: "KUDL-CAT-TREATS-8PK", amount: 199 }],
    },
    {
      title: "Cat Litter 5kg",
      handle: "cat-litter-5kg",
      category: "cats",
      description:
        "Highly absorbent clumping cat litter that controls odour and makes cleanup quick and easy.",
      weight: 5000,
      variants: [{ title: "5kg", sku: "KUDL-CAT-LITTER-5KG", amount: 699 }],
    },
    {
      title: "Interactive Cat Toy",
      handle: "interactive-cat-toy",
      category: "cats",
      description:
        "A stimulating interactive toy that keeps your cat entertained and active, indoors or outdoors.",
      weight: 200,
      variants: [{ title: "Standard", sku: "KUDL-CAT-TOY-STD", amount: 299 }],
    },
    {
      title: "Cat Grooming Brush",
      handle: "cat-grooming-brush",
      category: "cats",
      description:
        "Soft-bristle grooming brush that removes loose fur and reduces shedding, keeping your cat's coat healthy.",
      weight: 100,
      variants: [{ title: "Standard", sku: "KUDL-CAT-BRUSH-STD", amount: 249 }],
    },
  ]

  const newProducts = products.filter((p) => !existingHandles.has(p.handle))

  if (newProducts.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: newProducts.map((p) => ({
          title: p.title,
          category_ids: [
            p.category === "dogs" ? dogsCategory!.id : catsCategory!.id,
          ],
          description: p.description,
          handle: p.handle,
          weight: p.weight,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [{ url: productImages[p.handle] }],
          // Declared inline so each product owns an exclusive Pack Size option
          // holding only its own values. Sharing one global option across
          // products would offer pack sizes a product has no variant for.
          options: [
            {
              title: "Pack Size",
              values: p.variants.map((v) => v.title),
            },
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
    logger.info(`Created ${newProducts.length} KUDL Pets products.`)
  } else {
    logger.info("KUDL Pets products already exist, skipping.")
  }

  logger.info("Seeding India inventory levels...")
  const newSkus = new Set(
    newProducts.flatMap((p) => p.variants.map((v) => v.sku))
  )
  if (newSkus.size) {
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

  logger.info("Finished seeding KUDL Pets India data.")
}
