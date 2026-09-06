<template>
  <section id="products" class="py-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-5">
      <div class="flex items-center justify-between mb-6 gap-3">
        <h2 class="text-2xl sm:text-3xl">Популярные товары</h2>
        <a href="#" class="text-primary whitespace-nowrap">Смотреть все →</a>
      </div>

      <div v-if="loading" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        <div v-for="i in 4" :key="i" class="bg-surface-secondary rounded-2xl overflow-hidden">
          <div class="h-32 sm:h-40 bg-surface-card animate-pulse" />
          <div class="p-4 space-y-3">
            <div class="h-5 bg-surface-card rounded animate-pulse" />
            <div class="h-4 bg-surface-card rounded animate-pulse w-3/4" />
            <div class="h-6 bg-surface-card rounded animate-pulse w-1/3" />
            <div class="h-10 bg-surface-card rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div v-else-if="error" class="bg-surface-secondary border border-border rounded-2xl p-8 text-center">
        <p class="text-text-secondary mb-4">{{ error }}</p>
        <button @click="retry" class="px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors">Повторить</button>
      </div>

      <div v-else class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        <div v-for="product in products" :key="product.id" class="card flex flex-col">
          <div class="h-32 sm:h-40 flex items-center justify-center text-5xl sm:text-6xl bg-surface-card">
            {{ getServiceEmoji(product.service) }}
          </div>
          <div class="p-4 flex flex-col flex-1">
            <h3 class="text-sm sm:text-base font-semibold mb-1 leading-snug">{{ product.name }}</h3>
            <p class="text-xs sm:text-sm text-text-secondary mb-3 line-clamp-2">{{ product.description }}</p>
            <p class="text-lg sm:text-xl font-bold text-primary mb-3 mt-auto">${{ product.price }}</p>
            <button @click="buy(product)" class="w-full py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors">Купить</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import type { Product } from '~/composables/api';
import { useProductsStore } from '~/stores/products';

const store = useProductsStore();
const { products, loading, error } = storeToRefs(store);

const emit = defineEmits(['buy']);

function getServiceEmoji(service: string): string {
  const map: Record<string, string> = {
    steam: '🎮', epic: '🎯', xbox: '🟢', psn: '🔵',
    razer: '🐍', google: '▶️', appstore: '🍎', itunes: '🎵',
  };
  return map[service] || '🛒';
}

function buy(product: Product) {
  emit('buy', product);
}

function retry() {
  store.load(true);
}

onMounted(() => {
  store.load();
});
</script>
