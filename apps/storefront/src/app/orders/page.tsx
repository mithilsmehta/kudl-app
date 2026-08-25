"use client"

/**
 * My Orders — port of apps/mobile/app/orders.tsx.
 * Status derivation (fulfillment first, then cancellation) matches the app
 * exactly so the same order reads the same in both places.
 */

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Package,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
} from "@/components/icons"
import { Order, getCustomerOrders } from "@/lib/api"
import { formatCurrency } from "@/lib/currency"
import { formatOrderReference } from "@/lib/order-reference"
import { useRequireAuth } from "@/lib/useRequireAuth"
import ProductImage from "@/components/ProductImage"
import ScreenHeader from "@/components/ScreenHeader"
import Spinner from "@/components/Spinner"

type StatusDisplay = {
  label: string
  className: string
  Icon: typeof Package
}

const getStatusDisplay = (order: Order): StatusDisplay => {
  if (order.status === "canceled") {
    return {
      label: "CANCELED",
      className: "bg-red-100 text-kudl-danger",
      Icon: XCircle,
    }
  }
  const fulfillment = order.fulfillment_status || "not_fulfilled"
  if (["delivered", "partially_delivered"].includes(fulfillment)) {
    return {
      label: "DELIVERED",
      className: "bg-emerald-100 text-emerald-800",
      Icon: CheckCircle,
    }
  }
  if (["shipped", "partially_shipped"].includes(fulfillment)) {
    return {
      label: "SHIPPED",
      className: "bg-blue-100 text-kudl-dark",
      Icon: Truck,
    }
  }
  return {
    label: "PROCESSING",
    className: "bg-amber-100 text-amber-800",
    Icon: Clock,
  }
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "Recent"
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function OrdersPage() {
  const { isReady } = useRequireAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isReady) return
    let cancelled = false
    const load = async () => {
      try {
        const data = await getCustomerOrders()
        if (!cancelled) setOrders(data)
      } catch (e) {
        console.log("Error loading orders:", e)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [isReady])

  if (!isReady || isLoading) {
    return (
      <div className="flex flex-col items-center py-24">
        <Spinner className="h-8 w-8 text-kudl-primary" label="Loading orders" />
        <p className="mt-3 text-sm text-kudl-muted">
          Fetching order history...
        </p>
      </div>
    )
  }

  return (
    <div>
      <ScreenHeader title="My Orders" fallbackHref="/profile" />

      <div className="mx-auto max-w-3xl p-4 md:px-6 md:pb-16">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center px-8 pt-20 text-center">
            <Package className="h-16 w-16 text-kudl-hairline" aria-hidden="true" />
            <p className="mt-4 text-xl font-bold text-kudl-ink">
              No orders yet
            </p>
            <p className="mt-2 max-w-sm text-sm text-kudl-muted">
              When you place orders, they will appear here.
            </p>
            <Link
              href="/products"
              className="mt-6 rounded-xl bg-kudl-primary px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-kudl-dark"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <ul className="space-y-3.5">
            {orders.map((order) => {
              const { label, className, Icon } = getStatusDisplay(order)
              return (
                <li key={order.id}>
                  <Link
                    href={`/order/${order.id}`}
                    className="block rounded-kudl-card border border-kudl-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Package className="h-[18px] w-[18px] text-kudl-primary" aria-hidden="true" />
                        <span className="text-[15px] font-bold text-kudl-ink">
                          {formatOrderReference(order)}
                        </span>
                      </span>
                      <span
                        className={`flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold ${className}`}
                      >
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        {label}
                      </span>
                    </div>

                    <p className="mb-3 mt-1.5 flex items-center gap-1.5 text-xs text-kudl-muted">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      Placed on {formatDate(order.created_at)}
                    </p>

                    <ul className="border-y border-kudl-divider py-2.5">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((lineItem) => (
                          <li
                            key={lineItem.id}
                            className="flex items-center gap-2.5 py-1"
                          >
                            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-kudl-surface">
                              <ProductImage
                                src={lineItem.thumbnail}
                                alt=""
                                sizes="36px"
                                iconClassName="h-3.5 w-3.5"
                              />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-semibold text-kudl-ink">
                                {lineItem.title}
                              </span>
                              <span className="block text-[11px] text-kudl-muted">
                                Qty: {lineItem.quantity}
                              </span>
                            </span>
                            <span className="shrink-0 text-[13px] font-semibold text-kudl-body">
                              {formatCurrency(
                                lineItem.unit_price * lineItem.quantity,
                                order.currency_code
                              )}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-xs italic text-kudl-faint">
                          Item details unavailable
                        </li>
                      )}
                    </ul>

                    <div className="flex items-center justify-between pt-2.5">
                      <span className="text-[13px] font-semibold text-kudl-subtle">
                        Total Amount
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-base font-bold text-kudl-primary">
                          {formatCurrency(order.total, order.currency_code)}
                        </span>
                        <ChevronRight className="h-[18px] w-[18px] text-kudl-faint" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
