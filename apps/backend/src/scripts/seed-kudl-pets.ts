/*
 * Prices in this file are intentionally in MAJOR units: `amount: 1899` means
 * ₹1899, not ₹18.99. Medusa v2's pricing module stores and returns decimal major
 * units (confirmed against the live API: seed 1899 -> calculated_amount 1899 ->
 * "₹1899.00" via the currency helper in each client app).
 *
 * The @medusajs/prices-in-major-units rule assumes any 3-4 digit integer is a
 * minor-unit mistake, which is wrong for rupee pricing where every realistic
 * price looks like that. The rule no longer fires on this file, so the
 * eslint-disable it used to carry has gone — but the intent stands: do NOT
 * divide these by 100.
 */
import { MedusaContainer } from "@medusajs/framework"
import {
  MedusaError,
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

// Seeds the India / INR store infrastructure on top of the starter's existing
// EU seed data: the INR currency, the India region and tax region, the India
// Warehouse stock location, and the fulfillment set with its Standard and
// Express shipping options.
//
// Products and categories are NOT seeded here — seed-kudl-catalog.ts owns the
// whole catalog and the Dogs / Cats / Pharmacy category trees. Keeping them
// apart matters: this script is the prerequisite the catalog seed reads its
// sales channel, shipping profile and stock location from, and if it still
// created products of its own then re-running it would resurrect the demo
// catalog that seed-kudl-catalog.ts deliberately removes.
//
// Safe to re-run: every step checks for an existing record before creating one.
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
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No sales channel found. Run the starter's initial-data-seed first."
    )
  }

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.currency_code", "supported_currencies.is_default"],
  })
  const store = stores[0]
  if (!store) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No store found. Run the starter's initial-data-seed first."
    )
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

  logger.info(
    "Finished seeding KUDL Pets India infrastructure. Run `npm run backend:seed:catalog` next to build the category tree and catalog."
  )
}
