export type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentMethod = "paystack" | "pay_on_delivery";
export type PaymentStatus = "awaiting" | "paid" | "on_delivery" | "failed";
export type DeliveryMethod = "home_delivery" | "store_pickup";

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  price_naira: number;
  images: string[];
  sizes_available: string[];
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
}

/** The product fields a cart line needs for display and totals. */
export type CartProduct = Pick<Product, "id" | "slug" | "name" | "price_naira" | "images" | "stock" | "sizes_available">;

export interface CartLine {
  /** Database row id; absent for guest lines and optimistic inserts. */
  id?: string;
  product_id: string;
  size: string;
  quantity: number;
  product: CartProduct;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  state: string;
  city: string;
  street: string;
  landmark: string;
  is_default: boolean;
}

export type AddressInput = Omit<Address, "id" | "user_id">;

export interface DeliveryAddressSnapshot {
  full_name: string | null;
  phone: string | null;
  state: string;
  city: string;
  street: string;
  landmark: string;
  pickup?: boolean;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  email: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  delivery_method: DeliveryMethod;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: DeliveryAddressSnapshot;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  image: string | null;
  price_naira: number;
  size: string;
  quantity: number;
}

export type OrderWithItems = Order & { order_items: OrderItem[] };
