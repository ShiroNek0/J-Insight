<template>
  <div :class="containerClass">
    <label v-if="label" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
      {{ label }}
    </label>
    <div class="relative flex items-center">
      <span v-if="icon && variant === 'chart'" class="absolute left-2 z-10 pointer-events-none">
        {{ icon }}
      </span>
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
      <svg v-if="variant === 'chart'" class="absolute right-2.5 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
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
  icon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  disabled: false,
  options: () => [],
  icon: undefined,
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
    // Chart variant (translucent, smaller, with hover effects)
    const iconPadding = props.icon ? 'pl-8' : 'px-3';
    return `${base} appearance-none cursor-pointer text-sm ${iconPadding} pr-8 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 backdrop-blur-sm text-slate-700 dark:text-slate-300 shadow-sm`;
  }

  // Default variant (Form style - full width, distinct background)
  return `${base} w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-transparent`;
});
</script>
