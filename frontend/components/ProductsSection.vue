<template>
  <section id="products" class="py-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-5">
      <div class="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h2 class="text-2xl sm:text-3xl">Популярные товары</h2>
        <a href="#" class="text-primary whitespace-nowrap">Смотреть все →</a>
      </div>

      <!-- Поиск и фильтры -->
      <div class="mb-6 space-y-3">
        <div class="relative">
          <input
            v-model="searchInput"
            @input="onSearchInput"
            type="text"
            placeholder="Поиск по названию или описанию..."
            class="w-full px-4 py-3 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
          />
          <span v-if="searchLoading" class="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">...</span>
        </div>

        <div class="flex gap-2 flex-wrap">
          <select
            v-model="filters.category"
            @change="applyFilters"
            class="px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">Все категории</option>
            <option value="wallet">Кошельки</option>
            <option value="gift_card">Подарочные карты</option>
            <option value="subscription">Подписки</option>
          </select>

          <select
            v-model="filters.service"
            @change="applyFilters"
            class="px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">Все сервисы</option>
            <option value="steam">Steam</option>
            <option value="epic_games">Epic Games</option>
            <option value="xbox">Xbox</option>
            <option value="playstation">PlayStation</option>
            <option value="razer">Razer</option>
            <option value="google_play">Google Play</option>
          </select>

          <input
            v-model.number="filters.minPrice"
            @change="applyFilters"
            type="number"
            placeholder="От $"
            class="w-24 px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
          />

          <input
            v-model.number="filters.maxPrice"
            @change="applyFilters"
            type="number"
            placeholder="До $"
            class="w-24 px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
          />

          <button
            v-if="hasActiveFilters"
            @click="clearFilters"
            class="px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            ✕ Сбросить
          </button>
        </div>

        <p v-if="searchResults.length > 0" class="text-xs text-text-secondary">
          Найдено {{ searchTotal }} товаров
        </p>
      </div>

      <!-- Загрузка -->
      <div v-if="loading && !searchLoading" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
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

      <!-- Ошибка -->
      <div v-else-if="error && !searchResults.length" class="bg-surface-secondary border border-border rounded-2xl p-8 text-center">
        <p class="text-text-secondary mb-4">{{ error }}</p>
        <button @click="retry" class="px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors">Повторить</button>
      </div>

      <!-- Результаты поиска -->
      <div v-else-if="searchResults.length > 0" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        <div
          v-for="product in searchResults"
          :key="product.id"
          class="card flex flex-col"
          :class="{ 'opacity-50 pointer-events-none': isOutOfStock(product.id) }"
        >
          <div class="h-32 sm:h-40 flex items-center justify-center text-5xl sm:text-6xl bg-surface-card">
            {{ getServiceEmoji(product.service) }}
          </div>
          <div class="p-4 flex flex-col flex-1">
            <h3 class="text-sm sm:text-base font-semibold mb-1 leading-snug">{{ product.name }}</h3>
            <p class="text-xs sm:text-sm text-text-secondary mb-3 line-clamp-2">{{ product.description }}</p>
            <p class="text-lg sm:text-xl font-bold text-primary mb-1">${{ getProductPrice(product.id) || product.price }}</p>
            <p v-if="isOutOfStock(product.id)" class="text-xs text-danger font-semibold mb-2">Нет в наличии</p>
            <p v-else class="text-xs text-text-secondary mb-2">
              Осталось: {{ getAvailableKeys(product.id) }} шт.
            </p>
            <button
              @click="buy(product)"
              :disabled="isOutOfStock(product.id) || isProcessing"
              class="w-full py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
              :class="{ 'bg-gray-400 cursor-not-allowed': isOutOfStock(product.id) || isProcessing }"
            >
              {{ isOutOfStock(product.id) ? 'Распродано' : 'Купить' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Основной каталог -->
      <div v-else class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        <div
          v-for="product in products"
          :key="product.id"
          class="card flex flex-col"
          :class="{ 'opacity-50 pointer-events-none': isOutOfStock(product.id) }"
        >
          <div class="h-32 sm:h-40 flex items-center justify-center text-5xl sm:text-6xl bg-surface-card">
            {{ getServiceEmoji(product.service) }}
          </div>
          <div class="p-4 flex flex-col flex-1">
            <h3 class="text-sm sm:text-base font-semibold mb-1 leading-snug">{{ product.name }}</h3>
            <p class="text-xs sm:text-sm text-text-secondary mb-3 line-clamp-2">{{ product.description }}</p>
            <p class="text-lg sm:text-xl font-bold text-primary mb-1">${{ getProductPrice(product.id) || product.price }}</p>
            <p v-if="isOutOfStock(product.id)" class="text-xs text-danger font-semibold mb-2">Нет в наличии</p>
            <p v-else class="text-xs text-text-secondary mb-2">
              Осталось: {{ getAvailableKeys(product.id) }} шт.
            </p>
            <button
              @click="buy(product)"
              :disabled="isOutOfStock(product.id) || isProcessing"
              class="w-full py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
              :class="{ 'bg-gray-400 cursor-not-allowed': isOutOfStock(product.id) || isProcessing }"
            >
              {{ isOutOfStock(product.id) ? 'Распродано' : 'Купить' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import type { Product } from '~/composables/api';
import { useProductsStore } from '~/stores/products';
import { useOrderStore } from '~/stores/order';
import {
  onProductUpdated,
  onOutOfStock,
  onProductRestocked,
} from '~/composables/websocket';

const store = useProductsStore();
const orderStore = useOrderStore();
const { products, loading, error, searchResults, searchTotal, searchLoading, productStates } = storeToRefs(store);
const { isProcessing } = storeToRefs(orderStore);

const emit = defineEmits(['buy']);

// Поиск
const searchInput = ref('');
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

function onSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    store.search({ query: searchInput.value });
  }, 150);
}

// Фильтры
const filters = ref({
  category: '',
  service: '',
  minPrice: undefined as number | undefined,
  maxPrice: undefined as number | undefined,
});

const hasActiveFilters = ref(false);

function applyFilters() {
  hasActiveFilters.value = !!(
    filters.value.category ||
    filters.value.service ||
    filters.value.minPrice ||
    filters.value.maxPrice
  );

  store.search({
    query: searchInput.value,
    category: filters.value.category,
    service: filters.value.service,
    minPrice: filters.value.minPrice,
    maxPrice: filters.value.maxPrice,
  });
}

function clearFilters() {
  filters.value = { category: '', service: '', minPrice: undefined, maxPrice: undefined };
  searchInput.value = '';
  hasActiveFilters.value = false;
  store.search({});
}

// WebSocket: real-time обновления
function setupWebSocket() {
  const unsubProduct = onProductUpdated((data) => {
    store.updateProductState(data.productId, {
      availableKeys: data.availableKeys,
      isOutOfStock: data.isOutOfStock,
      price: data.price,
    });
  });

  const unsubOutOfStock = onOutOfStock((data) => {
    store.updateProductState(data.productId, {
      availableKeys: 0,
      isOutOfStock: true,
      price: 0,
    });
  });

  const unsubRestocked = onProductRestocked((data) => {
    store.updateProductState(data.productId, {
      availableKeys: data.availableKeys,
      isOutOfStock: false,
      price: 0,
    });
  });

  onUnmounted(() => {
    unsubProduct();
    unsubOutOfStock();
    unsubRestocked();
  });
}

function getAvailableKeys(productId: number): number {
  return store.getAvailableKeys(productId);
}

function isOutOfStock(productId: number): boolean {
  return store.isOutOfStock(productId);
}

function getProductPrice(productId: number): number {
  return store.getProductPrice(productId);
}

function getServiceEmoji(service: string): string {
  const map: Record<string, string> = {
    steam: '🎮', epic: '🎯', xbox: '🟢', psn: '🔵',
    razer: '🐍', google: '▶️', appstore: '🍎', itunes: '🎵',
    epic_games: '🎯', google_play: '▶️', playstation: '🔵',
  };
  return map[service] || '🛒';
}

function buy(product: Product) {
  if (isOutOfStock(product.id) || isProcessing.value) return;
  emit('buy', product);
}

function retry() {
  store.load(true);
}

onMounted(() => {
  store.load();
  setupWebSocket();
});
</script>
