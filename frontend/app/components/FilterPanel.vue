<template>
  <div class="flex flex-wrap items-center gap-4">
    <!-- Bureau Filter -->
    <div class="flex-1 min-w-filter-min">
      <BaseSelect
        :model-value="bureau"
        :options="localizedBureaus"
        :label="$t('filters.bureau')"
        :disabled="bureauDisabled"
        @update:model-value="$emit('update:bureau', $event as string)"
      />
    </div>

    <!-- Application Type Filter -->
    <div class="flex-1 min-w-filter-min">
      <BaseSelect
        :model-value="type"
        :options="applicationTypeOptions"
        :label="$t('filters.applicationType')"
        @update:model-value="$emit('update:type', $event as string)"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import type { BureauOption } from '~/composables/useStats';
import BaseSelect from './common/BaseSelect.vue';

interface Props {
  bureau: string;
  type: string;
  bureaus: BureauOption[];
  bureauDisabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  bureauDisabled: false,
});

defineEmits<{
  'update:bureau': [value: string];
  'update:type': [value: string];
}>();

const { t } = useI18n();

const applicationTypeOptions = computed(() => [
  { value: 'all', label: t('filters.allTypes') },
  { value: '10', label: t('applicationTypes.statusAcquisition') },
  { value: '20', label: t('applicationTypes.periodExtension') },
  { value: '30', label: t('applicationTypes.statusChange') },
  { value: '40', label: t('applicationTypes.extraStatusActivities') },
  { value: '50', label: t('applicationTypes.reEntry') },
  { value: '60', label: t('applicationTypes.permanentResidence') },
]);

const localizedBureaus = computed(() => {
  return props.bureaus.map(b => ({
    ...b,
    label: t(`bureaus.${b.value}`, b.label)
  }));
});
</script>
