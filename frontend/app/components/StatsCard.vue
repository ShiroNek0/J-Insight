<template>
  <div :class="[
    'card p-3 flex items-center space-x-3',
    colorClasses[color]
  ]">
    <div class="text-2xl">{{ icon }}</div>
    <div class="flex-1">
      <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ title }}</p>
      <p v-if="subtitle" class="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{{ subtitle }}</p>
      <div class="flex flex-col items-start gap-0">
        <p class="text-xl font-bold text-slate-900 dark:text-white">
          <template v-if="typeof value === 'number'">
            {{ formatNumber(value) }}
          </template>
          <template v-else>
            {{ value }}
          </template>
        </p>
        <slot name="after-value"></slot>
      </div>
    </div>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  subtitle?: string;
  value: number | string;
  icon: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const props = withDefaults(defineProps<Props>(), {
  color: 'blue',
});

const colorClasses = {
  blue: 'border-l-4 border-l-blue-500',
  green: 'border-l-4 border-l-emerald-500',
  purple: 'border-l-4 border-l-purple-500',
  orange: 'border-l-4 border-l-orange-500',
  red: 'border-l-4 border-l-red-500',
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};
</script>
