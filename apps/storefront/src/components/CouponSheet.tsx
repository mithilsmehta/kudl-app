"use client"

/**
 * "View all coupons" list. Modelled on how food-delivery apps present offers:
 * every coupon the store has is shown, with the ones the cart already qualifies
 * for first and the rest visibly locked behind what they still need.
 *
 * Only one coupon can be active at a time. Applying a second replaces the
 * first — the backend enforces that, so this component just reflects it.
 */

import { useEffect, useRef, useState } from "react"
import { Coupon } from "@/lib/api"
import { formatCurrency } from "@/lib/currency"
import { Tag, Check, X, AlertCircle } from "@/components/icons"
import Spinner from "@/components/Spinner"

export default function CouponSheet({
  open,
  coupons,
  isLoading,
  currencyCode,
  busyCode,
  onApply,
  onRemove,
  onClose,
}: {
  open: boolean
  coupons: Coupon[]
  isLoading: boolean
  currencyCode?: string
  /** Code currently being applied or removed, so only that row spins. */
  busyCode: string | null
  onApply: (code: string) => Promise<void>
  onRemove: (code: string) => Promise<void>
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    // Stop the page behind the sheet from scrolling while it's open.
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  const handle = async (fn: () => Promise<void>) => {
    setError(null)
    try {
      await fn()
    } catch (e: any) {
      setError(e?.message || "Could not update the coupon.")
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coupon-sheet-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-kudl-border px-5 py-4">
          <h2
            id="coupon-sheet-title"
            className="text-base font-bold text-kudl-ink"
          >
            Available Coupons
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 rounded p-2 text-kudl-muted hover:text-kudl-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3"
          >
            <AlertCircle
              className="mt-px h-4 w-4 shrink-0 text-kudl-danger"
              aria-hidden="true"
            />
            <p className="text-[13px] font-medium text-kudl-danger">{error}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-7 w-7 text-kudl-primary" label="Loading coupons" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Tag className="h-10 w-10 text-kudl-hairline" aria-hidden="true" />
              <p className="mt-3 text-[15px] font-semibold text-kudl-ink">
                No coupons available
              </p>
              <p className="mt-1 text-[13px] text-kudl-muted">
                Check back later for offers.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {coupons.map((c) => {
                const busy = busyCode === c.code
                return (
                  <li
                    key={c.code}
                    className={`rounded-kudl-card border p-4 ${
                      c.applied
                        ? "border-kudl-success bg-emerald-50"
                        : c.eligible
                        ? "border-kudl-border bg-white"
                        : "border-dashed border-kudl-hairline bg-kudl-bg"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-kudl-primary bg-kudl-tint px-2 py-0.5">
                          <Tag
                            className="h-3 w-3 text-kudl-primary"
                            aria-hidden="true"
                          />
                          <span className="text-[11px] font-extrabold tracking-wide text-kudl-primary">
                            {c.code}
                          </span>
                        </span>

                        <p className="mt-2 text-[15px] font-bold text-kudl-ink">
                          {c.title}
                        </p>
                        <p className="mt-0.5 text-[13px] text-kudl-muted">
                          {c.description}
                        </p>

                        {!c.eligible && c.shortfall > 0 && (
                          <p className="mt-1.5 text-[12px] font-semibold text-kudl-amber-body">
                            Add {formatCurrency(c.shortfall, currencyCode)} more
                            to use this
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 pt-1">
                        {c.applied ? (
                          <button
                            type="button"
                            onClick={() => handle(() => onRemove(c.code))}
                            disabled={busy}
                            className="flex h-9 items-center gap-1.5 rounded-lg border border-kudl-success px-3 text-[13px] font-bold text-kudl-success disabled:opacity-60"
                          >
                            {busy ? (
                              <Spinner className="h-4 w-4 text-kudl-success" />
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                APPLIED
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handle(() => onApply(c.code))}
                            disabled={busy || !c.eligible}
                            className="h-9 rounded-lg bg-kudl-primary px-4 text-[13px] font-bold text-white transition-colors hover:bg-kudl-dark disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {busy ? (
                              <Spinner className="h-4 w-4 text-white" />
                            ) : (
                              "APPLY"
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <p className="border-t border-kudl-border px-5 py-3 text-[11px] text-kudl-faint">
          Only one coupon can be applied per order. Choosing another replaces the
          current one.
        </p>
      </div>
    </div>
  )
}
