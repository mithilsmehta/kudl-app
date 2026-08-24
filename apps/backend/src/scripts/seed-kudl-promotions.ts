import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Recreates the KUDL coupons.
 *
 * Promotions live only in the database, so a fresh environment (a new Railway
 * deploy, a teammate's laptop) starts with none — and both clients advertise
 * KUDLFREE1000 in their homepage copy, which would then be a broken promise.
 * Keeping them in a script makes every environment identical and reviewable.
 *
 * Minimum-order rules are NOT set here: Medusa v2 promotions cannot express a
 * cart-total minimum, so those live in src/lib/coupon-rules.ts and are enforced
 * by POST /store/carts/:id/apply-coupon. If you add a coupon with a minimum,
 * add it in both places.
 *
 * Run with:  npm run backend:seed:promotions
 */
export default async function seedKudlPromotions({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  type PromotionSeed = {
    code: string
    /** Human note for whoever reads this file — not stored in Medusa. */
    summary: string
    application_method: Record<string, unknown>
  }

  const promotions: PromotionSeed[] = [
    {
      code: "KUDLFREE1000",
      summary:
        "100% off shipping. The ₹1000 minimum is enforced by coupon-rules.ts, not here.",
      application_method: {
        type: "percentage",
        target_type: "shipping_methods",
        allocation: "across",
        value: 100,
        currency_code: "inr",
      },
    },
    {
      code: "SAVE10",
      summary: "10% off the order total, no minimum.",
      application_method: {
        type: "percentage",
        target_type: "order",
        allocation: "across",
        value: 10,
        currency_code: "inr",
      },
    },
  ]

  logger.info("Seeding KUDL promotions...")

  const { data: existing } = await query.graph({
    entity: "promotion",
    fields: ["id", "code"],
  })
  const existingCodes = new Set(existing.map((p: any) => p.code))

  const missing = promotions.filter((p) => !existingCodes.has(p.code))

  if (!missing.length) {
    logger.info("KUDL promotions already exist, skipping.")
    return
  }

  await createPromotionsWorkflow(container).run({
    input: {
      promotionsData: missing.map((p) => ({
        code: p.code,
        type: "standard" as const,
        // Code-based, never automatic: an automatic promotion has no code to enter,
        // cannot be removed by the customer (Medusa re-applies it immediately), and
        // would show up in the checkout UI as a coupon with a dead Remove button.
        is_automatic: false,
        status: "active" as const,
        application_method: p.application_method as any,
      })),
    },
  })

  logger.info(
    `Created ${missing.length} promotion(s): ${missing
      .map((p) => p.code)
      .join(", ")}`
  )
}
