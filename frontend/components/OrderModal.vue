<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 bg-black/70 z-1000 flex items-center justify-center" @click.self="$emit('update:modelValue', false)">
      <div class="bg-surface-secondary rounded-2xl p-8 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-xl font-bold">Статус заказа</h3>
          <button @click="$emit('update:modelValue', false)" class="text-text-secondary text-3xl leading-none hover:text-text-primary">&times;</button>
        </div>

        <p v-if="order">
          Заказ: <strong>{{ order.orderNumber }}</strong>
        </p>
        <p v-if="order">Товар: {{ productName || order.productName || order.product?.name }}</p>

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

        <p v-if="['out_of_stock', 'delivery_failed'].includes(order?.status)" class="mt-3 text-warning text-sm">
          Мы работаем над решением. Обратитесь в поддержку.
        </p>

        <div v-if="order?.status === 'created'" class="mt-5">
          <button @click="simulatePayment" class="btn-primary w-full">Эмулировать оплату</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  order: any;
  productName?: string;
}>();

const emit = defineEmits(['update:modelValue', 'pay']);

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

function simulatePayment() {
  emit('pay', props.order);
}
</script>
