export interface User {
  id: string
  email: string
  name: string
  role: string
}

export interface Product {
  id: string
  name: string
  description?: string
  price: number
  currency?: string
  sku?: string
  category?: string
  imageUrl?: string
}

export interface CartItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface Cart {
  id?: string
  items: CartItem[]
  totalAmount: number
}

export interface ShippingAddress {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export type OrderStatus =
  | 'cart'
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export interface Order {
  id: string
  userId: string
  status: OrderStatus
  totalAmount: number
  currency: string
  paymentId: string | null
  shippingAddress: ShippingAddress
  items: CartItem[]
  createdAt: string
  updatedAt: string
}

export interface Shipment {
  id: string
  order_id: string
  user_id: string
  status: string
  carrier?: string | null
  tracking_number?: string | null
  created_at: string
  updated_at: string
}
