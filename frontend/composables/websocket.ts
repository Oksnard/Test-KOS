import { ref, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_DELAY = 1000;

function getSocket(): Socket {
  if (socket && socket.connected) return socket;

  socket = io('http://localhost:3000/showroom', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: BASE_DELAY,
    reconnectionDelayMax: 10000,
  });

  socket.on('connect', () => {
    reconnectAttempts = 0;
    console.log('[WebSocket] Connected');
  });

  socket.on('disconnect', () => {
    console.log('[WebSocket] Disconnected');
  });

  socket.on('connect_error', (err) => {
    reconnectAttempts++;
    console.warn(`[WebSocket] Connection error (attempt ${reconnectAttempts}):`, err.message);
  });

  return socket;
}

/**
 * Подписаться на обновления товара.
 */
export function subscribeToProduct(productId: number) {
  const ws = getSocket();
  ws.emit('subscribe_product', productId);
}

/**
 * Отписаться.
 */
export function unsubscribeFromProduct(productId: number) {
  const ws = getSocket();
  ws.data = { productId: null };
}

/**
 * Обработчик события product_updated.
 */
export function onProductUpdated(handler: (data: {
  productId: number;
  name: string;
  price: number;
  availableKeys: number;
  isOutOfStock: boolean;
  timestamp: number;
}) => void) {
  const ws = getSocket();
  ws.on('product_updated', handler);
  return () => { ws.off('product_updated', handler); };
}

/**
 * Обработчик события out_of_stock.
 */
export function onOutOfStock(handler: (data: {
  productId: number;
  timestamp: number;
}) => void) {
  const ws = getSocket();
  ws.on('out_of_stock', handler);
  return () => { ws.off('out_of_stock', handler); };
}

/**
 * Обработчик события product_restocked.
 */
export function onProductRestocked(handler: (data: {
  productId: number;
  availableKeys: number;
  timestamp: number;
}) => void) {
  const ws = getSocket();
  ws.on('product_restocked', handler);
  return () => { ws.off('product_restocked', handler); };
}

/**
 * Обработчик обновления бронирования.
 */
export function onBookingUpdate(handler: (data: {
  orderId: number;
  expiresAt: string;
  remainingMs: number;
  status: string;
  timestamp: number;
}) => void) {
  const ws = getSocket();
  ws.on('booking_update', handler);
  return () => { ws.off('booking_update', handler); };
}

/**
 * Подключиться к WebSocket и настроить все слушатели.
 * Возвращает функцию отписки.
 */
export function useWebSocket() {
  getSocket();

  const isConnected = ref(false);

  function connect() {
    const ws = getSocket();
    isConnected.value = ws.connected;
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
      isConnected.value = false;
    }
  }

  onUnmounted(() => {
    disconnect();
  });

  return { connect, disconnect, isConnected };
}
