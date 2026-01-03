<template>
  <div class="relative" ref="containerRef">
    <button
      @click="toggleDropdown"
      class="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 text-slate-700 dark:text-slate-200"
      :title="$t('settings.language')"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-5 h-5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S12 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S12 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
        />
      </svg>
      <span class="text-sm font-medium uppercase">{{ locale }}</span>
    </button>

    <!-- Dropdown -->
    <div
      v-if="isOpen"
      class="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-50 focus:outline-none border border-slate-100 dark:border-slate-700"
    >
      <button
        v-for="l in availableLocales"
        :key="l.code"
        @click="switchLanguage(l.code)"
        class="flex w-full items-center px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        :class="[
          locale === l.code
            ? 'text-indigo-600 dark:text-indigo-400 font-medium bg-slate-50 dark:bg-slate-700/50'
            : 'text-slate-700 dark:text-slate-200'
        ]"
      >
        <span class="flex-1 text-left">{{ l.name }}</span>
        <svg
          v-if="locale === l.code"
          class="w-4 h-4 text-indigo-600 dark:text-indigo-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const { locale, locales, setLocale } = useI18n()
const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const availableLocales = computed(() => {
  return locales.value
})

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const switchLanguage = async (code: string) => {
  await setLocale(code)
  isOpen.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
