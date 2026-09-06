<template>
  <section class="py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-5">
      <div class="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        <div
          v-for="service in services"
          :key="service.service"
          class="flex flex-col items-center justify-center gap-2 p-4 sm:p-5 rounded-xl bg-surface-secondary transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/20 hover:bg-surface-card hover:-translate-y-1"
        >
          <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl" :class="service.bgClass">
            <span>{{ service.emoji }}</span>
          </div>
          <span class="text-xs sm:text-sm text-center leading-tight">{{ service.name }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const services = [
  { name: 'Steam', service: 'steam', emoji: '🎮', bgClass: 'bg-gradient-to-br from-[#1b2838] to-[#2a475e]' },
  { name: 'Epic Games', service: 'epic', emoji: '🎯', bgClass: 'bg-gradient-to-br from-[#1a1a2e] to-[#16213e]' },
  { name: 'Xbox', service: 'xbox', emoji: '🟢', bgClass: 'bg-gradient-to-br from-[#0f4c2a] to-[#1a6b3c]' },
  { name: 'PlayStation', service: 'psn', emoji: '🔵', bgClass: 'bg-gradient-to-br from-[#003087] to-[#0070d1]' },
  { name: 'Razer Gold', service: 'razer', emoji: '🐍', bgClass: 'bg-gradient-to-br from-[#ff0000] to-[#cc0000]' },
  { name: 'Google Play', service: 'google', emoji: '▶️', bgClass: 'bg-gradient-to-br from-[#4285f4] to-[#34a853]' },
  { name: 'App Store', service: 'appstore', emoji: '🍎', bgClass: 'bg-gradient-to-br from-[#555] to-[#333]' },
  { name: 'iTunes', service: 'itunes', emoji: '🎵', bgClass: 'bg-gradient-to-br from-[#fa233b] to-[#fc5c7d]' },
];
</script>
