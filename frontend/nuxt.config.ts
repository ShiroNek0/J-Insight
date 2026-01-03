// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-12-31',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/i18n'],

  i18n: {
    locales: [
      { code: 'en', iso: 'en-US', file: 'en.json', name: 'English' },
      { code: 'ja', iso: 'ja-JP', file: 'ja.json', name: '日本語' },
      { code: 'vi', iso: 'vi-VN', file: 'vi.json', name: 'Tiếng Việt' }
    ],
    defaultLocale: 'en',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    },
    lazy: true,
    langDir: 'locales',
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.js',
  },

  app: {
    head: {
      title: 'J-INSIGHT | Japan Data Dashboard',
      meta: [
        { name: 'description', content: "An unified platform for monitoring Japan's public statistics and trends." }
      ],
    }
  },

  runtimeConfig: {
    public: {
      // Nuxt automatically reads NUXT_PUBLIC_API_BASE from environment
      // This value is the fallback for local development
      apiBase: 'http://localhost:3001/api'
    }
  }
})
