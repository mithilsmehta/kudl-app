import { FREE_SHIPPING_THRESHOLD } from "@lib/kudl/config"
import { convertToLocale } from "@lib/util/money"
import { Truck } from "lucide-react"

/**
 * Free-delivery progress, derived from the live Medusa cart item subtotal.
 * Nothing here is hardcoded -- the remaining amount is computed each render.
 *
 * Note: this reflects the KUDL demo's advertised threshold. Actual shipping is
 * still priced by the Medusa shipping option chosen at checkout.
 */
const FreeDeliveryNudge = ({
  itemSubtotal,
  currencyCode,
}: {
  itemSubtotal: number
  currencyCode: string
}) => {
  const remaining = FREE_SHIPPING_THRESHOLD - itemSubtotal
  const qualified = remaining <= 0

  const progress = Math.min(
    100,
    Math.round((itemSubtotal / FREE_SHIPPING_THRESHOLD) * 100)
  )

  return (
    <div className="rounded-xl border border-kudl-border bg-kudl-light p-4">
      <div className="flex items-start gap-3">
        <Truck
          className="mt-0.5 h-5 w-5 shrink-0 text-kudl-primary"
          aria-hidden="true"
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-kudl-dark">
            {qualified ? (
              "Your order qualifies for free delivery."
            ) : (
              <>
                You&apos;re{" "}
                {convertToLocale({ amount: remaining, currency_code: currencyCode })}{" "}
                away from free delivery.
              </>
            )}
          </p>

          <div
            className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress towards free delivery"
          >
            <div
              className="h-full rounded-full bg-kudl-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default FreeDeliveryNudge
