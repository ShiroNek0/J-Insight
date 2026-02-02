<template>
  <div class="space-y-4">
    <div v-if="loading" class="h-chart-lg flex items-center justify-center">
      <div class="animate-spin text-3xl">⟳</div>
    </div>

    <div v-else class="flex flex-col relative h-auto md:h-chart-lg">
      <!-- Period Selector -->
      <div class="flex justify-end mb-2 px-2">
        <BaseSelect
          v-model.number="selectedPeriod"
          :options="periodOptions"
          variant="chart"
          icon="📅"
        />
      </div>

      <!-- Content Wrapper -->
      <div class="flex-1 flex flex-col md:flex-row items-center justify-start gap-8 w-full min-h-0 px-2">
        <!-- Legend (Left Side) -->
        <div class="w-full md:w-96 flex-shrink-0 grid grid-cols-2 gap-x-4 gap-y-1">
          <div
            v-for="segment in chartSegments"
            :key="segment.bureau"
            class="flex items-center gap-2 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            @mouseenter="hoveredSegment = segment"
            @mouseleave="hoveredSegment = null"
          >
            <div
              class="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
              :style="{ backgroundColor: segment.color }"
            ></div>
            <div class="flex-1 min-w-0 flex justify-between items-center">
              <p class="text-base font-medium text-slate-700 dark:text-slate-300 truncate">
                {{ segment.bureau }}
              </p>
              <p class="text-sm font-mono text-slate-500 dark:text-slate-400">
                {{ (segment.percentage).toFixed(1) }}%
              </p>
            </div>
          </div>
        </div>

        <!-- Chart Wrapper (Centers the chart in the remaining space) -->
        <div class="flex-1 w-full flex justify-center">
          <!-- Donut Chart Visualization (Right Side, Enlarged for Desktop, Responsive for Mobile) -->
          <div class="relative w-full max-w-legend-max aspect-square flex-shrink-0">
            <svg viewBox="28 28 44 44" class="w-full h-full transform -rotate-90">
              <circle
                v-for="(segment, index) in chartSegments"
                :key="segment.bureau"
                :r="15.91549430918954"
                cx="50"
                cy="50"
                fill="transparent"
                :stroke="segment.color"
                stroke-width="12"
                :stroke-dasharray="`${segment.percentage} ${100 - segment.percentage}`"
                :stroke-dashoffset="`${-segment.offset}`"
                class="transition-all duration-300 hover:opacity-80 cursor-pointer"
                @mouseenter="hoveredSegment = segment"
                @mouseleave="hoveredSegment = null"
              />
            </svg>
            
            <!-- Center Text -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="text-center transform scale-75 md:scale-100">
                <span class="text-4xl font-bold text-slate-900 dark:text-white">
                  {{ total.toLocaleString() }}
                </span>
                <p class="text-lg text-slate-500 dark:text-slate-400 mt-1">{{ $t('common.total') }}</p>
              </div>
            </div>

            <!-- Tooltip -->
            <div
              v-if="hoveredSegment"
              class="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            >
              <div class="bg-slate-800 text-white rounded px-4 py-3 text-sm shadow-xl transform translate-y-20">
                <p class="font-bold text-lg">{{ hoveredSegment.bureau }}</p>
                <p class="text-base">{{ hoveredSegment.value.toLocaleString() }} ({{ hoveredSegment.percentage.toFixed(1) }}%)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { chartColors } from '~/constants/chartColors';
import BaseSelect from './common/BaseSelect.vue';

interface DataItem {
  month: string;
  received: number;
  processed: number;
}

interface ChartSegment {
  bureau: string;
  value: number;
  percentage: number;
  color: string;
  offset: number;
}

interface Props {
  data: DataItem[];
  loading?: boolean;
  selectedType?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  selectedType: 'all',
});

const hoveredSegment = ref<ChartSegment | null>(null);

// Use bureau distribution from composable
const { bureauDistribution, fetchBureauDistribution, bureaus, fetchBureaus } = useStats();
const { isDark } = useDarkMode();
const { t, locale } = useI18n();

const selectedPeriod = ref(1); // Default to Latest Month

const periodOptions = computed(() => [
  { value: 1, label: t('periods.latestMonth') },
  { value: 12, label: t('periods.12months') },
  { value: 24, label: t('periods.24months') },
  { value: 36, label: t('periods.36months') },
  { value: 0, label: t('periods.allTime') },
]);

const fetchDistribution = () => {
  const filter = {
    bureau: 'all',
    type: props.selectedType,
    monthRange: selectedPeriod.value,
  };
  fetchBureauDistribution(filter);
};

// Fetch distribution data on mount/update
onMounted(async () => {
  await fetchBureaus();
  fetchDistribution();
});

watch([() => props.data, selectedPeriod, () => props.selectedType, isDark, locale], () => {
  fetchDistribution();
});

const total = computed(() => 
  bureauDistribution.value.reduce((sum, d) => sum + d.value, 0)
);

const chartSegments = computed(() => {
  const distribution = bureauDistribution.value;
  if (!distribution.length) return [];

  let offset = 0;
  
  // Create a map of bureau codes to labels/colors
  const bureauInfoMap = new Map(
    bureaus.value.map((b, index) => [b.value, {
      label: t(`bureaus.${b.value}`, b.label),
      color: chartColors.bureaus[index % chartColors.bureaus.length]
    }])
  );

  return distribution.map((item) => {
    // Default color if map lookup fails
    const info = bureauInfoMap.get(item.bureau) || { label: item.bureau, color: '#cbd5e1' };
    const percentage = total.value > 0 ? (item.value / total.value) * 100 : 0;
    
    // Ensure color is a string
    const color = info.color || '#cbd5e1';

    const segment = {
      bureau: info.label,
      value: item.value,
      percentage,
      color: color,
      offset,
    };
    offset += percentage;
    return segment;
  });
});
</script>
