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

/**
 * Единая обёртка над fetch: проверяет HTTP-статус и выбрасывает Error
 * с текстом от бэкенда (body.message/body.error). Именно эти функции
 * дёргают Pinia-сторы — сами компоненты в сеть не ходят.
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
      // тело не JSON — оставляем HTTP-статус
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export function fetchProducts(): Promise<Product[]> {
  return request<Product[]>('/api/products');
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

export function validatePromo(code: string): Promise<PromoCodeInfo> {
  return request<PromoCodeInfo>(`/api/promo-codes/${encodeURIComponent(code)}`);
}
