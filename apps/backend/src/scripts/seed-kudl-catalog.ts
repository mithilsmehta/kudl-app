/*
 * Prices live in the lib/catalog/* data files and are in MAJOR units — see the
 * note at the top of lib/catalog/dogs.ts. Nothing in this file scales them.
 */

/**
 * Builds the KUDL catalog from the Supertails mega-menu taxonomy.
 *
 * This replaces the old two-step seed (seed-kudl-pets.ts's product list plus
 * seed-kudl-merchandising.ts's metadata pass) and the Small Pets seed. It:
 *
 *   1. validates the whole catalog against lib/taxonomy.ts before writing
 *      anything, so a mistyped column or item label fails loudly at the start
 *      rather than producing products that filter into nothing;
 *   2. deletes every product that is not part of this catalog — the old demo
 *      catalog and the Small Pets rows — plus the Small Pets category;
 *   3. creates the Dogs / Cats / Pharmacy category trees, three levels deep
 *      (tree → taxonomy column → taxonomy item), so the taxonomy is real
 *      Medusa data and browsable in the admin, not just a storefront constant;
 *   4. creates each product against its tree/column/item categories, and
 *      stamps the same `metadata` facets the storefront's filters already read
 *      (see storefront src/lib/productFacets.ts).
 *
 * Deletes are Medusa soft-deletes: existing orders keep their line-item
 * snapshots and stay viewable, they just no longer link to a live product.
 *
 * Safe to re-run. It reconciles rather than duplicating — categories and
 * products are matched on handle, so a second run only fills in what is
 * missing. That also makes it the way to apply an edit to the catalog data:
 * change a description, delete the product in the admin, re-run.
 *
 * Prerequisite: seed-kudl-pets.ts must have run first for the India region,
 * sales channel, stock location and shipping profile.
 *
 * Run with:  npm run backend:seed:catalog
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
  deleteProductCategoriesWorkflow,
  deleteProductsWorkflow,
  deleteReservationsWorkflow,
} from "@medusajs/medusa/core-flows"

import { catalogProducts, IMAGES } from "../lib/catalog"
import { catsMenu, dogsMenu, pharmacyMenu, TaxonomyCategory } from "../lib/taxonomy"

/**
 * The taxonomy's "Popular Brands" column is a brand directory, not a place
 * products live, so it is excluded from the category tree. The storefront
 * renders it from the same taxonomy as a brand filter instead.
 */
const BRAND_COLUMN = "Popular Brands"

const TREES = [
  {
    key: "dogs" as const,
    name: "Dogs",
    handle: "dogs",
    menu: dogsMenu,
  },
  {
    key: "cats" as const,
    name: "Cats",
    handle: "cats",
    menu: catsMenu,
  },
  {
    key: "pharmacy" as const,
    name: "Pharmacy",
    handle: "pharmacy",
    menu: pharmacyMenu,
  },
]

/**
 * Category handles have to be globally unique in Medusa, and the taxonomy
 * reuses labels freely across branches — "Dry Food" appears under both Dog Food
 * and Cat Food, "Bowls & Feeders" is a column in both trees, "Beds" shows up
 * three times. Prefixing with the ancestors keeps the handle unique while
 * leaving the display name as the plain label the mega menu shows.
 */
const columnHandle = (treeHandle: string, column: TaxonomyCategory) =>
  `${treeHandle}-${column.slug}`

const itemHandle = (treeHandle: string, column: TaxonomyCategory, itemSlug: string) =>
  `${treeHandle}-${column.slug}-${itemSlug}`

/** Columns of a menu that become categories (i.e. everything but the brand list). */
const productColumns = (menu: TaxonomyCategory[]) =>
  menu.filter((c) => c.category !== BRAND_COLUMN)

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

export default async function seed_kudl_catalog({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // ── 1. Validate the catalog against the taxonomy before writing anything ──
  //
  // Every error is collected rather than thrown on the first one, so a single
  // run tells you everything that needs fixing instead of one problem at a
  // time. This is the check that keeps the backend's taxonomy copy honest
  // against the storefront's.
  logger.info("Validating catalog against the taxonomy...")

  const problems: string[] = []
  const seenHandles = new Set<string>()
  const seenSkus = new Set<string>()

  type Resolved = {
    product: (typeof catalogProducts)[number]
    treeHandle: string
    column: TaxonomyCategory
    itemSlug: string
    pharmacySlug?: string
  }
  const resolved: Resolved[] = []

  for (const product of catalogProducts) {
    const where = `product "${product.handle}"`

    if (seenHandles.has(product.handle)) {
      problems.push(`${where}: duplicate handle`)
    }
    seenHandles.add(product.handle)

    for (const variant of product.variants) {
      if (seenSkus.has(variant.sku)) {
        problems.push(`${where}: duplicate SKU "${variant.sku}"`)
      }
      seenSkus.add(variant.sku)
    }

    if (!(product.image in IMAGES)) {
      problems.push(`${where}: unknown image key "${product.image}"`)
    }

    const tree = TREES.find((t) => t.key === product.tree)
    if (!tree) {
      problems.push(`${where}: unknown tree "${product.tree}"`)
      continue
    }

    const column = productColumns(tree.menu).find((c) => c.category === product.column)
    if (!column) {
      problems.push(
        `${where}: column "${product.column}" is not a ${tree.name} taxonomy column`
      )
      continue
    }

    const item = column.items.find((i) => i.name === product.item)
    if (!item) {
      problems.push(
        `${where}: item "${product.item}" is not under "${product.column}"`
      )
      continue
    }

    // The pharmacy branch is its own placement, so a pharmacy-tree product
    // does not need to repeat it. Anything else has to name its pharmacy
    // column and item explicitly if it belongs on that branch at all.
    let pharmacySlug: string | undefined
    if (product.pharmacyItem) {
      const pharmacyColumn = pharmacyMenu.find(
        (c) => c.category === product.pharmacyItem!.column
      )
      const pharmacyItem = pharmacyColumn?.items.find(
        (i) => i.name === product.pharmacyItem!.item
      )
      if (!pharmacyItem) {
        problems.push(
          `${where}: pharmacy item "${product.pharmacyItem.column} > ${product.pharmacyItem.item}" not found in pharmacyMenu`
        )
      } else {
        pharmacySlug = pharmacyItem.slug
      }
    } else if (product.tree === "pharmacy") {
      pharmacySlug = item.slug
    }

    resolved.push({
      product,
      treeHandle: tree.handle,
      column,
      itemSlug: item.slug,
      pharmacySlug,
    })
  }

  if (problems.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Catalog does not match the taxonomy (${problems.length} problem(s)):\n  - ${problems.join("\n  - ")}`
    )
  }
  logger.info(`Catalog validated: ${resolved.length} products.`)

  // ── 2. Resolve the store infrastructure the products attach to ────────────
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const defaultSalesChannel = salesChannels[0]
  if (!defaultSalesChannel) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No sales channel found. Run `npm run backend:seed` (seed-kudl-pets.ts) first."
    )
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "type"],
  })
  const shippingProfile =
    shippingProfiles.find((p: any) => p.type === "default") ?? shippingProfiles[0]
  if (!shippingProfile) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No shipping profile found. Run `npm run backend:seed` (seed-kudl-pets.ts) first."
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
      "No stock location found. Run `npm run backend:seed` (seed-kudl-pets.ts) first."
    )
  }

  // ── 3. Clear out everything that is not part of this catalog ──────────────
  //
  // Handle-based rather than a blanket delete-all, which is what makes the
  // script re-runnable: a second run finds the catalog products already there
  // and has nothing left to remove.
  const catalogHandles = new Set(catalogProducts.map((p) => p.handle))

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "variants.sku"],
  })

  const staleProducts = existingProducts.filter(
    (p: any) => !catalogHandles.has(p.handle)
  )
  if (staleProducts.length) {
    // deleteProductsWorkflow cascades into deleting each variant's inventory
    // item, and that step refuses outright if an inventory item still has a
    // reservation against it — which it will for any order that was placed and
    // never fulfilled. So release the reservations for exactly these products
    // first. They are safe to drop: a reservation only holds stock aside for an
    // unfulfilled order, and the product it points at is about to stop
    // existing. Scoped by SKU rather than cleared wholesale so a reservation
    // against a product that is staying is left untouched.
    const staleSkus = new Set(
      staleProducts.flatMap((p: any) =>
        (p.variants ?? []).map((v: any) => v.sku).filter(Boolean)
      )
    )

    if (staleSkus.size) {
      const { data: reservations } = await query.graph({
        entity: "reservation",
        fields: ["id", "inventory_item.sku"],
      })
      const staleReservationIds = reservations
        .filter((r: any) => r.inventory_item?.sku && staleSkus.has(r.inventory_item.sku))
        .map((r: any) => r.id)

      if (staleReservationIds.length) {
        await deleteReservationsWorkflow(container).run({
          input: { ids: staleReservationIds },
        })
        logger.info(
          `Released ${staleReservationIds.length} inventory reservation(s) held by products being removed.`
        )
      }
    }

    // Soft-delete. Order line items hold their own snapshot of what was
    // bought, so past orders stay intact and viewable.
    await deleteProductsWorkflow(container).run({
      input: { ids: staleProducts.map((p: any) => p.id) },
    })
    logger.info(
      `Removed ${staleProducts.length} product(s) outside the catalog: ${staleProducts
        .map((p: any) => p.handle)
        .join(", ")}`
    )
  } else {
    logger.info("No products outside the catalog to remove.")
  }

  // ── 4. Build the category trees ───────────────────────────────────────────
  const loadCategories = async () => {
    const { data } = await query.graph({
      entity: "product_category",
      fields: ["id", "name", "handle", "parent_category_id"],
    })
    return new Map<string, any>(data.map((c: any) => [c.handle, c]))
  }

  let categoriesByHandle = await loadCategories()

  // Small Pets is being retired from the storefront entirely, so its category
  // goes with its products. deleteProductCategoriesWorkflow refuses to delete a
  // category that still has children, so walk the subtree and delete it
  // deepest-first — the seed shouldn't break just because someone added a child
  // category under Small Pets in the admin.
  const smallPets = categoriesByHandle.get("small-pets")
  if (smallPets) {
    const allCategories = [...categoriesByHandle.values()]
    const byDepth: string[][] = []
    let frontier = [smallPets]
    while (frontier.length) {
      byDepth.push(frontier.map((c) => c.id))
      const parentIds = new Set(frontier.map((c) => c.id))
      frontier = allCategories.filter((c) => parentIds.has(c.parent_category_id))
    }
    for (const ids of byDepth.reverse()) {
      await deleteProductCategoriesWorkflow(container).run({ input: ids })
    }
    logger.info(
      `Removed the Small Pets category${byDepth.length > 1 ? " and its children" : ""}.`
    )
    categoriesByHandle = await loadCategories()
  }

  // Level 1 — the three tree roots.
  const missingTrees = TREES.filter((t) => !categoriesByHandle.has(t.handle))
  if (missingTrees.length) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingTrees.map((t) => ({
          name: t.name,
          handle: t.handle,
          is_active: true,
        })),
      },
    })
    logger.info(
      `Created ${missingTrees.length} top-level category(ies): ${missingTrees
        .map((t) => t.name)
        .join(", ")}`
    )
    categoriesByHandle = await loadCategories()
  }

  // Level 2 — one category per taxonomy column, under its tree.
  const columnSpecs = TREES.flatMap((tree) =>
    productColumns(tree.menu).map((column) => ({
      tree,
      column,
      handle: columnHandle(tree.handle, column),
    }))
  )
  const missingColumns = columnSpecs.filter((s) => !categoriesByHandle.has(s.handle))
  if (missingColumns.length) {
    for (const batch of chunk(missingColumns, 50)) {
      await createProductCategoriesWorkflow(container).run({
        input: {
          product_categories: batch.map((s) => ({
            name: s.column.category,
            handle: s.handle,
            is_active: true,
            parent_category_id: categoriesByHandle.get(s.tree.handle)!.id,
          })),
        },
      })
    }
    logger.info(`Created ${missingColumns.length} taxonomy column category(ies).`)
    categoriesByHandle = await loadCategories()
  }

  // Level 3 — one category per taxonomy item, under its column.
  const itemSpecs = TREES.flatMap((tree) =>
    productColumns(tree.menu).flatMap((column) =>
      column.items.map((item) => ({
        tree,
        column,
        item,
        handle: itemHandle(tree.handle, column, item.slug),
        parentHandle: columnHandle(tree.handle, column),
      }))
    )
  )

  // Two items with the same slug inside one column would collapse into one
  // category and silently lose a menu entry, so fail rather than guess.
  const itemHandleCounts = new Map<string, number>()
  for (const spec of itemSpecs) {
    itemHandleCounts.set(spec.handle, (itemHandleCounts.get(spec.handle) ?? 0) + 1)
  }
  const collidingHandles = [...itemHandleCounts.entries()].filter(([, n]) => n > 1)
  if (collidingHandles.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Taxonomy has colliding item slugs within a single column: ${collidingHandles
        .map(([handle, n]) => `${handle} (×${n})`)
        .join(", ")}`
    )
  }

  const missingItems = itemSpecs.filter((s) => !categoriesByHandle.has(s.handle))
  if (missingItems.length) {
    for (const batch of chunk(missingItems, 50)) {
      await createProductCategoriesWorkflow(container).run({
        input: {
          product_categories: batch.map((s) => ({
            name: s.item.name,
            handle: s.handle,
            is_active: true,
            parent_category_id: categoriesByHandle.get(s.parentHandle)!.id,
          })),
        },
      })
    }
    logger.info(`Created ${missingItems.length} taxonomy item category(ies).`)
    categoriesByHandle = await loadCategories()
  }

  logger.info(
    `Category tree ready: ${TREES.length} trees, ${columnSpecs.length} columns, ${itemSpecs.length} items.`
  )

  // ── 5. Create the products ────────────────────────────────────────────────
  const presentHandles = new Set(
    (
      await query.graph({
        entity: "product",
        fields: ["id", "handle"],
      })
    ).data.map((p: any) => p.handle)
  )

  const toCreate = resolved.filter((r) => !presentHandles.has(r.product.handle))

  if (toCreate.length) {
    for (const batch of chunk(toCreate, 20)) {
      await createProductsWorkflow(container).run({
        input: {
          products: batch.map(({ product, treeHandle, column, itemSlug, pharmacySlug }) => ({
            title: product.title,
            handle: product.handle,
            description: product.description,
            weight: product.weight,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: IMAGES[product.image] }],
            // All three levels, so a listing filtered on the tree still finds
            // the product and a drill-down to the leaf finds it too.
            category_ids: [
              categoriesByHandle.get(treeHandle)!.id,
              categoriesByHandle.get(columnHandle(treeHandle, column))!.id,
              categoriesByHandle.get(itemHandle(treeHandle, column, itemSlug))!.id,
            ],
            // Declared inline so each product owns an exclusive Pack Size
            // option holding only its own values. One shared global option
            // would offer pack sizes a product has no variant for.
            options: [
              {
                title: "Pack Size",
                values: product.variants.map((v) => v.title),
              },
            ],
            variants: product.variants.map((v) => ({
              title: v.title,
              sku: v.sku,
              options: { "Pack Size": v.title },
              prices: [{ amount: v.amount, currency_code: "inr" }],
            })),
            sales_channels: [{ id: defaultSalesChannel.id }],
            // The facets the storefront's /products filters read. Slugs come
            // from the taxonomy rather than being written by hand, so a filter
            // checkbox and a product can never disagree about a label.
            //
            // On `subcategory` for pharmacy-branch products: it holds the
            // product's own taxonomy item slug, which is a pharmacyMenu slug.
            // The storefront's pet-scoped drill-down lists dogsMenu/catsMenu
            // slugs, and the two menus label the same ideas differently — the
            // pharmacy sheet says "Dewormers", "Gut Health" is the dog sheet's
            // name for "Digestive care", "Anti-biotics" vs "Antibiotics". So
            // some pharmacy products match a pet subcategory checkbox and some
            // don't. That is not a bug to paper over by inventing a mapping the
            // source sheet doesn't state: Pharmacy is its own top-level branch,
            // `pharmacyCategory` below is the filter that reaches all of them,
            // and every pharmacy product is stamped with one.
            metadata: {
              brand: product.brand,
              category: product.category,
              subcategory: itemSlug,
              ...(pharmacySlug ? { pharmacyCategory: pharmacySlug } : {}),
              petType: product.petType,
              breeds: product.breeds ?? [],
              rating: product.rating,
              reviewCount: product.reviewCount,
              inStock: product.inStock ?? true,
            },
          })),
        },
      })
    }
    logger.info(`Created ${toCreate.length} catalog product(s).`)
  } else {
    logger.info("All catalog products already exist, skipping creation.")
  }

  // ── 6. Stock the new variants ─────────────────────────────────────────────
  //
  // A flat quantity across the catalog: this is a demo store, and the
  // storefront's out-of-stock signal is `metadata.inStock` rather than a real
  // inventory count.
  const newSkus = new Set(
    toCreate.flatMap((r) => r.product.variants.map((v) => v.sku))
  )
  if (newSkus.size) {
    const { data: inventoryItems } = await query.graph({
      entity: "inventory_item",
      fields: ["id", "sku"],
    })
    const { data: existingLevels } = await query.graph({
      entity: "inventory_level",
      fields: ["inventory_item_id", "location_id"],
    })
    const stockedItemIds = new Set(
      existingLevels
        .filter((l: any) => l.location_id === stockLocation.id)
        .map((l: any) => l.inventory_item_id)
    )

    const levels = inventoryItems
      .filter((i: any) => newSkus.has(i.sku) && !stockedItemIds.has(i.id))
      .map((i: any) => ({
        location_id: stockLocation.id,
        inventory_item_id: i.id,
        stocked_quantity: 1000,
      }))

    if (levels.length) {
      for (const batch of chunk(levels, 50)) {
        await createInventoryLevelsWorkflow(container).run({
          input: { inventory_levels: batch },
        })
      }
      logger.info(`Stocked ${levels.length} new variant(s).`)
    }
  }

  logger.info("Finished seeding the KUDL catalog.")
}
