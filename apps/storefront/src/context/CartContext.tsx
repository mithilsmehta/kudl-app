"use client"

/** Direct port of apps/mobile/src/context/CartContext.tsx. */

import React, { createContext, useContext, useState, useEffect } from "react"
import {
  Cart,
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
    setIsLoading(true)
    try {
      const updated = await removeCartItem(cart.id, lineItemId)
      setCart(updated)
    } catch (e) {
      console.log("Error removing item:", e)
    } finally {
      setIsLoading(false)
    }
  }

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
        refreshCart,
        resetCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
