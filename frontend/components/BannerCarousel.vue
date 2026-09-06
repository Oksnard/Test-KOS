<template>
  <section class="py-6">
    <div class="relative overflow-hidden rounded-2xl max-w-7xl mx-auto px-4 sm:px-5">
      <div class="flex transition-transform duration-500" :style="{ transform: `translateX(-${currentSlide * 100}%)` }">
        <div
          v-for="(slide, i) in slides"
          :key="i"
          class="min-w-full grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 lg:gap-10 p-6 sm:p-10 lg:p-14 items-center"
        >
          <div>
            <h2 class="text-2xl sm:text-3xl lg:text-4xl mb-3 font-bold">{{ slide.title }}</h2>
            <p class="text-base sm:text-lg lg:text-xl text-text-secondary mb-6">{{ slide.description }}</p>
            <a href="#products" class="btn-primary inline-block">Перейти</a>
          </div>
          <div class="hidden sm:flex items-center justify-center h-48 sm:h-64 lg:h-72 rounded-2xl" :class="slide.gradient">
            <span class="text-7xl lg:text-8xl">{{ slide.emoji }}</span>
          </div>
        </div>
      </div>

      <button
        @click="prev"
        class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 bg-black/50 text-white rounded-full flex items-center justify-center text-base sm:text-lg hover:bg-black/70 transition-colors"
        aria-label="Предыдущий слайд"
      >❮</button>
      <button
        @click="next"
        class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 bg-black/50 text-white rounded-full flex items-center justify-center text-base sm:text-lg hover:bg-black/70 transition-colors"
        aria-label="Следующий слайд"
      >❯</button>

      <div class="flex justify-center gap-2 py-4">
        <span
          v-for="(_, i) in slides"
          :key="i"
          @click="currentSlide = i"
          :class="['w-2.5 h-2.5 rounded-full cursor-pointer transition-all', currentSlide === i ? 'bg-primary w-7 rounded-sm' : 'bg-border']"
          role="button"
          :aria-label="`Слайд ${i + 1}`"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const currentSlide = ref(0);
const slides = [
  { title: 'Скидки до 30% на Steam Wallet', description: 'Пополни баланс со скидкой. Моментальная выдача!', emoji: '💰', gradient: 'bg-gradient-to-br from-[#1b2838] to-[#2a475e]' },
  { title: 'Подарочные карты Epic Games', description: 'Лучшие игры по выгодным ценам', emoji: '🎯', gradient: 'bg-gradient-to-br from-[#1a1a2e] to-[#16213e]' },
  { title: 'Xbox Game Pass Ultimate', description: 'Сотни игр по одной подписке', emoji: '🎮', gradient: 'bg-gradient-to-br from-[#0f4c2a] to-[#1a6b3c]' },
];

let interval: ReturnType<typeof setInterval>;

function next() {
  currentSlide.value = (currentSlide.value + 1) % slides.length;
}

function prev() {
  currentSlide.value = (currentSlide.value - 1 + slides.length) % slides.length;
}

function startAutoplay() {
  interval = setInterval(next, 5000);
}

function stopAutoplay() {
  clearInterval(interval);
}

onMounted(() => {
  startAutoplay();
});

onBeforeUnmount(() => {
  stopAutoplay();
});
</script>
