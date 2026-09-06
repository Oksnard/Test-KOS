<template>
  <div class="min-h-screen p-5">
    <div class="max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-3xl font-bold">🎮 Admin Panel</h1>
        <button
          v-if="authed"
          @click="logout"
          class="px-4 py-2 bg-surface-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
        >Выйти</button>
      </div>

      <div
        v-if="!authed"
        class="bg-surface-secondary border border-border p-5 rounded-xl mb-6 flex flex-col sm:flex-row gap-3 max-w-xl"
      >
        <input
          v-model="tokenInput"
          type="password"
          placeholder="Токен администратора"
          @keyup.enter="connect"
          class="flex-1 px-4 py-2.5 bg-surface-primary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
        />
        <button @click="connect" class="px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors">Войти</button>
      </div>
      <p v-if="!authed && !loadError" class="mb-6 -mt-3 text-xs text-text-secondary">
        Токен задан в docker-compose.yml (ADMIN_TOKEN) и .env.example
      </p>
      <p v-if="loadError" class="mb-6 text-danger">{{ loadError }}</p>

      <div class="grid grid-cols-4 gap-4 mb-8">
        <div class="bg-surface-secondary p-6 rounded-xl">
          <h3 class="text-3xl">{{ stats?.total_orders }}</h3>
          <p class="text-text-secondary text-sm">Всего заказов</p>
        </div>
        <div class="bg-surface-secondary p-6 rounded-xl">
          <h3 class="text-3xl text-success">{{ stats?.delivered_orders }}</h3>
          <p class="text-text-secondary text-sm">Выполнено</p>
        </div>
        <div class="bg-surface-secondary p-6 rounded-xl">
          <h3 class="text-3xl text-warning">{{ stats?.pending_orders }}</h3>
          <p class="text-text-secondary text-sm">В обработке</p>
        </div>
        <div class="bg-surface-secondary p-6 rounded-xl">
          <h3 class="text-3xl text-danger">{{ stats?.failed_orders }}</h3>
          <p class="text-text-secondary text-sm">Ошибки</p>
        </div>
      </div>

      <div class="flex gap-2 mb-6">
        <button v-for="tab in tabs" :key="tab" @click="activeTab = tab" :class="['px-5 py-2.5 rounded-lg font-medium transition-colors', activeTab === tab ? 'bg-primary text-white' : 'bg-surface-secondary text-text-secondary hover:bg-border']">
          {{ tab }}
        </button>
      </div>

      <div v-if="activeTab === 'orders'">
        <table class="w-full text-left">
          <thead>
            <tr class="text-text-secondary text-sm uppercase">
              <th class="pb-3">ID</th>
              <th class="pb-3">Номер</th>
              <th class="pb-3">Товар</th>
              <th class="pb-3">Статус</th>
              <th class="pb-3">Сумма</th>
              <th class="pb-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id" class="border-t border-border">
              <td class="py-3">{{ order.id }}</td>
              <td class="py-3">{{ order.orderNumber }}</td>
              <td class="py-3">{{ order.productName || order.product?.name }}</td>
              <td class="py-3">
                <span class="badge" :class="badgeClass(order.status)">{{ order.status }}</span>
              </td>
              <td class="py-3">${{ order.finalPrice }}</td>
              <td class="py-3">
                <button v-if="['out_of_stock', 'delivery_failed'].includes(order.status)" @click="deliver(order.id)" class="btn-secondary text-sm">Выдать ключ</button>
                <span v-else class="text-text-secondary">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="activeTab === 'keys'">
        <table class="w-full text-left">
          <thead>
            <tr class="text-text-secondary text-sm uppercase">
              <th class="pb-3">Товар</th>
              <th class="pb-3">Всего</th>
              <th class="pb-3">Использовано</th>
              <th class="pb-3">Доступно</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in keyPool" :key="item.productId" class="border-t border-border">
              <td class="py-3">Product #{{ item.productId }}</td>
              <td class="py-3">{{ item.total }}</td>
              <td class="py-3">{{ item.used }}</td>
              <td class="py-3">{{ item.available }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="activeTab === 'add-keys'">
        <div class="space-y-4 max-w-lg">
          <div>
            <label class="block text-text-secondary mb-2">Product ID</label>
            <input v-model="newKeyProductId" type="number" class="w-full px-4 py-3 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label class="block text-text-secondary mb-2">Ключи (по одному на строку)</label>
            <textarea v-model="newKeys" rows="6" class="w-full px-4 py-3 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary font-mono" placeholder="STEAM-XXXX-XXXX-XXXX&#10;STEAM-YYYY-YYYY-YYYY"></textarea>
          </div>
          <button @click="addKeys" class="btn-primary">Добавить ключи</button>
          <p v-if="addResult" :class="['text-sm mt-2', addResult.success ? 'text-success' : 'text-danger']">{{ addResult.message }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useAdminStore } from '~/stores/admin';

const adminStore = useAdminStore();
const { authed, stats, orders, keyPool, loadError } = storeToRefs(adminStore);

const activeTab = ref('orders');
const tabs = ['orders', 'keys', 'add-keys'];
const tokenInput = ref('');
const newKeyProductId = ref(1);
const newKeys = ref('');
const addResult = ref<{ success: boolean; message: string } | null>(null);

let refreshTimer: ReturnType<typeof setInterval> | null = null;

function connect() {
  adminStore.connect(tokenInput.value);
  tokenInput.value = '';
}

function logout() {
  adminStore.logout();
}

function badgeClass(status: string): string {
  if (status === 'delivered') return 'badge-success';
  if (['out_of_stock', 'delivery_failed'].includes(status)) return 'badge-danger';
  return 'badge-pending';
}

async function deliver(orderId: number) {
  try {
    const data = await adminStore.deliver(orderId);
    if (data.delivered) {
      alert(`Ключ выдан: ${data.key?.keyValue || 'автоматически'}`);
    } else {
      alert('Ошибка: ' + (data.error || 'Неизвестная ошибка'));
    }
  } catch (e) {
    alert('Ошибка выдачи: ' + ((e instanceof Error && e.message) || ''));
  }
}

async function addKeys() {
  const keys = newKeys.value.trim().split('\n').filter(Boolean);
  if (!keys.length) return;
  try {
    const message = await adminStore.addKeys(parseInt(String(newKeyProductId.value), 10), keys);
    addResult.value = { success: true, message };
    newKeys.value = '';
  } catch (e) {
    addResult.value = { success: false, message: 'Ошибка: ' + ((e instanceof Error && e.message) || '') };
  }
}

onMounted(() => {
  if (adminStore.authed) adminStore.refresh();
  refreshTimer = setInterval(() => {
    if (adminStore.authed) adminStore.refresh();
  }, 10000);
});

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>
