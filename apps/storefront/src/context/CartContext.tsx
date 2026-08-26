"use client"

/** Direct port of apps/mobile/src/context/CartContext.tsx. */

import React, { createContext, useContext, useState, useEffect } from "react"
import {
  Cart,
  CartItem,
  addToCart as apiAddToCart,
  createCart,
  getCart,
  getDefaultRegionId,
  getStoredCartId,
  removeCartItem,
  setStoredCartId,
  updateCartItem,
} from "@/lib/api"
import { trackEvent } from "@/lib/recommendations"

interface CartContextType {
  cart: Cart | null
  itemCount: number
  isLoading: boolean
  addToCart: (
    variantId: string,
    quantity?: number,
    productId?: string
  ) => Promise<void>
  updateQuantity: (lineItemId: string, quantity: number) => Promise<void>
  removeItem: (lineItemId: string) => Promise<void>
  lineItemForVariant: (variantId: string) => CartItem | undefined
  refreshCart: () => Promise<void>
  resetCart: () => Promise<void>
}

const CartContext = createContext<CartContextType>({
  cart: null,
  itemCount: 0,
  isLoading: true,
  addToCart: async () => {},
  updateQuantity: async () => {},
  removeItem: async () => {},
  lineItemForVariant: () => undefined,
  refreshCart: async () => {},
  resetCart: async () => {},
})

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cart, setCart] = useState<Cart | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const initCart = async () => {
    try {
      const cartId = await getStoredCartId()
      let activeCart: Cart | null = null
      const regionId = await getDefaultRegionId()
      if (cartId) {
        activeCart = await getCart(cartId)
        if (activeCart && regionId && activeCart.region_id !== regionId) {
          // Stale cart from a different region (e.g. before the region fix) — start fresh.
          activeCart = null
        }
      }
      if (!activeCart) {
        activeCart = await createCart(regionId)
      }
      setCart(activeCart)
    } catch (e) {
      console.log("Error initializing cart:", e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    initCart()
  }, [])

  const refreshCart = async () => {
    if (cart?.id) {
      const updated = await getCart(cart.id)
      if (updated) setCart(updated)
    }
  }

  const addToCart = async (
    variantId: string,
    quantity: number = 1,
    productId?: string
  ) => {
    setIsLoading(true)
    try {
      let activeCart = cart
      if (!activeCart?.id) {
        activeCart = await createCart(await getDefaultRegionId())
      }
      const updated = await apiAddToCart(activeCart.id, variantId, quantity)
      setCart(updated)
      if (productId) {
        trackEvent("product_added_to_cart", { productId })
      }
    } catch (e) {
      console.log("Error adding to cart:", e)
      throw e
    } finally {
      setIsLoading(false)
    }
  }

  const removeItem = async (lineItemId: string) => {
    if (!cart?.id) return
    const cartId = cart.id
    setIsLoading(true)
    try {
      const updated = await removeCartItem(cartId, lineItemId)
      setCart(updated)
    } catch (e) {
      console.log("Error removing item:", e)
      // Re-read from the server rather than leaving whatever is on screen. A
      // failed delete must not leave the UI disagreeing with Medusa about
      // what is in the cart — that is how a removed item appears to come back,
      // or a kept item appears to have vanished.
      const refetched = await getCart(cartId)
      if (refetched) setCart(refetched)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * The line for a given variant, if that variant is in the cart. The product
   * page uses this to swap "Add to Cart" for "Go to Cart" once the variant on
   * screen is already in the cart — derived from real cart contents rather than
   * from a transient "just added" flag, so it still reads correctly when the
   * customer comes back to the product later.
   */
  const lineItemForVariant = (variantId: string): CartItem | undefined =>
    cart?.items?.find((item) => item.variant_id === variantId)

  const updateQuantity = async (lineItemId: string, quantity: number) => {
    if (!cart?.id) return
    if (quantity <= 0) {
      await removeItem(lineItemId)
      return
    }
    setIsLoading(true)
    try {
      const updated = await updateCartItem(cart.id, lineItemId, quantity)
      setCart(updated)
    } catch (e) {
      console.log("Error updating quantity:", e)
    } finally {
      setIsLoading(false)
    }
  }

  const resetCart = async () => {
    await setStoredCartId(null)
    setCart(null)
    await initCart()
  }

  const itemCount =
    cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        isLoading,
        addToCart,
        updateQuantity,
        removeItem,
        lineItemForVariant,
        refreshCart,
        resetCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
