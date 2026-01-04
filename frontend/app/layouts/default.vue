<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
    <!-- Header -->
    <header class="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-9 h-9 rounded-full bg-white border border-slate-200 dark:border-slate-700 shadow-sm">
              <div class="w-3.5 h-3.5 bg-red-600 rounded-full"></div>
            </div>
            <div class="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <h1 class="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{{ $t('nav.title') }}</h1>
              <span class="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
              <h2 class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ $t('nav.subtitle') }}</h2>
            </div>
          </div>

          <!-- Language Switcher -->
          <div class="flex items-center gap-2">
            <LanguageSwitcher />

            <!-- Dark Mode Toggle -->
            <button
              @click="toggleDarkMode"
              class="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            >
              <svg v-if="isDark" class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
              </svg>
              <svg v-else class="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="relative mt-auto py-6">
      <!-- Gradient Line -->
      <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
      
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4">
        <div class="flex flex-col md:flex-row justify-center md:justify-between items-center gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          
          <!-- Left: Disclaimer & Data Source -->
          <div class="flex flex-col sm:flex-row items-center gap-1 text-center sm:text-left">
            <span>{{ $t('common.officialStatistics') }}</span>
            <a href="https://www.e-stat.go.jp/" target="_blank" rel="noopener" class="text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium hover:underline">e-Stat</a>
          </div>

          <!-- Right: Tech & Credits -->
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="hidden sm:inline">{{ $t('common.builtWith') }}</span>
              <a href="https://nestjs.com/" target="_blank" rel="noopener" class="hover:opacity-80 transition-transform hover:scale-110" title="NestJS">
                <img src="https://nestjs.com/img/logo-small.svg" alt="NestJS" class="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
              <a href="https://nuxt.com/" target="_blank" rel="noopener" class="hover:opacity-80 transition-transform hover:scale-110" title="Nuxt">
                <img src="https://nuxt.com/assets/design-kit/icon-green.svg" alt="Nuxt" class="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
            </div>
            
            <span class="text-slate-300 dark:text-slate-700">|</span>

            <a href="https://github.com/ShiroNek0" target="_blank" rel="noopener" class="flex items-center gap-2 group/author">
              <img src="https://github.com/ShiroNek0.png" alt="ShiroNek0" class="h-5 w-5 sm:h-6 sm:w-6 rounded-full ring-2 ring-transparent group-hover/author:ring-indigo-500 dark:group-hover/author:ring-indigo-400 transition-all" />
              <span class="font-medium text-slate-600 dark:text-slate-300 group-hover/author:text-indigo-500 dark:group-hover/author:text-indigo-400 transition-colors">ShiroNek0</span>
            </a>

            <span class="text-slate-300 dark:text-slate-700">|</span>

            <a href="https://github.com/ShiroNek0/JpDashboard" target="_blank" rel="noopener" class="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" :title="$t('common.viewSource')">
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.943 0-1.091.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.597 1.028 2.688 0 3.848-2.339 4.685-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const { isDark, toggle: toggleDarkMode } = useDarkMode();
</script>
