import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Product } from '~/composables/api';
import { fetchProducts, searchProducts } from '~/composables/api';
import { userMessage } from '~/composables/errors';

const FALLBACK = 'Не удалось загрузить товары. Проверьте подключение.';

/**
 * Каталог. Поддерживает:
 * - Загрузку полного списка
 * - Поиск с фильтрами
 * - Real-time обновления через WebSocket
 */
export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([]);
  const loading = ref(false);
  const loaded = ref(false);
  const error = ref('');

  // Поиск
  const searchQuery = ref('');
  const searchResults = ref<Product[]>([]);
  const searchTotal = ref(0);
  const searchLoading = ref(false);
  const searchFilters = ref({
    category: '',
    service: '',
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
  });

  // Real-time состояние товаров
  const productStates = ref<Map<number, {
    availableKeys: number;
    isOutOfStock: boolean;
    price: number;
    lastUpdated: number;
  }>>(new Map());

  async function load(force = false): Promise<void> {
    if (loading.value) return;
    if (loaded.value && !force) return;

    loading.value = true;
    error.value = '';
    try {
      products.value = await fetchProducts();
      loaded.value = true;
      // Инициализируем состояния для всех товаров
      for (const p of products.value) {
        productStates.value.set(p.id, {
          availableKeys: 0,
          isOutOfStock: false,
          price: p.price,
          lastUpdated: Date.now(),
        });
      }
    } catch (e) {
      error.value = userMessage(e, FALLBACK);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Поиск с debounce.
   */
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  async function search(params: {
    query?: string;
    category?: string;
    service?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<void> {
    // Отменяем предыдущий таймаут
    if (searchTimeout) clearTimeout(searchTimeout);

    const query = params.query || '';
    const filters = {
      category: params.category || '',
      service: params.service || '',
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
    };

    // Если запрос пустой — показываем полный каталог
    if (!query && !filters.category && !filters.service && !filters.minPrice && !filters.maxPrice) {
      searchResults.value = [];
      searchTotal.value = 0;
      searchQuery.value = '';
      return;
    }

    searchLoading.value = true;
    try {
      searchTimeout = setTimeout(async () => {
        searchQuery.value = query;
        searchFilters.value = filters;

        const result = await searchProducts({
          q: query,
          category: filters.category,
          service: filters.service,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          limit: 48,
          offset: 0,
        });

        searchResults.value = result.products;
        searchTotal.value = result.total;
      }, 150); // 150ms debounce
    } catch (e) {
      // Ошибку поиска не показываем — просто пустой результат
      searchResults.value = [];
      searchTotal.value = 0;
    } finally {
      searchLoading.value = false;
    }
  }

  /**
   * Обновить состояние товара из WebSocket.
   */
  function updateProductState(productId: number, data: {
    availableKeys: number;
    isOutOfStock: boolean;
    price: number;
  }) {
    const current = productStates.value.get(productId) || {
      availableKeys: 0,
      isOutOfStock: false,
      price: 0,
      lastUpdated: 0,
    };

    productStates.value.set(productId, {
      availableKeys: data.availableKeys,
      isOutOfStock: data.isOutOfStock,
      price: data.price,
      lastUpdated: data.lastUpdated || Date.now(),
    });

    // Обновляем цену в основном списке, если товар там есть
    const product = products.value.find(p => p.id === productId);
    if (product) {
      product.price = data.price;
    }

    // Обновляем и в результатах поиска
    const searchResult = searchResults.value.find(p => p.id === productId);
    if (searchResult) {
      searchResult.price = data.price;
    }
  }

  function getAvailableKeys(productId: number): number {
    return productStates.value.get(productId)?.availableKeys ?? 0;
  }

  function isOutOfStock(productId: number): boolean {
    return productStates.value.get(productId)?.isOutOfStock ?? false;
  }

  function getProductPrice(productId: number): number {
    return productStates.value.get(productId)?.price ?? 0;
  }

  function reset() {
    products.value = [];
    loading.value = false;
    loaded.value = false;
    error.value = '';
    searchResults.value = [];
    searchTotal.value = 0;
    searchLoading.value = false;
    searchQuery.value = '';
    productStates.value = new Map();
  }

  return {
    products,
    loading,
    loaded,
    error,
    load,
    search,
    searchQuery,
    searchResults,
    searchTotal,
    searchLoading,
    searchFilters,
    productStates,
    updateProductState,
    getAvailableKeys,
    isOutOfStock,
    getProductPrice,
    reset,
  };
});
