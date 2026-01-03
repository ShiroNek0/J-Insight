<template>
  <div :class="containerClass">
    <label v-if="label" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
      {{ label }}
    </label>
    <div class="relative">
      <select
        :value="modelValue"
        @change="updateValue"
        :disabled="disabled"
        :class="selectClass"
      >
        <option v-for="option in normalizedOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Option {
  label: string;
  value: string | number;
}

interface Props {
  modelValue: string | number;
  options?: (Option | string | number)[];
  label?: string;
  variant?: 'default' | 'chart';
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  disabled: false,
  options: () => [],
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
}>();

const normalizedOptions = computed(() => {
  return props.options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return opt as Option;
    }
    return { label: String(opt), value: opt };
  });
});

const updateValue = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const val = target.value;
  const isNumber = typeof props.modelValue === 'number';
  if (isNumber) {
    emit('update:modelValue', parseFloat(val));
  } else {
    emit('update:modelValue', val);
  }
};

const containerClass = computed(() => {
  return props.variant === 'default' ? 'w-full' : 'inline-block';
});

const selectClass = computed(() => {
  // Common styles
  const base = 'focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  
  if (props.variant === 'chart') {
    // Chart variant (translucent, smaller)
    return `${base} text-sm px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-700 dark:text-slate-300 shadow-sm`;
  }
  
  // Default variant (Form style - full width, distinct background)
  return `${base} w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-transparent`;
});
</script>
