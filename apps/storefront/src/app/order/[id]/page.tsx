"use client"

/**
 * Order Details — port of apps/mobile/app/order/[id].tsx, including the
 * four-step progress tracker driven off fulfillment_status / payment_status.
 */

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  ShoppingBag,
  CreditCard,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
} from "@/components/icons"
import { Order, cancelOrder, getOrderById } from "@/lib/api"
import { formatCurrency } from "@/lib/currency"
import { formatOrderReference } from "@/lib/order-reference"
import { useRequireAuth } from "@/lib/useRequireAuth"
import ProductImage from "@/components/ProductImage"
import ScreenHeader from "@/components/ScreenHeader"
import ConfirmDialog from "@/components/ConfirmDialog"
import ErrorBanner from "@/components/ErrorBanner"
import Spinner from "@/components/Spinner"

const STEPS = [
  { key: "placed", label: "Order Placed", Icon: ShoppingBag },
  { key: "confirmed", label: "Payment Confirmed", Icon: CreditCard },
  { key: "shipped", label: "Shipped", Icon: Truck },
  { key: "delivered", label: "Delivered", Icon: CheckCircle },
]

const getCurrentStep = (order: Order): number => {
  const fulfillment = order.fulfillment_status || "not_fulfilled"
  if (["delivered", "partially_delivered"].includes(fulfillment)) return 3
  if (["shipped", "partially_shipped"].includes(fulfillment)) return 2
  const payment = order.payment_status || "not_paid"
  if (["authorized", "captured", "partially_captured"].includes(payment)) return 1
  return 0
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { isReady } = useRequireAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !isReady) return
    let cancelled = false
    getOrderById(id).then((data) => {
      if (cancelled) return
      setOrder(data)
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id, isReady])

  /*
   * Cancellation is only offered before dispatch. Once the order is shipped the
   * backend refuses it, so showing the button then would just produce an error.
   */
  const DISPATCHED = [
    "shipped",
    "partially_shipped",
    "delivered",
    "partially_delivered",
  ]
  const canCancel =
    !!order &&
    order.status !== "canceled" &&
    !DISPATCHED.includes(order.fulfillment_status ?? "not_fulfilled")

  const handleCancel = async () => {
    if (!order) return
    setConfirmCancel(false)
    setCancelling(true)
    setCancelError(null)
    try {
      await cancelOrder(order.id)
      /*
       * Re-read through the normal order endpoint rather than rendering the cancel
       * response. That response is a mutation result, not the full order shape the
       * page needs, and rendering it directly is what caused the blank page.
       */
      const fresh = await getOrderById(order.id)
      if (fresh) setOrder(fresh)
    } catch (e: any) {
      setCancelError(e?.message || "This order could not be cancelled.")
    } finally {
      setCancelling(false)
    }
  }

  if (!isReady || isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8 text-kudl-primary" label="Loading order" />
      </div>
    )
  }

  if (!order) {
    return (
      <div>
        <ScreenHeader title="Order Details" fallbackHref="/orders" />
        <div className="flex flex-col items-center gap-3 py-24">
          <AlertCircle className="h-10 w-10 text-kudl-hairline" aria-hidden="true" />
          <p className="text-[15px] text-kudl-muted">Order not found</p>
        </div>
      </div>
    )
  }

  const isCanceled = order.status === "canceled"
  const currentStep = getCurrentStep(order)

  return (
    <div>
      <ScreenHeader title="Order Details" fallbackHref="/orders" />

      <div className="mx-auto max-w-3xl p-4 md:px-6 md:pb-16">
        <div className="mb-4">
          <p className="text-xl font-bold text-kudl-ink">
            {formatOrderReference(order)}
          </p>
          <p className="mt-0.5 text-[13px] text-kudl-muted">
            Placed on {formatDate(order.created_at)}
          </p>
        </div>

        {isCanceled ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5">
            <XCircle className="h-5 w-5 shrink-0 text-kudl-danger" aria-hidden="true" />
            <p className="text-sm font-bold text-kudl-danger">
              This order was canceled
            </p>
          </div>
        ) : (
          <ol className="mb-4 rounded-kudl-card border border-kudl-border bg-white p-5">
            {STEPS.map((step, index) => {
              const isDone = index <= currentStep
              const isLast = index === STEPS.length - 1
              return (
                <li key={step.key} className="flex">
                  <div className="flex w-8 flex-col items-center">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        isDone ? "bg-kudl-primary" : "bg-kudl-border"
                      }`}
                    >
                      <step.Icon
                        className={`h-3.5 w-3.5 ${
                          isDone ? "text-white" : "text-kudl-faint"
                        }`}
                        aria-hidden="true"
                      />
                    </span>
                    {!isLast && (
                      <span
                        className={`min-h-[28px] w-0.5 flex-1 ${
                          index < currentStep
                            ? "bg-kudl-primary"
                            : "bg-kudl-border"
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className={`ml-3.5 flex-1 ${isLast ? "" : "pb-6"}`}>
                    <p
                      className={`mt-0.5 text-[15px] font-semibold ${
                        isDone ? "text-kudl-ink" : "text-kudl-faint"
                      }`}
                    >
                      {step.label}
                    </p>
                    {index === currentStep && (
                      <p className="mt-0.5 text-xs font-semibold text-kudl-primary">
                        Current status
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        <section className="mb-4 rounded-kudl-card border border-kudl-border bg-white p-4">
          <h2 className="mb-3 text-[15px] font-bold text-kudl-ink">Items</h2>
          <ul>
            {order.items?.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-1.5">
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-kudl-surface">
                  <ProductImage
                    src={item.thumbnail}
                    alt=""
                    sizes="44px"
                    iconClassName="h-4 w-4"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block line-clamp-2 text-sm font-semibold text-kudl-ink">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-kudl-muted">
                    Qty: {item.quantity}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-kudl-body">
                  {formatCurrency(
                    item.unit_price * item.quantity,
                    order.currency_code
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {order.shipping_address && (
          <section className="mb-4 rounded-kudl-card border border-kudl-border bg-white p-4">
            <h2 className="mb-3 text-[15px] font-bold text-kudl-ink">
              Delivery Address
            </h2>
            <address className="space-y-0.5 text-[13px] not-italic text-kudl-subtle">
              <p>
                {order.shipping_address.first_name}{" "}
                {order.shipping_address.last_name}
              </p>
              <p>{order.shipping_address.address_1}</p>
              <p>
                {order.shipping_address.city} -{" "}
                {order.shipping_address.postal_code}
              </p>
              <p>{order.shipping_address.phone}</p>
            </address>
          </section>
        )}

        <section className="rounded-kudl-card border border-kudl-border bg-white p-4">
          <h2 className="mb-3 text-[15px] font-bold text-kudl-ink">
            Order Summary
          </h2>
          <div className="mb-2 flex justify-between">
            <span className="text-sm text-kudl-muted">Items Subtotal</span>
            <span className="text-sm font-semibold text-kudl-ink">
              {formatCurrency(order.subtotal || 0, order.currency_code)}
            </span>
          </div>
          <div className="mb-2 flex justify-between">
            <span className="text-sm text-kudl-muted">Shipping</span>
            <span className="text-sm font-semibold text-kudl-ink">
              {formatCurrency(order.shipping_total || 0, order.currency_code)}
            </span>
          </div>
          <div className="mt-1 flex justify-between border-t border-kudl-divider pt-3">
            <span className="text-base font-bold text-kudl-ink">Total</span>
            <span className="text-lg font-bold text-kudl-primary">
              {formatCurrency(order.total, order.currency_code)}
            </span>
          </div>
        </section>

        <ErrorBanner message={cancelError} />

        {canCancel && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              disabled={cancelling}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-[15px] font-semibold text-kudl-danger disabled:opacity-60"
            >
              {cancelling ? (
                <Spinner className="h-5 w-5 text-kudl-danger" label="Cancelling order" />
              ) : (
                "Cancel this order"
              )}
            </button>
            <p className="mt-2 text-center text-[11px] text-kudl-faint">
              Available until the order is dispatched. Anything already paid is
              refunded to your original payment method.
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this order?"
        message={
          order.payment_status === "captured"
            ? "The order will be cancelled and the amount refunded to your original payment method. This cannot be undone."
            : "The order will be cancelled. This cannot be undone."
        }
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        destructive
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  )
}
