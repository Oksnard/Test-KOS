import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Order, Product, BookingInfo } from '~/composables/api';
import { createOrder, payOrder, getOrder, getBooking, cancelBooking } from '~/composables/api';
import { userMessage } from '~/composables/errors';

const FALLBACK = 'Не удалось обработать заказ. Проверьте подключение.';

type Buyable = Pick<Product, 'id' | 'name'>;

/**
 * Поток покупки с поддержкой:
 * - Брони с таймером
 * - Идемпотентности (защита от двойного клика)
 * - Обработки refresh/back/connection loss
 */
export const useOrderStore = defineStore('order', () => {
  const order = ref<Order | null>(null);
  const productName = ref('');
  const showModal = ref(false);
  const loading = ref(false);
  const error = ref('');

  // Бронь
  const bookingExpiresAt = ref<number | null>(null);
  const bookingRemainingMs = ref<number | null>(null);
  const bookingActive = computed(() => (bookingRemainingMs.value ?? 0) > 0);

  // Защита от двойного клика
  const isProcessing = ref(false);

  // Таймер брони
  let bookingTimer: ReturnType<typeof setInterval> | null = null;

  /** Создать заказ и открыть модалку статуса. */
  async function buy(product: Buyable, promoCode?: string): Promise<Order> {
    // Защита от двойного клика
    if (isProcessing.value) {
      throw new Error('Заказ уже обрабатывается');
    }

    error.value = '';
    isProcessing.value = true;

    // Сброс предыдущей брони
    stopBookingTimer();
    bookingExpiresAt.value = null;
    bookingRemainingMs.value = null;

    try {
      const { order: created, booking } = await createOrder(product.id, promoCode);
      order.value = created;
      productName.value = product.name;
      showModal.value = true;

      // Устанавливаем бронь если есть
      if (booking) {
        bookingExpiresAt.value = new Date(booking.expiresAt).getTime();
        bookingRemainingMs.value = booking.remainingMs;
        startBookingTimer();
      }

      return created;
    } catch (e) {
      error.value = userMessage(e, FALLBACK);
      throw e;
    } finally {
      isProcessing.value = false;
    }
  }

  /** Эмулировать оплату текущего заказа. */
  async function pay(): Promise<Order> {
    if (!order.value) throw new Error('Нет заказа для оплаты');

    // Защита от двойного клика
    if (isProcessing.value) {
      throw new Error('Оплата уже обрабатывается');
    }

    error.value = '';
    isProcessing.value = true;

    try {
      const { order: paid } = await payOrder(order.value.orderNumber);
      order.value = paid;

      // Останавливаем таймер брони
      stopBookingTimer();
      bookingRemainingMs.value = null;

      return paid;
    } catch (e) {
      error.value = userMessage(e, 'Ошибка оплаты. Попробуйте ещё раз.');
      throw e;
    } finally {
      isProcessing.value = false;
    }
  }

  /** Загрузить заказ по номеру. */
  async function fetchOrder(orderNumber: string): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const loaded = await getOrder(orderNumber);
      order.value = loaded;
      productName.value = loaded.productName || loaded.product?.name || '';

      // Проверяем есть ли активная броня
      await checkBooking(orderNumber);
    } catch (e) {
      order.value = null;
      productName.value = '';
      error.value = userMessage(e, 'Не удалось загрузить заказ. Проверьте подключение.');
    } finally {
      loading.value = false;
    }
  }

  /**
   * Проверить активную броню для заказа.
   */
  async function checkBooking(orderNumber: string): Promise<void> {
    try {
      const { hasBooking, booking } = await getBooking(orderNumber);
      if (hasBooking && booking) {
        bookingExpiresAt.value = new Date(booking.expiresAt).getTime();
        bookingRemainingMs.value = booking.remainingMs;
        startBookingTimer();
      } else {
        stopBookingTimer();
        bookingRemainingMs.value = null;
      }
    } catch {
      stopBookingTimer();
      bookingRemainingMs.value = null;
    }
  }

  /**
   * Отменить броню (при закрытии страницы / обрыве связи).
   */
  async function cancelCurrentBooking(): Promise<void> {
    if (!order.value) return;
    try {
      await cancelBooking(order.value.orderNumber);
    } catch {
      // Игнорируем ошибки отмены — броня всё равно истечёт
    }
    stopBookingTimer();
    bookingRemainingMs.value = null;
  }

  /**
   * Запустить таймер обратного отсчёта брони.
   */
  function startBookingTimer() {
    stopBookingTimer();

    bookingTimer = setInterval(() => {
      if (bookingExpiresAt.value === null) {
        stopBookingTimer();
        return;
      }

      const remaining = bookingExpiresAt.value - Date.now();
      bookingRemainingMs.value = Math.max(0, remaining);

      if (remaining <= 0) {
        stopBookingTimer();
        bookingRemainingMs.value = 0;
        error.value = 'Время брони истекло. Товар снова доступен.';
      }
    }, 1000);
  }

  function stopBookingTimer() {
    if (bookingTimer) {
      clearInterval(bookingTimer);
      bookingTimer = null;
    }
  }

  /**
   * Получить время в формате "MM:SS" для отображения таймера.
   */
  const bookingTimeDisplay = computed(() => {
    if (bookingRemainingMs.value === null || bookingRemainingMs.value <= 0) return '00:00';
    const totalSeconds = Math.floor(bookingRemainingMs.value / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });

  function checkPromo(code: string): Promise<any> {
    return import('~/composables/api').then(m => m.validatePromo(code));
  }

  function close(): void {
    showModal.value = false;
    stopBookingTimer();
    bookingRemainingMs.value = null;
  }

  return {
    order,
    productName,
    showModal,
    loading,
    error,
    bookingExpiresAt,
    bookingRemainingMs,
    bookingActive,
    bookingTimeDisplay,
    isProcessing,
    buy,
    pay,
    fetchOrder,
    checkBooking,
    cancelCurrentBooking,
    checkPromo,
    close,
  };
});
