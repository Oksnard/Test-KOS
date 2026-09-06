// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: false,
  css: [
    '~/assets/css/tailwind.generated.css',
  ],
  modules: ['@pinia/nuxt'],
  app: {
    head: {
      title: 'GameKey Store - Цифровые товары для геймеров',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    },
  },
  nitro: {
    prerender: {
      routes: ['/', '/admin', '/order/placeholder'],
    },
  },
  compatibilityDate: '2024-01-01',
});
