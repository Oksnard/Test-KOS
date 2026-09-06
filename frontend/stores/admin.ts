import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { userMessage } from '~/composables/errors';

const API = '/admin-api';
const TOKEN_KEY = 'admin_token';
const AUTH_ERROR = 'Неверный или отсутствующий токен администратора';

export interface AdminStats {
  total_orders: number | string;
  delivered_orders: number | string;
  pending_orders: number | string;
  failed_orders: number | string;
}

export interface AdminOrder {
  id: number;
  orderNumber: string;
  productName?: string | null;
  product?: { name?: string } | null;
  status: string;
  finalPrice?: number | string;
}

export interface KeyPoolItem {
  productId: number;
  total: number | string;
  used: number | string;
  available: number | string;
}

interface DeliverResponse {
  delivered: boolean;
  key?: { keyValue?: string };
  error?: string;
}

/**
 * Админ-панель: токен, статистика, заказы и пул ключей. Все запросы к
 * /admin-api идут из actions; компонент admin.vue остаётся тонким —
 * рендерит state и собирает ввод из формы.
 */
export const useAdminStore = defineStore('admin', () => {
  const token = ref('');
  const stats = ref<AdminStats | null>(null);
  const orders = ref<AdminOrder[]>([]);
  const keyPool = ref<KeyPoolItem[]>([]);
  const loadError = ref('');

  const authed = computed(() => token.value !== '');

  // SPA: localStorage доступен в момент инициализации стора.
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) || '' : '';
  token.value = saved;

  function saveToken(value: string): void {
    token.value = value;
    localStorage.setItem(TOKEN_KEY, value);
  }

  function logout(): void {
    token.value = '';
    stats.value = null;
    orders.value = [];
    keyPool.value = [];
    loadError.value = '';
    localStorage.removeItem(TOKEN_KEY);
  }

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token.value) headers['x-admin-token'] = token.value;

    const res = await fetch(`${API}${path}`, { ...init, headers });

    if (res.status === 401) {
      logout();
      throw new Error(AUTH_ERROR);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    return res.json() as Promise<T>;
  }

  function connect(input: string): void {
    const value = input.trim();
    if (!value) return;
    saveToken(value);
    refresh();
  }

  async function loadStats(): Promise<void> {
    if (!authed.value) return;
    try {
      stats.value = await api<AdminStats>('/stats');
    } catch (e) {
      loadError.value = userMessage(e, 'Ошибка загрузки статистики');
    }
  }

  async function loadOrders(): Promise<void> {
    if (!authed.value) return;
    try {
      const data = await api<{ orders: AdminOrder[] }>('/orders?limit=50');
      orders.value = data.orders;
    } catch (e) {
      loadError.value = userMessage(e, 'Ошибка загрузки заказов');
    }
  }

  async function loadKeyPool(): Promise<void> {
    if (!authed.value) return;
    try {
      keyPool.value = await api<KeyPoolItem[]>('/key-pool');
    } catch (e) {
      loadError.value = userMessage(e, 'Ошибка загрузки пула ключей');
    }
  }

  function refresh(): void {
    if (!authed.value) return;
    loadError.value = '';
    loadStats();
    loadOrders();
    loadKeyPool();
  }

  /** Выдать ключ вручную. Возвращает результат — алерт показывает компонент. */
  async function deliver(orderId: number): Promise<DeliverResponse> {
    const data = await api<DeliverResponse>(`/orders/${orderId}/deliver`, { method: 'POST' });
    if (data.delivered) await loadOrders();
    return data;
  }

  /** Добавить ключи в пул; возвращает сообщение бэкенда для показа. */
  async function addKeys(productId: number, keys: string[]): Promise<string> {
    const data = await api<{ message: string }>('/key-pool', {
      method: 'POST',
      body: JSON.stringify({ productId, keys }),
    });
    await loadKeyPool();
    return data.message;
  }

  return {
    token, authed, stats, orders, keyPool, loadError,
    connect, logout, refresh, deliver, addKeys,
  };
});
