<template>
  <div class="flex items-center space-x-2 text-sm">
    <span 
      class="flex items-center font-medium"
      :class="isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
    >
      <span class="mr-1">{{ isUp ? '↑' : '↓' }}</span>
      {{ Math.abs(percentageChange).toFixed(1) }}%
    </span>
    <span class="text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
      {{ $t('common.vsLastMonth') }}
    </span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  current: number;
  previous: number;
  inverse?: boolean;
  calculation?: 'percent' | 'difference';
}

const props = withDefaults(defineProps<Props>(), {
  inverse: false,
  calculation: 'percent',
});


const percentageChange = computed(() => {
  if (props.calculation === 'difference') {
    return props.current - props.previous;
  }
  if (props.previous === 0) return 0;
  return ((props.current - props.previous) / props.previous) * 100;
});

const isUp = computed(() => percentageChange.value >= 0);

// Determine if the change is "good" (green) or "bad" (red)
// Default: Up is Good (Green), Down is Bad (Red)
// Inverse: Up is Bad (Red), Down is Good (Green)
const isGood = computed(() => {
  if (props.inverse) {
    return !isUp.value;
  }
  return isUp.value;
});
</script>
