import { createServerFn } from '@tanstack/react-start'
import {
  clearAuthCookies,
  gatewayFetch,
  getRefreshToken,
  getUserId,
  setAuthCookies,
  type GatewayError,
} from './gateway'
import type {
  Cart,
  Order,
  Product,
  ShippingAddress,
  Shipment,
  User,
} from '../types'

interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: User
}

function asArray<T>(json: unknown): T[] {
  if (Array.isArray(json)) return json as T[]
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>
    for (const key of ['data', 'products', 'items']) {
      if (Array.isArray(obj[key])) return obj[key] as T[]
    }
  }
  return []
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const register = createServerFn({ method: 'POST' })
  .validator((d: { email: string; password: string; name: string }) => d)
  .handler(async ({ data }) => {
    const res = await gatewayFetch<TokenResponse>('/api/v1/auth/register', {
      method: 'POST',
      auth: false,
      body: data,
    })
    setAuthCookies(res.accessToken, res.refreshToken, res.expiresIn)
    return res.user
  })

export const login = createServerFn({ method: 'POST' })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const res = await gatewayFetch<TokenResponse>('/api/v1/auth/login', {
      method: 'POST',
      auth: false,
      body: data,
    })
    setAuthCookies(res.accessToken, res.refreshToken, res.expiresIn)
    return res.user
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  clearAuthCookies()
  return { ok: true }
})

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<User | null> => {
    try {
      return await gatewayFetch<User>('/api/v1/auth/me')
    } catch (e) {
      if ((e as GatewayError).status !== 401) return null
      // Access token expired — try a one-shot refresh.
      const refreshToken = getRefreshToken()
      if (!refreshToken) return null
      try {
        const res = await gatewayFetch<TokenResponse>('/api/v1/auth/refresh', {
          method: 'POST',
          auth: false,
          body: { refreshToken },
        })
        setAuthCookies(res.accessToken, res.refreshToken, res.expiresIn)
        return res.user
      } catch {
        clearAuthCookies()
        return null
      }
    }
  },
)

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const getProducts = createServerFn({ method: 'GET' }).handler(async () => {
  // The inventory list endpoint defaults to 10 per page; ask for the max (100).
  const json = await gatewayFetch<unknown>('/api/v1/products', {
    auth: false,
    query: { limit: 100 },
  })
  return asArray<Product>(json)
})

export const getProduct = createServerFn({ method: 'GET' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const json = await gatewayFetch<unknown>(`/api/v1/products/${data.id}`, {
      auth: false,
    })
    const obj = json as { data?: Product }
    return (obj.data ?? json) as Product
  })

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

function requireUserId(): string {
  const userId = getUserId()
  if (!userId) throw new Error('not authenticated')
  return userId
}

export const getCart = createServerFn({ method: 'GET' }).handler(async (): Promise<Cart> => {
  const userId = requireUserId()
  return gatewayFetch<Cart>('/api/v1/cart', { query: { userId } })
})

// Total item quantity in the cart, for the nav badge. Never throws (returns 0).
export const getCartCount = createServerFn({ method: 'GET' }).handler(
  async (): Promise<number> => {
    const userId = getUserId()
    if (!userId) return 0
    try {
      const cart = await gatewayFetch<Cart>('/api/v1/cart', { query: { userId } })
      return (cart.items ?? []).reduce((n, i) => n + i.quantity, 0)
    } catch {
      return 0
    }
  },
)

export const addToCart = createServerFn({ method: 'POST' })
  .validator((d: { productId: string; quantity: number }) => d)
  .handler(async ({ data }) => {
    const userId = requireUserId()
    await gatewayFetch('/api/v1/cart/items', {
      method: 'POST',
      body: { userId, productId: data.productId, quantity: data.quantity },
    })
    return { ok: true }
  })

export const setCartItemQuantity = createServerFn({ method: 'POST' })
  .validator((d: { itemId: string; quantity: number }) => d)
  .handler(async ({ data }) => {
    const userId = requireUserId()
    await gatewayFetch(`/api/v1/cart/items/${data.itemId}`, {
      method: 'PUT',
      body: { userId, quantity: data.quantity },
    })
    return { ok: true }
  })

export const removeFromCart = createServerFn({ method: 'POST' })
  .validator((d: { itemId: string }) => d)
  .handler(async ({ data }) => {
    const userId = requireUserId()
    await gatewayFetch(`/api/v1/cart/items/${data.itemId}`, {
      method: 'DELETE',
      query: { userId },
    })
    return { ok: true }
  })

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const createOrder = createServerFn({ method: 'POST' })
  .validator((d: { shippingAddress: ShippingAddress }) => d)
  .handler(async ({ data }): Promise<Order> => {
    const userId = requireUserId()
    const cart = await gatewayFetch<Cart>('/api/v1/cart', { query: { userId } })
    if (!cart.items?.length) throw new Error('cart is empty')

    const items = cart.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
    }))
    return gatewayFetch<Order>('/api/v1/orders', {
      method: 'POST',
      body: { userId, items, shippingAddress: data.shippingAddress },
    })
  })

export const listOrders = createServerFn({ method: 'GET' }).handler(async (): Promise<Order[]> => {
  const userId = requireUserId()
  const json = await gatewayFetch<unknown>('/api/v1/orders', { query: { userId } })
  return asArray<Order>(json)
})

export const getOrder = createServerFn({ method: 'GET' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    // BFF aggregation: order + its shipment in one round trip for the UI.
    const order = await gatewayFetch<Order>(`/api/v1/orders/${data.id}`)
    let shipment: Shipment | null = null
    try {
      shipment = await gatewayFetch<Shipment>(`/api/v1/shipments/order/${data.id}`)
    } catch (e) {
      if ((e as GatewayError).status !== 404) throw e
    }
    return { order, shipment }
  })

export const deliverShipment = createServerFn({ method: 'POST' })
  .validator((d: { shipmentId: string }) => d)
  .handler(async ({ data }) => {
    return gatewayFetch<Shipment>(`/api/v1/shipments/${data.shipmentId}/deliver`, {
      method: 'POST',
    })
  })
