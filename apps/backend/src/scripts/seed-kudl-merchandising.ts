import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  createProductCategoriesWorkflow,
  deleteProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"

// Second-pass seed for the KUDL Pets demo:
//   1. removes the Medusa starter's apparel products (t-shirt, sweatshirt, ...)
//   2. creates Dog*/Cat* child categories under the Dogs and Cats categories
//   3. assigns each pet product to its child category and stamps a brand on
//      product metadata so the storefront can show it on product cards
// Safe to re-run: each step checks current state before writing.
export default async function seed_kudl_merchandising({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // 1. Remove the Medusa starter apparel demo products.
  const STARTER_HANDLES = ["t-shirt", "sweatshirt", "sweatpants", "shorts"]

  const { data: starterProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: STARTER_HANDLES },
  })

  if (starterProducts.length) {
    await deleteProductsWorkflow(container).run({
      input: { ids: starterProducts.map((p: any) => p.id) },
    })
    logger.info(
      `Removed ${starterProducts.length} Medusa starter apparel products.`
    )
  } else {
    logger.info("No Medusa starter apparel products to remove.")
  }

  // 2. Create child categories under Dogs / Cats.
  const { data: allCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle", "parent_category_id"],
  })

  const dogs = allCategories.find((c: any) => c.handle === "dogs")
  const cats = allCategories.find((c: any) => c.handle === "cats")

  if (!dogs || !cats) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Dogs/Cats categories not found. Run seed-kudl-pets.ts first."
    )
  }

  const CHILD_CATEGORIES = [
    { name: "Dog Food", parent: dogs.id },
    { name: "Dog Treats", parent: dogs.id },
    { name: "Dog Toys", parent: dogs.id },
    { name: "Dog Grooming", parent: dogs.id },
    { name: "Cat Food", parent: cats.id },
    { name: "Cat Treats", parent: cats.id },
    { name: "Cat Toys", parent: cats.id },
    { name: "Cat Litter", parent: cats.id },
    { name: "Cat Grooming", parent: cats.id },
  ]

  const missingChildren = CHILD_CATEGORIES.filter(
    (c) => !allCategories.some((existing: any) => existing.name === c.name)
  )

  if (missingChildren.length) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingChildren.map((c) => ({
          name: c.name,
          parent_category_id: c.parent,
          is_active: true,
        })),
      },
    })
    logger.info(`Created ${missingChildren.length} child categories.`)
  } else {
    logger.info("Child categories already exist, skipping.")
  }

  // Re-read so we have ids for every child category.
  const { data: categoriesAfter } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle"],
  })
  const categoryByName = new Map<string, string>(
    categoriesAfter.map((c: any) => [c.name, c.id])
  )

  // 3. Assign products to their child category and stamp brand metadata.
  //    Brand names are demo values only; no partnership is implied.
  const PRODUCT_MERCH: {
    handle: string
    parent: "Dogs" | "Cats"
    child: string
    brand: string
  }[] = [
    {
      handle: "pedigree-adult-dog-food",
      parent: "Dogs",
      child: "Dog Food",
      brand: "Pedigree",
    },
    {
      handle: "royal-canin-mini-adult",
      parent: "Dogs",
      child: "Dog Food",
      brand: "Royal Canin",
    },
    {
      handle: "drools-puppy-food",
      parent: "Dogs",
      child: "Dog Food",
      brand: "Drools",
    },
    {
      handle: "dog-dental-chew",
      parent: "Dogs",
      child: "Dog Treats",
      brand: "KUDL",
    },
    {
      handle: "rubber-dog-ball",
      parent: "Dogs",
      child: "Dog Toys",
      brand: "KUDL",
    },
    {
      handle: "dog-grooming-shampoo",
      parent: "Dogs",
      child: "Dog Grooming",
      brand: "KUDL",
    },
    {
      handle: "whiskas-adult-cat-food",
      parent: "Cats",
      child: "Cat Food",
      brand: "Whiskas",
    },
    {
      handle: "whiskas-tuna-treats",
      parent: "Cats",
      child: "Cat Treats",
      brand: "Whiskas",
    },
    {
      handle: "cat-litter-5kg",
      parent: "Cats",
      child: "Cat Litter",
      brand: "KUDL",
    },
    {
      handle: "interactive-cat-toy",
      parent: "Cats",
      child: "Cat Toys",
      brand: "KUDL",
    },
    {
      handle: "cat-grooming-brush",
      parent: "Cats",
      child: "Cat Grooming",
      brand: "KUDL",
    },
  ]

  const { data: petProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "metadata"],
    filters: { handle: PRODUCT_MERCH.map((p) => p.handle) },
  })
  const productByHandle = new Map<string, any>(
    petProducts.map((p: any) => [p.handle, p])
  )

  const updates = PRODUCT_MERCH.flatMap((merch) => {
    const product = productByHandle.get(merch.handle)
    if (!product) {
      logger.warn(`Product ${merch.handle} not found, skipping.`)
      return []
    }

    const parentId = categoryByName.get(merch.parent)
    const childId = categoryByName.get(merch.child)
    if (!parentId || !childId) {
      logger.warn(`Categories for ${merch.handle} not found, skipping.`)
      return []
    }

    return [
      {
        id: product.id,
        category_ids: [parentId, childId],
        metadata: { ...(product.metadata ?? {}), brand: merch.brand },
      },
    ]
  })

  if (updates.length) {
    await updateProductsWorkflow(container).run({
      input: { products: updates },
    })
    logger.info(`Updated ${updates.length} products with category + brand.`)
  }

  logger.info("Finished KUDL Pets merchandising seed.")
}
