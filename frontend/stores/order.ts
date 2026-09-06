import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Order, Product, PromoCodeInfo } from '~/composables/api';
import { createOrder, payOrder, getOrder, validatePromo as apiValidatePromo } from '~/composables/api';
import { userMessage } from '~/composables/errors';

const FALLBACK = 'Не удалось обработать заказ. Проверьте подключение.';

type Buyable = Pick<Product, 'id' | 'name'>;

/**
 * Поток покупки. Здесь хранится текущий заказ (все его API-данные),
 * а действия buy/pay/fetchOrder — единственная точка вызова заказов.
 * Модалка статуса на главной и страница /order/<номер> читают один и тот же
 * state, поэтому после оплаты ключ доступен и там, и там.
 */
export const useOrderStore = defineStore('order', () => {
  const order = ref<Order | null>(null);
  const productName = ref('');
  const showModal = ref(false);
  const loading = ref(false);
  const error = ref('');

  /** Создать заказ и открыть модалку статуса. */
  async function buy(product: Buyable, promoCode?: string): Promise<Order> {
    error.value = '';
    try {
      const { order: created } = await createOrder(product.id, promoCode);
      order.value = created;
      // createOrder не возвращает relation product — имя держим отдельно,
      // чтобы модалка показала товар сразу, ещё до оплаты.
      productName.value = product.name;
      showModal.value = true;
      return created;
    } catch (e) {
      error.value = userMessage(e, FALLBACK);
      throw e;
    }
  }

  /** Эмулировать оплату текущего заказа (обычно из модалки статуса). */
  async function pay(): Promise<Order> {
    if (!order.value) throw new Error('Нет заказа для оплаты');
    error.value = '';
    try {
      const { order: paid } = await payOrder(order.value.orderNumber);
      order.value = paid;
      showModal.value = true;
      return paid;
    } catch (e) {
      error.value = userMessage(e, 'Ошибка оплаты. Попробуйте ещё раз.');
      throw e;
    }
  }

  /** Загрузить заказ по номеру (страница статуса /order/<номер>). */
  async function fetchOrder(orderNumber: string): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const loaded = await getOrder(orderNumber);
      order.value = loaded;
      productName.value = loaded.productName || loaded.product?.name || '';
    } catch (e) {
      // Несуществующий/чужой заказ не должен показывать данные предыдущего.
      order.value = null;
      productName.value = '';
      error.value = userMessage(e, 'Не удалось загрузить заказ. Проверьте подключение.');
    } finally {
      loading.value = false;
    }
  }

  /** Проверка промокода (виджет «Есть промокод?»). Скидку считает бэкенд при заказе. */
  function checkPromo(code: string): Promise<PromoCodeInfo> {
    return apiValidatePromo(code);
  }

  function close(): void {
    showModal.value = false;
  }

  return { order, productName, showModal, loading, error, buy, pay, fetchOrder, checkPromo, close };
});
