<template>
  <div ref="dropdownRef" class="relative">
    <button
      @click="toggle"
      class="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-primary text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-primary-dark transition-colors whitespace-nowrap"
      :aria-expanded="isOpen ? 'true' : 'false'"
      aria-haspopup="true"
    >
      <span class="text-base leading-none">☰</span>
      <span>Каталог</span>
    </button>

    <transition name="dropdown">
      <div
        v-if="isOpen"
        class="fixed inset-x-3 top-16 z-200 max-h-[calc(100dvh-4rem)] overflow-y-auto bg-surface-secondary border border-border rounded-2xl p-5 shadow-2xl sm:inset-x-6 lg:absolute lg:inset-x-auto lg:top-full lg:left-0 lg:mt-2 lg:w-[820px] lg:max-h-none lg:p-6"
      >
        <div class="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <!-- Категории: на мобильном — сетка чипов, на десктопе — колонка -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-1 lg:grid-cols-1 lg:w-48 lg:flex-shrink-0 lg:content-start lg:border-r lg:border-border lg:pr-6">
            <button
              v-for="category in categories"
              :key="category.id"
              @click="activeCategory = category.id"
              class="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-colors"
              :class="activeCategory === category.id ? 'bg-surface-card text-text-primary' : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'"
            >
              <span>{{ category.label }}</span>
              <span class="hidden lg:inline text-xs">›</span>
            </button>
          </div>

          <!-- Подкатегории выбранной категории -->
          <div class="flex-1 min-w-0">
            <div v-for="category in categories" :key="category.id" v-show="activeCategory === category.id">
              <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                <div v-for="section in category.sections" :key="section.name" class="min-w-0">
                  <h4 class="text-text-primary font-semibold text-sm mb-3 flex items-center gap-1.5">
                    <span>{{ section.emoji || '' }}</span>
                    {{ section.name }}
                    <span class="text-xs text-text-secondary">›</span>
                  </h4>
                  <div class="flex flex-col gap-0.5">
                    <a
                      v-for="item in section.items"
                      :key="item.href"
                      :href="item.href"
                      class="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-card rounded-lg transition-colors"
                    >
                      {{ item.label }}
                    </a>
                  </div>
                </div>
              </div>

              <!-- Подборки -->
              <div v-if="category.highlights" class="mt-6 pt-4 border-t border-border">
                <h4 class="text-text-primary font-semibold text-sm mb-3 flex items-center gap-1.5">
                  <span>📋</span>
                  Подборки
                  <span class="text-xs text-text-secondary">›</span>
                </h4>
                <div class="flex flex-wrap gap-x-6 gap-y-0.5">
                  <a
                    v-for="item in category.highlights"
                    :key="item.href"
                    :href="item.href"
                    class="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-card rounded-lg transition-colors"
                  >
                    {{ item.label }}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const isOpen = ref(false);
const activeCategory = ref('games');
const dropdownRef = ref<HTMLElement | null>(null);

const categories = [
  {
    id: 'games',
    label: 'Игры и игровые сервисы',
    sections: [
      {
        name: 'Steam',
        emoji: '🎮',
        items: [
          { label: 'Игры и DLC', href: '#' },
          { label: 'Пополнение баланса', href: '#' },
          { label: 'Подарочные карты', href: '#' },
          { label: 'Коллекционные карточки', href: '#' },
          { label: 'Смена региона', href: '#' },
        ],
      },
      {
        name: 'PlayStation',
        emoji: '🔵',
        items: [
          { label: 'Игры и DLC', href: '#' },
          { label: 'Пополнение баланса', href: '#' },
          { label: 'Новые аккаунты', href: '#' },
          { label: 'PS Plus', href: '#' },
          { label: 'EA Play', href: '#' },
        ],
      },
      {
        name: 'Xbox',
        emoji: '🟢',
        items: [
          { label: 'Игры и DLC', href: '#' },
          { label: 'Пополнение баланса', href: '#' },
          { label: 'Новые аккаунты', href: '#' },
          { label: 'Xbox Game Pass', href: '#' },
          { label: 'Услуги', href: '#' },
        ],
      },
      {
        name: 'Nintendo',
        emoji: '🔴',
        items: [
          { label: 'Игры и DLC', href: '#' },
          { label: 'Подарочные карты', href: '#' },
          { label: 'Новые аккаунты', href: '#' },
          { label: 'NS Online', href: '#' },
        ],
      },
      {
        name: 'Battle.net',
        emoji: '🟦',
        items: [
          { label: 'World of Warcraft', href: '#' },
          { label: 'Подарочные карты', href: '#' },
          { label: 'Прямое пополнение', href: '#' },
          { label: 'Новые аккаунты', href: '#' },
          { label: 'Смена региона', href: '#' },
        ],
      },
    ],
    highlights: [
      { label: 'Скидки 90%', href: '#' },
      { label: 'Популярные издатели', href: '#' },
      { label: 'Лучшие серии игр', href: '#' },
      { label: 'Steam Deck', href: '#' },
      { label: 'Bundle-наборы', href: '#' },
    ],
  },
  {
    id: 'values',
    label: 'Игровые ценности',
    sections: [
      {
        name: 'Валюты',
        emoji: '💰',
        items: [
          { label: 'Steam Wallet', href: '#' },
          { label: 'PlayStation Store', href: '#' },
          { label: 'Xbox Live', href: '#' },
          { label: 'Nintendo eShop', href: '#' },
        ],
      },
      {
        name: 'Предметы',
        emoji: '🎁',
        items: [
          { label: 'Скины и предметы', href: '#' },
          { label: 'Внутриигровая валюта', href: '#' },
          { label: 'V-Bucks', href: '#' },
          { label: 'Genshin Impact', href: '#' },
        ],
      },
    ],
  },
  {
    id: 'mobile',
    label: 'Мобильные игры',
    sections: [
      {
        name: 'Популярные',
        emoji: '📱',
        items: [
          { label: 'Mobile Legends', href: '#' },
          { label: 'Genshin Impact', href: '#' },
          { label: 'PUBG Mobile', href: '#' },
          { label: 'Free Fire', href: '#' },
        ],
      },
      {
        name: 'Пополнение',
        emoji: '💳',
        items: [
          { label: 'Garena Diamonds', href: '#' },
          { label: 'MiHoYo Topup', href: '#' },
          { label: 'Google Play', href: '#' },
          { label: 'App Store', href: '#' },
        ],
      },
    ],
  },
  {
    id: 'services',
    label: 'Сервисы и соцсети',
    sections: [
      {
        name: 'Социальные сети',
        emoji: '🌐',
        items: [
          { label: 'VK', href: '#' },
          { label: 'Telegram', href: '#' },
          { label: 'Discord', href: '#' },
          { label: 'Twitch', href: '#' },
        ],
      },
      {
        name: 'Стриминг',
        emoji: '📺',
        items: [
          { label: 'Spotify', href: '#' },
          { label: 'Netflix', href: '#' },
          { label: 'YouTube Premium', href: '#' },
          { label: 'Kinopoisk', href: '#' },
        ],
      },
    ],
  },
  {
    id: 'programs',
    label: 'Программы',
    sections: [
      {
        name: 'Софт',
        emoji: '💻',
        items: [
          { label: 'Антивирусы', href: '#' },
          { label: 'Операционные системы', href: '#' },
          { label: 'Офисные пакеты', href: '#' },
          { label: 'Графические редакторы', href: '#' },
        ],
      },
      {
        name: 'Сервисы',
        emoji: '⚙️',
        items: [
          { label: 'Облачные хранилища', href: '#' },
          { label: 'VPN сервисы', href: '#' },
          { label: 'Хостинг', href: '#' },
          { label: 'Домены', href: '#' },
        ],
      },
    ],
  },
];

const toggle = () => {
  isOpen.value = !isOpen.value;
}

// Закрытие по клику вне дропдауна. Проверка contains обязательна: клик по
// кнопке «Каталог» (она тоже внутри dropdownRef) сперва открывал бы меню
// через toggle, а затем всплывал до document и мгновенно закрывал его.
function onDocumentClick(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isOpen.value = false;
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
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
