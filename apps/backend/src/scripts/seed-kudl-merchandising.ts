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

  // 3. Assign products to their child category and stamp facet metadata
  //    (brand, normalized category slug, pet type, breeds, rating,
  //    review count, stock) so the storefront's /products filters can read
  //    real data instead of client-only guesses.
  //    Brand names are demo values only; no partnership is implied. Ratings
  //    and review counts are fixed demo values (not random) so re-seeding is
  //    deterministic. `breeds` is an honest reflection of each product's
  //    description: only "Royal Canin Mini Adult" is actually described as a
  //    small-breed formula, so it alone gets the narrower breed list — the
  //    rest are general-purpose dog food/treats/toys and apply to every
  //    breed in the storefront's existing Shop By Breed lineup.
  const ALL_BREEDS = [
    "golden-retriever",
    "german-shepherd",
    "labrador",
    "rottweiler",
    "beagle",
    "shih-tzu",
    "boxer",
  ]

  type ProductCategorySlug =
    | "food"
    | "treats"
    | "toys"
    | "grooming-health"
    | "litter-habitat"
    | "accessories"

  const PRODUCT_MERCH: {
    handle: string
    parent: "Dogs" | "Cats"
    child: string
    brand: string
    category: ProductCategorySlug
    // Taxonomy subcategory slug from lib/taxonomy.ts (dogsMenu/catsMenu) on
    // the storefront — kept separate from `category` above, which stays the
    // coarse enum the rest of the filter logic already keys off.
    subcategory: string
    // Cross-species Pharmacy taxonomy slug (lib/taxonomy.ts pharmacyMenu),
    // only set for products that also belong on that branch.
    pharmacyCategory?: string
    petType: "dogs" | "cats"
    breeds: string[]
    rating: number
    reviewCount: number
    inStock: boolean
  }[] = [
    {
      handle: "pedigree-adult-dog-food",
      parent: "Dogs",
      child: "Dog Food",
      brand: "Pedigree",
      category: "food",
      subcategory: "dry-food",
      petType: "dogs",
      breeds: ALL_BREEDS,
      rating: 4.3,
      reviewCount: 128,
      inStock: true,
    },
    {
      handle: "royal-canin-mini-adult",
      parent: "Dogs",
      child: "Dog Food",
      brand: "Royal Canin",
      category: "food",
      subcategory: "dry-food",
      petType: "dogs",
      breeds: ["beagle", "shih-tzu"],
      rating: 4.6,
      reviewCount: 94,
      inStock: true,
    },
    {
      handle: "drools-puppy-food",
      parent: "Dogs",
      child: "Dog Food",
      brand: "Drools",
      category: "food",
      subcategory: "puppy-food",
      petType: "dogs",
      breeds: ALL_BREEDS,
      rating: 4.1,
      reviewCount: 156,
      inStock: true,
    },
    {
      handle: "dog-dental-chew",
      parent: "Dogs",
      child: "Dog Treats",
      brand: "KUDL Essentials",
      category: "treats",
      subcategory: "dental-treats",
      pharmacyCategory: "oral-care",
      petType: "dogs",
      breeds: ALL_BREEDS,
      rating: 4.4,
      reviewCount: 72,
      inStock: true,
    },
    {
      handle: "rubber-dog-ball",
      parent: "Dogs",
      child: "Dog Toys",
      brand: "KUDL Essentials",
      category: "toys",
      subcategory: "ball-fetch-toys",
      petType: "dogs",
      breeds: ALL_BREEDS,
      rating: 4.2,
      reviewCount: 210,
      inStock: true,
    },
    {
      handle: "dog-grooming-shampoo",
      parent: "Dogs",
      child: "Dog Grooming",
      brand: "Himalaya",
      category: "grooming-health",
      subcategory: "shampoos-conditioners",
      petType: "dogs",
      breeds: ALL_BREEDS,
      rating: 4.0,
      reviewCount: 58,
      inStock: true,
    },
    {
      handle: "whiskas-adult-cat-food",
      parent: "Cats",
      child: "Cat Food",
      brand: "Whiskas",
      category: "food",
      subcategory: "dry-food",
      petType: "cats",
      breeds: [],
      rating: 4.3,
      reviewCount: 143,
      inStock: true,
    },
    {
      handle: "whiskas-tuna-treats",
      parent: "Cats",
      child: "Cat Treats",
      brand: "Whiskas",
      category: "treats",
      subcategory: "crunchy-treats",
      petType: "cats",
      breeds: [],
      rating: 4.5,
      reviewCount: 187,
      inStock: true,
    },
    {
      handle: "cat-litter-5kg",
      parent: "Cats",
      child: "Cat Litter",
      brand: "KUDL Essentials",
      category: "litter-habitat",
      subcategory: "litter",
      petType: "cats",
      breeds: [],
      rating: 3.9,
      reviewCount: 96,
      inStock: false,
    },
    {
      handle: "interactive-cat-toy",
      parent: "Cats",
      child: "Cat Toys",
      brand: "KUDL Essentials",
      category: "toys",
      subcategory: "smart-interactive-toys",
      petType: "cats",
      breeds: [],
      rating: 4.4,
      reviewCount: 65,
      inStock: true,
    },
    {
      handle: "cat-grooming-brush",
      parent: "Cats",
      child: "Cat Grooming",
      brand: "KUDL Essentials",
      category: "grooming-health",
      subcategory: "brushes-combs",
      petType: "cats",
      breeds: [],
      rating: 4.1,
      reviewCount: 41,
      inStock: true,
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
        metadata: {
          ...(product.metadata ?? {}),
          brand: merch.brand,
          category: merch.category,
          subcategory: merch.subcategory,
          ...(merch.pharmacyCategory ? { pharmacyCategory: merch.pharmacyCategory } : {}),
          petType: merch.petType,
          breeds: merch.breeds,
          rating: merch.rating,
          reviewCount: merch.reviewCount,
          inStock: merch.inStock,
        },
      },
    ]
  })

  if (updates.length) {
    await updateProductsWorkflow(container).run({
      input: { products: updates },
    })
    logger.info(`Updated ${updates.length} products with category + facet metadata.`)
  }

  logger.info("Finished KUDL Pets merchandising seed.")
}
