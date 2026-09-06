<template>
  <div class="flex gap-1 bg-surface-card rounded-lg p-1">
    <button
      v-for="curr in currencies"
      :key="curr.code"
      @click="select(curr.code)"
      :class="['px-3 py-1.5 rounded-md text-sm transition-all', active === curr.code ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary']"
    >
      {{ curr.symbol }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const currencies = [
  { code: 'USD', symbol: '$' },
  { code: 'KZT', symbol: '₸' },
  { code: 'RUB', symbol: '₽' },
];

const active = ref('USD');

function select(code: string) {
  active.value = code;
}
</script>
