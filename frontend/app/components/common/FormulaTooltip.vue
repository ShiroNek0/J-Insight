<template>
  <div class="group relative">
    <slot></slot>
    <div class="mt-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-700/50">
      <div v-for="(desc, symbol) in variables" :key="symbol" class="flex gap-2 mb-1 last:mb-0">
        <span class="font-mono font-bold text-slate-700 dark:text-slate-300 min-w-[3rem] text-right">
          <MathBlock :formula="String(symbol)" inline />
        </span>
        <span class="text-slate-600 dark:text-slate-400">: {{ desc }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MathBlock from './MathBlock.vue';

interface Props {
  variables: Record<string, string>;
}

defineProps<Props>();
</script>
