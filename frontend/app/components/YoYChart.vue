<template>
  <div class="space-y-4">
    <div v-if="loading" class="h-chart-sm md:h-chart-lg flex items-center justify-center">
      <div class="animate-spin text-3xl">⟳</div>
    </div>

    <div v-else class="h-chart-sm md:h-chart-lg relative flex flex-col">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-center mb-2 px-2 gap-2 flex-shrink-0">
        <h3 class="text-xl font-bold text-slate-600 dark:text-slate-400 order-2 sm:order-1">{{ $t('charts.yearOverYear') }}</h3>
        <div class="order-1 sm:order-2 self-end sm:self-auto">
          <BaseSelect
            v-model.number="selectedPeriod"
            :options="periodOptions"
            variant="chart"
          />
        </div>
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
  received: number;
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

  // Display data based on selected period
  const recentData = selectedPeriod.value === 0 
    ? props.data 
    : props.data.slice(-selectedPeriod.value);

  const labels = recentData.map(d => {
    const date = new Date(d.month + '-01');
    if (recentData.length > 12) {
      return date.toLocaleDateString(locale.value, { month: 'short', year: '2-digit' });
    }
    return date.toLocaleDateString(locale.value, { month: 'short' });
  });

  const currentValues = recentData.map(d => d.received);
  
  // Find previous year data for each month
  const previousValues = recentData.map(d => {
    const currentMonthParts = d.month.split('-');
    const prevYear = parseInt(currentMonthParts[0] || '0') - 1;
    const prevMonthStr = `${prevYear}-${currentMonthParts[1]}`;
    const match = props.data.find(item => item.month === prevMonthStr);
    return match ? match.received : 0;
  });

  // Store month strings for tooltip access
  const monthStrings = recentData.map(d => d.month);

  const uiColors = getChartUIColors(isDark.value);

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: t('chartLabels.yearAgo'),
          data: previousValues,
          backgroundColor: chartColors.previous,
        },
        {
          label: t('chartLabels.current'),
          data: currentValues,
          backgroundColor: chartColors.current,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            padding: 25,
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
            title: (context: any[]) => {
              const index = context[0]?.dataIndex ?? 0;
              const monthStr = monthStrings[index];
              if (!monthStr) return '';
              const date = new Date(monthStr + '-01');
              return date.toLocaleDateString(locale.value, { month: 'long', year: 'numeric' });
            },
            label: (context: any) => {
              const index = context.dataIndex;
              const monthStr = monthStrings[index];
              if (!monthStr) return '';

              const parts = monthStr.split('-');
              const currentYear = parts[0];
              const prevYear = (parseInt(currentYear || '0') - 1).toString();
              const monthName = new Date(monthStr + '-01').toLocaleDateString(locale.value, { month: 'short' });

              const currentVal = currentValues[index] ?? 0;
              const prevVal = previousValues[index] ?? 0;

              if (context.datasetIndex === 0) {
                // Year Ago dataset
                return `${monthName} ${prevYear}: ${prevVal.toLocaleString()}`;
              } else {
                // Current dataset
                return `${monthName} ${currentYear}: ${currentVal.toLocaleString()}`;
              }
            },
            afterBody: (context: any[]) => {
              const index = context[0]?.dataIndex ?? 0;
              const currentVal = currentValues[index] ?? 0;
              const prevVal = previousValues[index] ?? 0;

              if (prevVal === 0) {
                return currentVal > 0 ? ['', 'Change: N/A (no prior data)'] : [];
              }

              const change = ((currentVal - prevVal) / prevVal) * 100;
              const sign = change >= 0 ? '+' : '';
              return ['', `Change: ${sign}${change.toFixed(1)}%`];
            },
          },
        },
      },
      interaction: {
        mode: 'index',
        intersect: false,
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
watch([() => props.data, selectedPeriod, isDark, locale], () => {
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
