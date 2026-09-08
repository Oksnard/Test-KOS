<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 bg-black/70 z-1000 flex items-center justify-center" @click.self="$emit('update:modelValue', false)">
      <div class="bg-surface-secondary rounded-2xl p-8 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-xl font-bold">Статус заказа</h3>
          <button @click="closeModal" class="text-text-secondary text-3xl leading-none hover:text-text-primary">&times;</button>
        </div>

        <p v-if="order">
          Заказ: <strong>{{ order.orderNumber }}</strong>
        </p>
        <p v-if="order">Товар: {{ productName || order.productName || order.product?.name }}</p>

        <!-- Таймер брони -->
        <div v-if="bookingActive && order?.status === 'created'" class="mt-4 p-4 bg-warning/10 border border-warning/30 rounded-xl">
          <p class="text-sm text-warning mb-1">⏱ Бронь истекает через:</p>
          <p class="text-3xl font-mono font-bold text-warning text-center">{{ bookingTimeDisplay }}</p>
          <p class="text-xs text-text-secondary text-center mt-1">Оплатите сейчас, иначе товар вернётся в продажу</p>
        </div>

        <p class="mt-3">
          Статус:
          <span
            class="badge"
            :class="{
              'badge-success': order.status === 'delivered',
              'badge-pending': ['paid', 'delivering', 'created'].includes(order.status),
              'badge-danger': ['out_of_stock', 'delivery_failed'].includes(order.status),
            }"
          >
            {{ statusLabel(order.status) }}
          </span>
        </p>

        <p v-if="order" class="mt-2">К оплате: <strong>${{ order.finalPrice }}</strong></p>

        <div v-if="order?.status === 'delivered' && order?.assignedKeyValue" class="bg-surface-card p-4 rounded-lg font-mono text-xl text-center my-4 break-all">
          {{ order.assignedKeyValue }}
        </div>

        <!-- Сообщение о раскупице -->
        <div v-if="order?.status === 'out_of_stock'" class="mt-3 p-4 bg-surface-card rounded-xl">
          <p class="text-warning text-sm mb-2">😔 Товар только что раскупили!</p>
          <p class="text-xs text-text-secondary">К сожалению, последний ключ был забронирован другим покупателем. Попробуйте другой товар.</p>
        </div>

        <!-- Сообщение об ошибке выдачи -->
        <p v-if="order?.status === 'delivery_failed'" class="mt-3 text-warning text-sm">
          Мы работаем над решением. Обратитесь в поддержку.
        </p>

        <!-- Кнопка оплаты -->
        <div v-if="order?.status === 'created'" class="mt-5">
          <button
            @click="simulatePayment"
            :disabled="isProcessing"
            class="btn-primary w-full"
            :class="{ 'opacity-50 cursor-not-allowed': isProcessing }"
          >
            {{ isProcessing ? 'Обработка...' : 'Эмулировать оплату' }}
          </button>
        </div>

        <!-- Кнопка закрыть -->
        <div v-if="order?.status === 'delivered'" class="mt-5">
          <button @click="closeModal" class="btn-primary w-full">Закрыть</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useOrderStore } from '~/stores/order';

const props = defineProps<{
  modelValue: boolean;
  order: any;
  productName?: string;
}>();

const emit = defineEmits(['update:modelValue', 'pay']);

const orderStore = useOrderStore();
const { isProcessing, bookingTimeDisplay, bookingActive } = storeToRefs(orderStore);

const statusLabel = (status: string): string => {
  const map: Record<string, string> = {
    delivered: 'Ключ выдан',
    paid: 'Обрабатывается',
    created: 'Ожидает оплаты',
    delivering: 'Выдаётся ключ...',
    out_of_stock: 'Нет ключей',
    delivery_failed: 'Ошибка выдачи',
  };
  return map[status] || status;
};

function closeModal() {
  emit('update:modelValue', false);
  orderStore.close();
}

function simulatePayment() {
  emit('pay', props.order);
}
</script>
