import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Product } from '~/composables/api';
import { fetchProducts } from '~/composables/api';
import { userMessage } from '~/composables/errors';

const FALLBACK = 'Не удалось загрузить товары. Проверьте подключение.';

/**
 * Каталог «Популярные товары». Единственный источник данных для витрины:
 * список, флаги загрузки и ошибка живут здесь, а компонент только читает
 * state и вызывает load(). Повторный вызов не перезапрашивает сервер,
 * пока не попросить force (кнопка «Повторить»).
 */
export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([]);
  const loading = ref(false);
  const loaded = ref(false);
  const error = ref('');

  async function load(force = false): Promise<void> {
    if (loading.value) return;
    if (loaded.value && !force) return;

    loading.value = true;
    error.value = '';
    try {
      products.value = await fetchProducts();
      loaded.value = true;
    } catch (e) {
      error.value = userMessage(e, FALLBACK);
    } finally {
      loading.value = false;
    }
  }

  return { products, loading, loaded, error, load };
});
