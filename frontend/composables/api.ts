export interface Product {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  category: string;
  service: string;
  createdAt: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  productId: number;
  userEmail: string;
  userIp: string;
  status: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  promoCode: string;
  assignedKeyId: number;
  eventId: string;
  requestId: string;
  deliveryAttempts: number;
  lastError: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string;
  product?: Product;
  productName?: string;
  assignedKeyValue?: string;
}

export interface CreateOrderResponse {
  order: Order;
  message: string;
  booking?: {
    id: number;
    orderId: number;
    expiresAt: string;
    remainingMs: number;
  } | null;
}

export interface PayOrderResponse {
  order: Order;
  message: string;
}

export interface PromoCodeInfo {
  valid: boolean;
  code: string;
  discountPercent: number;
  remainingUses: number;
}

export interface SearchResponse {
  products: Product[];
  total: number;
}

export interface BookingInfo {
  hasBooking: boolean;
  booking?: {
    id: number;
    orderId: number;
    productId: number;
    expiresAt: string;
    remainingMs: number;
    status: string;
  } | null;
}

/**
 * Единая обёртка над fetch: проверяет HTTP-статус и выбрасывает Error
 */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body && typeof body.message === 'string') message = body.message;
      else if (body && typeof body.error === 'string') message = body.error;
    } catch {
      // тело не JSON
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export function fetchProducts(): Promise<Product[]> {
  return request<Product[]>('/api/products');
}

export function searchProducts(params: {
  q?: string;
  category?: string;
  service?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}): Promise<SearchResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.category) searchParams.set('category', params.category);
  if (params.service) searchParams.set('service', params.service);
  if (params.minPrice !== undefined) searchParams.set('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) searchParams.set('maxPrice', String(params.maxPrice));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));

  const url = `/api/products/search${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  return request<SearchResponse>(url);
}

export function createOrder(productId: number, promoCode?: string): Promise<CreateOrderResponse> {
  return request<CreateOrderResponse>('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, userEmail: 'guest@test.com', userIp: '127.0.0.1', promoCode }),
  });
}

export function payOrder(orderNumber: string): Promise<PayOrderResponse> {
  return request<PayOrderResponse>(`/api/orders/${orderNumber}/pay`, { method: 'POST' });
}

export function getOrder(orderNumber: string): Promise<Order> {
  return request<Order>(`/api/orders/${orderNumber}`);
}

export function getBooking(orderNumber: string): Promise<BookingInfo> {
  return request<BookingInfo>(`/api/bookings/${orderNumber}`);
}

export function cancelBooking(orderNumber: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/bookings/${orderNumber}/cancel`, { method: 'POST' });
}

export function validatePromo(code: string): Promise<PromoCodeInfo> {
  return request<PromoCodeInfo>(`/api/promo-codes/${encodeURIComponent(code)}`);
}
