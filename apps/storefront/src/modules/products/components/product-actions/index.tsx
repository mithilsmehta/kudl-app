"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { HttpTypes } from "@medusajs/types"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { Check, Loader2, Minus, Plus } from "lucide-react"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

const MAX_QUANTITY = 10

export default function ProductActions({
  product,
  disabled,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant])

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  // Cap the stepper at real Medusa inventory when inventory is managed.
  const maxQuantity = useMemo(() => {
    if (
      selectedVariant?.manage_inventory &&
      !selectedVariant.allow_backorder &&
      typeof selectedVariant.inventory_quantity === "number"
    ) {
      return Math.max(1, Math.min(MAX_QUANTITY, selectedVariant.inventory_quantity))
    }
    return MAX_QUANTITY
  }, [selectedVariant])

  // Reset quantity when the shopper switches to a different variant.
  useEffect(() => {
    setQuantity(1)
  }, [selectedVariant?.id])

  /**
   * Medusa options can be shared between products, so an option may list values
   * this product has no variant for. Restrict each option to the values its own
   * variants actually use.
   */
  const allowedValuesByOption = useMemo(() => {
    const map: Record<string, string[]> = {}

    for (const variant of product.variants ?? []) {
      for (const option of variant.options ?? []) {
        if (!option.option_id) continue
        const values = (map[option.option_id] ??= [])
        if (!values.includes(option.value)) {
          values.push(option.value)
        }
      }
    }

    return map
  }, [product.variants])

  const actionsRef = useRef<HTMLDivElement>(null)
  const inView = useIntersection(actionsRef, "0px")

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity,
        countryCode,
      })
      setAdded(true)
      window.setTimeout(() => setAdded(false), 2000)
    } finally {
      setIsAdding(false)
    }
  }

  // add the selected variant to the cart and go straight to checkout
  const handleBuyNow = async () => {
    await handleAddToCart()
    router.push(`/${countryCode}/checkout`)
  }

  const ctaDisabled =
    !inStock || !selectedVariant || !!disabled || isAdding || !isValidVariant

  return (
    <>
      <div className="flex flex-col gap-y-5" ref={actionsRef}>
        {(product.variants?.length ?? 0) > 1 && (
          <div className="flex flex-col gap-y-4">
            {(product.options || []).map((option) => (
              <div key={option.id}>
                <OptionSelect
                  option={option}
                  current={options[option.id]}
                  updateOption={setOptionValue}
                  title={option.title ?? ""}
                  allowedValues={allowedValuesByOption[option.id]}
                  data-testid="product-options"
                  disabled={!!disabled || isAdding}
                />
              </div>
            ))}
            <Divider />
          </div>
        )}

        <ProductPrice product={product} variant={selectedVariant} />

        {/* Stock status straight from Medusa inventory */}
        <div className="text-sm">
          {!isValidVariant ? (
            <span className="text-kudl-muted">
              Select a pack size to see availability
            </span>
          ) : inStock ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-kudl-primary">
              <span
                className="h-2 w-2 rounded-full bg-kudl-primary"
                aria-hidden="true"
              />
              In stock
              {selectedVariant?.manage_inventory &&
                typeof selectedVariant.inventory_quantity === "number" && (
                  <span className="font-normal text-kudl-muted">
                    ({selectedVariant.inventory_quantity} available)
                  </span>
                )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-kudl-sale">
              <span
                className="h-2 w-2 rounded-full bg-kudl-sale"
                aria-hidden="true"
              />
              Out of stock
            </span>
          )}
        </div>

        {/* Quantity stepper */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-kudl-ink">Quantity</span>
          <div className="inline-flex items-center rounded-lg border border-kudl-border">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || ctaDisabled}
              aria-label="Decrease quantity"
              className="grid h-10 w-10 place-items-center rounded-l-lg text-kudl-ink transition-colors hover:bg-kudl-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <span
              aria-live="polite"
              className="grid h-10 w-12 place-items-center border-x border-kudl-border text-sm font-medium text-kudl-ink"
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((q) => Math.min(maxQuantity, q + 1))
              }
              disabled={quantity >= maxQuantity || ctaDisabled}
              aria-label="Increase quantity"
              className="grid h-10 w-10 place-items-center rounded-r-lg text-kudl-ink transition-colors hover:bg-kudl-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={ctaDisabled}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-kudl-primary text-sm font-semibold text-white transition-colors hover:bg-kudl-dark disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2"
            data-testid="add-product-button"
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : added ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : null}
            {!isValidVariant
              ? "Select variant"
              : !inStock
              ? "Out of stock"
              : added
              ? "Added to cart"
              : "Add to Cart"}
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={ctaDisabled}
            className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-kudl-primary bg-white text-sm font-semibold text-kudl-primary transition-colors hover:bg-kudl-light disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2"
            data-testid="buy-now-button"
          >
            Buy Now
          </button>
        </div>

        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}
