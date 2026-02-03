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
  granted: number;
  denied: number;
  processed: number;
}

interface Props {
  data: DataItem[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
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

  const months = displayData.map(d => d.month);
  const granted = displayData.map(d => d.granted);
  const denied = displayData.map(d => d.denied);

  const uiColors = getChartUIColors(isDark.value);

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: t('chartLabels.granted'),
          data: granted,
          backgroundColor: chartColors.granted,
          stack: 'Stack 0',
        },
        {
          label: t('chartLabels.denied'),
          data: denied,
          backgroundColor: chartColors.denied,
          stack: 'Stack 0',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            padding: 30,
            color: uiColors.text,
            font: {
              family: chartFonts.family,
              size: chartFonts.size,
            }
          }
        },
        title: {
          display: false,
        },
        tooltip: {
          backgroundColor: uiColors.tooltipBg,
          titleColor: uiColors.tooltipText,
          bodyColor: uiColors.text,
          borderColor: uiColors.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          usePointStyle: true,
          bodyFont: {
            family: chartFonts.family,
            size: chartFonts.size,
          },
          titleFont: {
            family: chartFonts.family,
            size: chartFonts.size,
            weight: 'bold',
          },
          footerFont: {
             family: chartFonts.family,
             size: chartFonts.size,
          },
          callbacks: {
            footer: (tooltipItems: any[]) => {
              const firstItem = tooltipItems[0];
              if (!firstItem) return '';
              const dataIndex = firstItem.dataIndex;
              const item = displayData[dataIndex];
              if (!item) return '';
              if (item.processed === 0) return '';
              const approvalRate = (item.granted / item.processed) * 100;
              return `${t('chartLabels.approvalRate')}: ${approvalRate.toFixed(1)}%`;
            }
          },
          footerColor: uiColors.tooltipText,
        }
      },
      scales: {
        x: {
          stacked: true,
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
          stacked: true,
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
            text: t('common.applications'),
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
watch([() => props.data, selectedPeriod, () => isDark.value, locale], () => {
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
