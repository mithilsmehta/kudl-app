/**
 * Razorpay Checkout loader and launcher.
 *
 * Razorpay is only distributed as a hosted script — there is no npm build that can be
 * bundled — so it is injected once on demand rather than on every page load. The key
 * id comes from the payment session the backend created, so no Razorpay configuration
 * is duplicated in the client.
 */

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js"

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

let loader: Promise<void> | null = null

/** Injects the Checkout script once; concurrent callers share the same promise. */
export const loadRazorpay = (): Promise<void> => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay Checkout can only load in a browser."))
  }
  if (window.Razorpay) {
    return Promise.resolve()
  }
  if (loader) {
    return loader
  }

  loader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Razorpay Checkout failed to load.")))
      return
    }
    const script = document.createElement("script")
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      // Allow a retry on the next attempt rather than caching the failure forever.
      loader = null
      reject(new Error("Razorpay Checkout failed to load. Check your connection and try again."))
    }
    document.body.appendChild(script)
  })

  return loader
}

/** What Razorpay hands back when a payment succeeds. */
export type RazorpayHandshake = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export type OpenCheckoutArgs = {
  keyId: string
  orderId: string
  amountInPaise: number
  currency: string
  storeName: string
  description?: string
  customer?: { name?: string; email?: string; contact?: string }
}

/**
 * Opens Checkout and resolves with the handshake, or rejects if the customer
 * dismisses the modal or the payment fails.
 *
 * The handshake is passed to the backend, which verifies its signature. Nothing here
 * is treated as proof of payment on its own.
 */
export const openRazorpayCheckout = async (
  args: OpenCheckoutArgs
): Promise<RazorpayHandshake> => {
  await loadRazorpay()

  if (!window.Razorpay) {
    throw new Error("Razorpay Checkout is unavailable.")
  }

  return new Promise<RazorpayHandshake>((resolve, reject) => {
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    const rzp = new window.Razorpay!({
      key: args.keyId,
      order_id: args.orderId,
      amount: args.amountInPaise,
      currency: args.currency,
      name: args.storeName,
      description: args.description,
      prefill: {
        name: args.customer?.name,
        email: args.customer?.email,
        contact: args.customer?.contact,
      },
      theme: { color: "#2563eb" },
      handler: (response: RazorpayHandshake) =>
        finish(() => resolve(response)),
      modal: {
        // Dismissing the modal is a cancellation, not a failure to report as a bug.
        ondismiss: () =>
          finish(() => reject(new Error("Payment was cancelled."))),
      },
    })

    // Razorpay surfaces gateway-level failures through this event rather than the handler.
    ;(rzp as any).on?.("payment.failed", (e: any) =>
      finish(() =>
        reject(
          new Error(
            e?.error?.description ?? "The payment could not be completed."
          )
        )
      )
    )

    rzp.open()
  })
}
