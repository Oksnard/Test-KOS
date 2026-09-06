<template>
  <header ref="headerRef" class="sticky top-0 z-100 bg-surface-secondary border-b border-border">
    <div class="max-w-7xl mx-auto px-4 sm:px-5 py-3">
      <div class="flex items-center justify-between gap-3 sm:gap-4">
        <!-- Левая группа: логотип + Каталог -->
        <div class="flex items-center gap-2 sm:gap-5 min-w-0">
          <a href="/" class="flex items-center gap-2 font-bold text-xl sm:text-2xl shrink-0">
            <span class="text-2xl sm:text-3xl leading-none">🎮</span>
            <span class="hidden min-[420px]:inline">GameKey</span>
          </a>
          <CatalogDropdown />
        </div>

        <!-- Центральная навигация (только крупные экраны) -->
        <nav class="hidden lg:flex items-center gap-6">
          <a href="#products" class="text-text-secondary hover:text-text-primary transition-colors">Помощь</a>
          <a href="#products" class="text-text-secondary hover:text-text-primary transition-colors">Отзывы</a>
        </nav>

        <!-- Правая зона: валюта + вход (планшет и выше) -->
        <div class="hidden md:flex items-center gap-3 lg:gap-4 shrink-0">
          <CurrencySwitcher />
          <button class="flex items-center gap-1.5 px-3 lg:px-4 py-2 bg-surface-card rounded-lg text-text-primary hover:bg-border transition-colors">
            <span class="leading-none">👤</span>
            <span class="hidden lg:inline">Войти</span>
          </button>
        </div>

        <!-- Мобильный бургер -->
        <button
          class="md:hidden flex items-center gap-1.5 px-3 py-2 bg-surface-card rounded-lg text-text-primary hover:bg-border transition-colors"
          @click="mobileOpen = !mobileOpen"
          :aria-expanded="mobileOpen ? 'true' : 'false'"
          aria-label="Открыть меню"
        >
          <span class="text-lg leading-none">☰</span>
          <span class="hidden min-[420px]:inline text-sm font-medium">Меню</span>
        </button>
      </div>

      <!-- Мобильная панель меню -->
      <transition name="fade">
        <div v-if="mobileOpen" class="md:hidden absolute inset-x-0 top-full bg-surface-secondary border-b border-border shadow-2xl">
          <div class="px-4 sm:px-5 py-4 flex flex-col gap-1">
            <a
              href="#products"
              @click="mobileOpen = false"
              class="px-3 py-2.5 rounded-lg text-text-primary hover:bg-surface-card transition-colors"
            >Популярные товары</a>
            <a href="#products" @click="mobileOpen = false" class="px-3 py-2.5 rounded-lg text-text-secondary hover:bg-surface-card hover:text-text-primary transition-colors">Помощь</a>
            <a href="#products" @click="mobileOpen = false" class="px-3 py-2.5 rounded-lg text-text-secondary hover:bg-surface-card hover:text-text-primary transition-colors">Отзывы</a>

            <div class="border-t border-border my-3" />

            <div class="flex items-center justify-between gap-3 px-3">
              <span class="text-sm text-text-secondary">Валюта</span>
              <CurrencySwitcher />
            </div>

            <button
              @click="mobileOpen = false"
              class="mt-3 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              <span>👤</span>
              <span>Войти</span>
            </button>
          </div>
        </div>
      </transition>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const mobileOpen = ref(false);
const headerRef = ref<HTMLElement | null>(null);

// Закрытие по клику вне шапки и по Esc — зеркально поведению CatalogDropdown.
// Проверка contains обязательна: клик по самой кнопке-бургеру внутри headerRef
// не должен мгновенно закрывать только что открытое меню.
function onDocumentClick(event: MouseEvent) {
  if (headerRef.value && !headerRef.value.contains(event.target as Node)) {
    mobileOpen.value = false;
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    mobileOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
