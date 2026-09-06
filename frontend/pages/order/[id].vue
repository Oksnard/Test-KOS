<template>
  <div class="min-h-screen flex items-center justify-center p-5">
    <div class="bg-surface-secondary rounded-2xl p-8 max-w-md w-full">
      <h2 class="text-2xl font-bold mb-6">Статус заказа</h2>
      <p v-if="loading">Загрузка...</p>
      <div v-else-if="current">
        <p>Заказ: <strong>{{ current.orderNumber }}</strong></p>
        <p>Товар: {{ current.productName || current.product?.name }}</p>
        <p class="mt-3">
          Статус:
          <span class="badge" :class="badgeClass">{{ statusLabel }}</span>
        </p>
        <p class="mt-2">К оплате: <strong>${{ current.finalPrice }}</strong></p>
        <div v-if="current.assignedKeyValue" class="bg-surface-card p-4 rounded-lg font-mono text-xl text-center my-4 break-all">
          {{ current.assignedKeyValue }}
        </div>
        <a href="/" class="btn-primary inline-block mt-5">На главную</a>
      </div>
      <p v-else-if="error">{{ error }}</p>
      <p v-else>Заказ не найден</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import type { Order } from '~/composables/api';
import { useOrderStore } from '~/stores/order';

const route = useRoute();
const orderStore = useOrderStore();
const { order, loading, error } = storeToRefs(orderStore);

// Показываем заказ только если его номер совпадает с адресом страницы —
// в сторе может лежать предыдущий заказ, и подменять его не нужно.
const current = computed<Order | null>(() =>
  order.value && order.value.orderNumber === route.params.id ? order.value : null,
);

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    delivered: 'Ключ выдан',
    paid: 'Обрабатывается',
    created: 'Ожидает оплаты',
    delivering: 'Выдаётся ключ...',
    out_of_stock: 'Нет ключей',
    delivery_failed: 'Ошибка выдачи',
  };
  return map[current.value?.status || ''] || current.value?.status;
});

const badgeClass = computed(() => {
  const s = current.value?.status;
  if (s === 'delivered') return 'badge-success';
  if (['paid', 'delivering', 'created'].includes(s || '')) return 'badge-pending';
  return 'badge-danger';
});

onMounted(() => {
  orderStore.fetchOrder(route.params.id as string);
});
</script>
