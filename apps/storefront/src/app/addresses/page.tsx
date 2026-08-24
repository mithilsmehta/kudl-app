"use client"

/** My Addresses — port of apps/mobile/app/addresses.tsx. */

import { useEffect, useState } from "react"
import { MapPin, Plus, CheckCircle, Edit2, Trash2 } from "@/components/icons"
import {
  Address,
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  updateCustomerAddress,
} from "@/lib/api"
import { useRequireAuth } from "@/lib/useRequireAuth"
import AddressForm, {
  AddressFormValues,
  addressToForm,
  emptyAddressForm,
} from "@/components/AddressForm"
import ScreenHeader from "@/components/ScreenHeader"
import Spinner from "@/components/Spinner"
import ConfirmDialog from "@/components/ConfirmDialog"
import ErrorBanner from "@/components/ErrorBanner"

export default function AddressesPage() {
  const { isReady } = useRequireAuth()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<AddressFormValues>(emptyAddressForm)
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadAddresses = async () => {
    setIsLoading(true)
    try {
      setAddresses(await getCustomerAddresses())
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isReady) loadAddresses()
  }, [isReady])

  const resetForm = () => {
    setForm(emptyAddressForm)
    setEditingId(null)
    setShowForm(false)
    setError(null)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        address_1: form.address_1,
        city: form.city,
        postal_code: form.postal_code,
        phone: `+91${form.phone}`,
      }
      const updated = editingId
        ? await updateCustomerAddress(editingId, payload)
        : await createCustomerAddress({
            ...payload,
            is_default_shipping: addresses.length === 0,
          })
      setAddresses(updated)
      resetForm()
    } catch (e: any) {
      setError(e?.message || "Failed to save address.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (addr: Address) => {
    setPendingDelete(null)
    setError(null)
    try {
      await deleteCustomerAddress(addr.id)
      await loadAddresses()
    } catch (e: any) {
      setError(e?.message || "Failed to delete address.")
    }
  }

  const handleSetDefault = async (addr: Address) => {
    setError(null)
    try {
      setAddresses(
        await updateCustomerAddress(addr.id, { is_default_shipping: true })
      )
    } catch (e: any) {
      setError(e?.message || "Failed to set default address.")
    }
  }

  if (!isReady || isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8 text-kudl-primary" label="Loading addresses" />
      </div>
    )
  }

  return (
    <div>
      <ScreenHeader title="My Addresses" fallbackHref="/profile" />

      <div className="mx-auto max-w-2xl p-4 md:px-6 md:pb-16">
        <ErrorBanner message={error} />

        {showForm ? (
          <AddressForm
            title={editingId ? "Edit Address" : "Add New Address"}
            values={form}
            onChange={setForm}
            onSubmit={handleSave}
            submitLabel={editingId ? "Save Changes" : "Save Address"}
            onCancel={addresses.length > 0 ? resetForm : undefined}
            isSaving={isSaving}
          />
        ) : (
          <>
            {addresses.length === 0 ? (
              <div className="flex flex-col items-center px-8 py-16 text-center">
                <MapPin className="h-14 w-14 text-kudl-hairline" aria-hidden="true" />
                <p className="mt-4 text-lg font-bold text-kudl-ink">
                  No saved addresses
                </p>
                <p className="mt-1.5 text-sm text-kudl-muted">
                  Add an address to speed up checkout.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {addresses.map((addr) => (
                  <li
                    key={addr.id}
                    className="rounded-kudl-card border border-kudl-border bg-white p-4"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-bold text-kudl-ink">
                        {addr.first_name} {addr.last_name}
                      </p>
                      {addr.is_default_shipping && (
                        <span className="rounded bg-kudl-tint px-1.5 py-0.5 text-[10px] font-extrabold text-kudl-primary">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <address className="mt-1 space-y-0.5 text-[13px] not-italic text-kudl-subtle">
                      <p>{addr.address_1}</p>
                      <p>
                        {addr.city} - {addr.postal_code}
                      </p>
                      <p>{addr.phone}</p>
                    </address>

                    <div className="mt-3 flex flex-wrap gap-4 border-t border-kudl-divider pt-3">
                      {!addr.is_default_shipping && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(addr)}
                          className="flex items-center gap-1.5 text-[13px] font-semibold text-kudl-primary"
                        >
                          <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          Set Default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setForm(addressToForm(addr))
                          setEditingId(addr.id)
                          setShowForm(true)
                        }}
                        className="flex items-center gap-1.5 text-[13px] font-semibold text-kudl-body"
                      >
                        <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(addr)}
                        className="flex items-center gap-1.5 text-[13px] font-semibold text-kudl-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => {
                setForm(emptyAddressForm)
                setEditingId(null)
                setShowForm(true)
              }}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-kudl-primary bg-white text-[15px] font-semibold text-kudl-primary transition-colors hover:bg-kudl-tint"
            >
              <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
              Add New Address
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete Address"
        message={
          pendingDelete
            ? `Remove "${pendingDelete.address_1}, ${pendingDelete.city}"?`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => pendingDelete && handleDelete(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
