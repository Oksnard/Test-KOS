<template>
  <div class="min-h-screen">
    <Header />
    <BannerCarousel />
    <ServicesGrid />
    <SteamTopup />
    <ProductsSection @buy="buy" />
    <PromoSection />
    <Footer />

    <div v-if="error" class="max-w-xl mx-auto px-4 mb-4">
      <div class="bg-surface-secondary border border-border rounded-xl px-4 py-3 text-sm text-danger flex items-center justify-between gap-3">
        <span>{{ error }}</span>
        <button @click="orderStore.error = ''" aria-label="Скрыть сообщение" class="text-text-secondary hover:text-text-primary shrink-0">✕</button>
      </div>
    </div>

    <OrderModal v-model="showModal" :order="order" :product-name="productName" @pay="simulatePayment" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import Header from '~/components/Header.vue';
import BannerCarousel from '~/components/BannerCarousel.vue';
import ServicesGrid from '~/components/ServicesGrid.vue';
import SteamTopup from '~/components/SteamTopup.vue';
import ProductsSection from '~/components/ProductsSection.vue';
import PromoSection from '~/components/PromoSection.vue';
import Footer from '~/components/Footer.vue';
import OrderModal from '~/components/OrderModal.vue';
import type { Product } from '~/composables/api';
import { useOrderStore } from '~/stores/order';
import { useProductsStore } from '~/stores/products';
import { onBookingUpdate } from '~/composables/websocket';

const orderStore = useOrderStore();
const productsStore = useProductsStore();
const { order, productName, showModal, error } = storeToRefs(orderStore);

function buy(product: Product) {
  orderStore.buy(product).catch(() => {});
}

function simulatePayment() {
  orderStore.pay().catch(() => {});
}

/**
 * Слушаем обновления бронирования из WebSocket.
 * Обновляем таймер в реальном времени.
 */
function setupBookingListener() {
  const unsubscribe = onBookingUpdate((data) => {
    if (orderStore.order && orderStore.order.orderNumber) {
      // Проверяем, относится ли бронирование к текущему заказу
      if (data.orderId === orderStore.order?.id) {
        if (data.status === 'expired' || data.status === 'cancelled') {
          orderStore.bookingRemainingMs = 0;
          orderStore.error = 'Время брони истекло. Товар снова доступен.';
        } else if (data.remainingMs !== undefined) {
          orderStore.bookingRemainingMs = data.remainingMs;
        }
      }
    }
  });

  onBeforeUnmount(() => {
    unsubscribe();
  });
}

/**
 * При уходе со страницы — отменяем бронь.
 * Используем beforeunload для надёжности.
 */
function setupBeforeUnload() {
  function handleBeforeUnload() {
    if (orderStore.order && orderStore.order.status === 'created') {
      orderStore.cancelCurrentBooking();
    }
  }

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    // Отменяем бронь при уходе
    if (orderStore.order && orderStore.order.status === 'created') {
      orderStore.cancelCurrentBooking();
    }
  });
}

onMounted(() => {
  setupBookingListener();
  setupBeforeUnload();
});
</script>
