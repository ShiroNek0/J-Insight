<template>
  <div ref="container" class="katex-container" :class="{ 'inline-block': inline }"></div>
</template>

<script setup lang="ts">
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Props {
  formula: string;
  inline?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  inline: false,
});

const container = ref<HTMLElement | null>(null);

const renderMath = () => {
  if (container.value) {
    try {
      katex.render(props.formula, container.value, {
        throwOnError: false,
        displayMode: !props.inline,
      });
    } catch (e) {
      console.error('KaTeX rendering error:', e);
      if (container.value) {
        container.value.innerText = props.formula;
      }
    }
  }
};

onMounted(renderMath);
watch(() => props.formula, renderMath);
</script>

<style scoped>
/* Ensure fonts are loaded */
.katex-container {
  font-size: 1.1em;
}

/* Dark mode support for KaTeX */
.katex-container :deep(.katex) {
  color: inherit;
}

/* When parent is dark mode */
:global(.dark) .katex-container {
  color: #e2e8f0; /* slate-200 */
}

/* Override KaTeX's internal colors if needed */
:global(.dark) .katex-container :deep(.katex-html) {
  color: #e2e8f0;
}
</style>
