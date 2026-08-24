"use client"

/**
 * Address form, shared by the Addresses screen and checkout step 1 — the app
 * duplicates this markup across both, so it's factored out here.
 *
 * India-only storefront: the country is always "in" (applied by the API layer)
 * and the phone field carries a fixed +91 prefix with exactly 10 local digits,
 * which is what the app validates too.
 */

import { useState } from "react"
import { Address } from "@/lib/api"
import { fieldClass } from "@/components/FormField"
import Spinner from "@/components/Spinner"
import ErrorBanner from "@/components/ErrorBanner"

export type AddressFormValues = {
  first_name: string
  last_name: string
  address_1: string
  city: string
  postal_code: string
  /** Local 10-digit number, without the +91 prefix. */
  phone: string
}

export const emptyAddressForm: AddressFormValues = {
  first_name: "",
  last_name: "",
  address_1: "",
  city: "",
  postal_code: "",
  phone: "",
}

/** Pre-fills the form from a saved address, stripping the +91 the API stores. */
export const addressToForm = (addr: Address): AddressFormValues => ({
  first_name: addr.first_name,
  last_name: addr.last_name,
  address_1: addr.address_1,
  city: addr.city,
  postal_code: addr.postal_code,
  phone: addr.phone.replace("+91", ""),
})

export default function AddressForm({
  title,
  values,
  onChange,
  onSubmit,
  submitLabel,
  onCancel,
  isSaving = false,
}: {
  title: string
  values: AddressFormValues
  onChange: (values: AddressFormValues) => void
  onSubmit: () => Promise<void> | void
  submitLabel: string
  onCancel?: () => void
  isSaving?: boolean
}) {
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof AddressFormValues, value: string) =>
    onChange({ ...values, [key]: value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { first_name, last_name, address_1, city, postal_code, phone } = values
    if (
      !first_name ||
      !last_name ||
      !address_1 ||
      !city ||
      !postal_code ||
      phone.length !== 10
    ) {
      setError(
        "Please fill in all fields — phone number must be 10 digits."
      )
      return
    }
    setError(null)
    await onSubmit()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-kudl-card border border-kudl-border bg-white p-4 md:p-6"
    >
      <h2 className="mb-4 text-base font-bold text-kudl-ink">{title}</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-kudl-body">
            First Name
          </span>
          <input
            className={fieldClass}
            value={values.first_name}
            onChange={(e) => set("first_name", e.target.value)}
            autoComplete="given-name"
            placeholder="First Name"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-kudl-body">
            Last Name
          </span>
          <input
            className={fieldClass}
            value={values.last_name}
            onChange={(e) => set("last_name", e.target.value)}
            autoComplete="family-name"
            placeholder="Last Name"
          />
        </label>
      </div>

      <label className="mt-2.5 block">
        <span className="mb-1.5 block text-sm font-semibold text-kudl-body">
          Street Address
        </span>
        <input
          className={fieldClass}
          value={values.address_1}
          onChange={(e) => set("address_1", e.target.value)}
          autoComplete="street-address"
          placeholder="House no., street, area"
        />
      </label>

      <div className="mt-2.5 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-kudl-body">
            City
          </span>
          <input
            className={fieldClass}
            value={values.city}
            onChange={(e) => set("city", e.target.value)}
            autoComplete="address-level2"
            placeholder="City"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-kudl-body">
            Pincode
          </span>
          <input
            className={fieldClass}
            value={values.postal_code}
            onChange={(e) =>
              set("postal_code", e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
            }
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            placeholder="110001"
          />
        </label>
      </div>

      <label className="mt-2.5 block">
        <span className="mb-1.5 block text-sm font-semibold text-kudl-body">
          Phone Number
        </span>
        <span className="flex gap-2">
          <span className="flex h-[50px] shrink-0 items-center rounded-xl bg-kudl-surface px-3.5 text-[15px] font-semibold text-kudl-body">
            +91
          </span>
          <input
            className={fieldClass}
            value={values.phone}
            onChange={(e) =>
              set("phone", e.target.value.replace(/[^0-9]/g, "").slice(0, 10))
            }
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            placeholder="98765 43210"
          />
        </span>
      </label>

      <ErrorBanner message={error} />

      <button
        type="submit"
        disabled={isSaving}
        className="mt-6 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-kudl-primary text-base font-bold text-white transition-colors hover:bg-kudl-dark disabled:opacity-70"
      >
        {isSaving ? (
          <Spinner className="h-5 w-5 text-white" label="Saving" />
        ) : (
          submitLabel
        )}
      </button>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="mt-3 h-[50px] w-full rounded-xl border border-kudl-hairline bg-white text-base font-semibold text-kudl-body"
        >
          Cancel
        </button>
      )}
    </form>
  )
}
