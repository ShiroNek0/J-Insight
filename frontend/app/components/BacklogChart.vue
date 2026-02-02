<template>
  <div class="space-y-4">
    <div v-if="loading" class="h-chart-sm md:h-chart-lg flex items-center justify-center">
      <div class="animate-spin text-3xl">⟳</div>
    </div>

    <div v-else class="h-chart-sm md:h-chart-lg relative flex flex-col">
      <!-- Period Selector -->
      <div class="flex justify-end mb-2 px-2">
        <BaseSelect
          v-model.number="selectedPeriod"
          :options="periodOptions"
          variant="chart"
          icon="📅"
        />
      </div>
      
      <div class="flex-1 min-h-0 w-full relative">
        <canvas ref="chartCanvas"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chart, type ChartConfiguration, registerables } from 'chart.js';
import { chartColors, chartFonts, getChartUIColors } from '~/constants/chartColors';
import BaseSelect from './common/BaseSelect.vue';

Chart.register(...registerables);

interface DataItem {
  month: string;
  [key: string]: string | number;
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

const { isDark } = useDarkMode();
const { t, locale } = useI18n();

const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const selectedPeriod = ref(12);

const periodOptions = computed(() => [
  { value: 12, label: t('periods.12months') },
  { value: 24, label: t('periods.24months') },
  { value: 36, label: t('periods.36months') },
  { value: 0, label: t('periods.allTime') },
]);

// Computed type labels for translation
const typeLabels = computed<Record<string, string>>(() => ({
  '10': t('applicationTypes.statusAcquisition'),
  '20': t('applicationTypes.periodExtension'),
  '30': t('applicationTypes.statusChange'),
  '40': t('applicationTypes.extraStatusActivities'),
  '50': t('applicationTypes.reEntry'),
  '60': t('applicationTypes.permanentResidence'),
}));

const createChart = () => {
  if (!chartCanvas.value) return;

  const ctx = chartCanvas.value.getContext('2d');
  if (!ctx) return;

  // Destroy existing chart and clear reference immediately to prevent race conditions
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const displayData = selectedPeriod.value === 0 
    ? props.data 
    : props.data.slice(-selectedPeriod.value);

  const months = displayData.map(d => d.month as string);
  
  // Determine datasets
  const datasets: any[] = [];
  
  if (displayData.length > 0) {
    const firstItem = displayData[0];
    const typeKeys = firstItem ? Object.keys(firstItem).filter(k => chartColors.types[k]) : [];

    if (typeKeys.length > 0) {
      // Filter keys based on selectedType
      const keysToShow = props.selectedType === 'all'
        ? typeKeys
        : typeKeys.filter(k => k === props.selectedType);

      // Multiple types (backlog trend mode)
      keysToShow.forEach(type => {
        datasets.push({
          label: typeLabels.value[type] || type,
          data: displayData.map(d => Number(d[type] || 0)),
          borderColor: chartColors.types[type],
          backgroundColor: chartColors.types[type],
          fill: false,
          tension: 0.4,
          hoverBorderWidth: 4,
        });
      });
    } else {
      // Fallback (single pending line)
      datasets.push({
        label: `${t('chartLabels.pending')} (${t('chartLabels.backlog')})`,
        data: displayData.map(d => Number(d.pending || 0)),
        borderColor: chartColors.types['30'],
        backgroundColor: chartColors.types['30'],
        fill: false,
        tension: 0.4,
        hoverBorderWidth: 4,
      });
    }
  }

  const uiColors = getChartUIColors(isDark.value);

  const config: ChartConfiguration = {
    type: 'line',
    data: {
      labels: months,
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            color: uiColors.text,
            font: {
               family: chartFonts.family,
               size: chartFonts.size - 1,
            }
          },
          title: {
            display: false,
          }
        },
        title: {
          display: false,
        },
        tooltip: {
          itemSort: (a, b) => (b.raw as number) - (a.raw as number),
          usePointStyle: true,
          backgroundColor: uiColors.tooltipBg,
          titleColor: uiColors.tooltipText,
          bodyColor: uiColors.text,
          borderColor: uiColors.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          bodyFont: {
            family: chartFonts.family,
            size: chartFonts.size,
          },
          titleFont: {
            family: chartFonts.family,
            size: chartFonts.size,
            weight: 'bold',
          },
        }
      },
      scales: {
        x: {
          ticks: {
            color: uiColors.text,
            font: {
              family: chartFonts.family,
              size: chartFonts.size,
            }
          },
          grid: {
            display: false,
          },
          title: {
            display: true,
            text: t('common.month'),
            color: uiColors.text,
            font: {
              family: chartFonts.family,
              size: chartFonts.size,
              weight: 'bold',
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: uiColors.grid,
          },
          ticks: {
            color: uiColors.text,
            font: {
              family: chartFonts.family,
              size: chartFonts.size,
            }
          },
          title: {
            display: true,
            text: t('charts.backlogTrend'),
            color: uiColors.text,
            font: {
              family: chartFonts.family,
              size: chartFonts.size,
              weight: 'bold',
            }
          }
        },
      },
    },
  };

  chartInstance = new Chart(ctx, config);
};

// Create chart when data changes or component mounts
watch([() => props.data, selectedPeriod, () => props.selectedType, isDark, locale], () => {
  if (!props.loading) {
    nextTick(() => {
      createChart();
    });
  }
}, { deep: true });

onMounted(() => {
  if (props.data.length > 0) {
    createChart();
  }
});

// Cleanup
onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy();
  }
});
</script>
