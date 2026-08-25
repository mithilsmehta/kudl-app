import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Lets a signed-in customer cancel their own order.
 *
 * Medusa has no store-facing cancel route, and — deliberately — no delete-order API
 * anywhere: an order is the record that money changed hands, needed for GST returns,
 * refund disputes and chargebacks. So this cancels rather than deletes. The row stays,
 * marked CANCELED, and remains visible in Medusa Admin.
 *
 * cancelOrderWorkflow does the heavy lifting and enforces the rules we want natively:
 *   - refuses an order that is already canceled or COMPLETED
 *   - refuses if any fulfillment is not canceled, i.e. once it has shipped
 *   - cancels uncaptured payments and REFUNDS captured ones, which routes through the
 *     Razorpay provider's refundPayment
 *
 * What it does NOT do is check who is asking, so that is this route's job.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Sign in to cancel an order."
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "status", "fulfillment_status", "payment_status"],
    filters: { id: orderId },
  })

  const order = orders?.[0]

  /*
   * A missing order and someone else's order both return 404 on purpose. Answering
   * "403 Forbidden" would confirm the id exists, letting anyone probe for valid order
   * ids. Medusa's own store GET route does not scope by customer at all (it carries a
   * TODO about it), so the check has to happen here.
   */
  if (!order || order.customer_id !== customerId) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found.")
  }

  if (order.status === "canceled") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This order is already cancelled."
    )
  }

  /*
   * Checked here as well as in the workflow so the customer gets wording that makes
   * sense to them, rather than the workflow's internal "all fulfillments must be
   * canceled before canceling an order".
   */
  const shipped = ["shipped", "partially_shipped", "delivered", "partially_delivered"]
  if (order.fulfillment_status && shipped.includes(order.fulfillment_status)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This order has already been dispatched and can no longer be cancelled. Please contact support."
    )
  }

  try {
    await cancelOrderWorkflow(req.scope).run({
      input: { order_id: orderId },
    })
  } catch (e: any) {
    // Surface the workflow's own reason; it is written for humans.
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      e?.message || "This order could not be cancelled."
    )
  }

  const { data: updated } = await query.graph({
    entity: "order",
    fields: ["id", "status", "fulfillment_status", "payment_status"],
    filters: { id: orderId },
  })

  res.json({ order: updated?.[0] })
}
