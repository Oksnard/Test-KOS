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

const orderStore = useOrderStore();
const { order, productName, showModal, error } = storeToRefs(orderStore);

function buy(product: Product) {
  orderStore.buy(product).catch(() => {});
}

function simulatePayment() {
  orderStore.pay().catch(() => {});
}
</script>
