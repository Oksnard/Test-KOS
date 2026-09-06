<template>
  <section class="py-10">
    <div class="max-w-xl mx-auto px-4 sm:px-5 text-center">
      <div class="p-6 sm:p-8 bg-surface-secondary rounded-2xl">
        <h3 class="text-xl sm:text-2xl mb-2">🎁 Есть промокод?</h3>
        <p class="text-text-secondary mb-5">Введите промокод для получения скидки</p>
        <div class="flex flex-col sm:flex-row gap-3">
          <input
            v-model="code"
            placeholder="Введите промокод"
            class="flex-1 px-4 py-3 bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
          />
          <button @click="apply" class="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors whitespace-nowrap">Применить</button>
        </div>
        <p v-if="result" :class="['mt-3 text-sm', result.success ? 'text-success' : 'text-danger']">
          {{ result.message }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useOrderStore } from '~/stores/order';

const orderStore = useOrderStore();

const code = ref('');
const result = ref<{ success: boolean; message: string } | null>(null);

async function apply() {
  const value = code.value.trim();
  if (!value) return;
  result.value = { success: true, message: 'Проверяю...' };
  try {
    const data = await orderStore.checkPromo(value);
    result.value = { success: true, message: `Промокод ${data.code}: скидка ${data.discountPercent}%` };
  } catch (e) {
    const message = e instanceof Error && e.message ? e.message : 'Промокод недействителен';
    result.value = { success: false, message };
  }
}
</script>
