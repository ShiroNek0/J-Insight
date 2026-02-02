<template>
  <div class="space-y-4">
    <div v-if="loading" class="h-chart-sm md:h-chart-lg flex items-center justify-center">
      <div class="animate-spin text-3xl">⟳</div>
    </div>

    <div v-else class="h-chart-sm md:h-chart-lg relative flex flex-col">
      <!-- Period Selector and Threshold Note -->
      <div class="flex justify-between items-center px-2 mb-2">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ $t('charts.bureauApprovalRate.thresholdNote', { count: threshold }) }}
        </p>
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

interface Props {
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const { isDark } = useDarkMode();
const { t, locale } = useI18n();
const { bureauApprovalRates, fetchBureauApprovalRates } = useStats();

const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const threshold = computed(() => bureauApprovalRates.value?.threshold ?? 50);

const selectedPeriod = ref(1); // Default to Latest Month

const periodOptions = computed(() => [
  { value: 1, label: t('periods.latestMonth') },
  { value: 12, label: t('periods.12months') },
  { value: 24, label: t('periods.24months') },
  { value: 36, label: t('periods.36months') },
  { value: 0, label: t('periods.allTime') },
]);

// Colors for bureaus
const NATIONWIDE_COLOR = '#f59e0b'; // amber-500 for highlight
const NATIONWIDE_COLOR_DARK = '#fbbf24'; // amber-400 for dark mode

const getBureauColor = (bureauCode: string, index: number): string => {
  if (bureauCode === '100000') {
    return isDark.value ? NATIONWIDE_COLOR_DARK : NATIONWIDE_COLOR;
  }
  // Use the bureau palette from chartColors
  return chartColors.bureaus[index % chartColors.bureaus.length];
};

const createChart = () => {
  if (!chartCanvas.value) return;

  const ctx = chartCanvas.value.getContext('2d');
  if (!ctx) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const data = bureauApprovalRates.value?.data ?? [];
  if (!data.length) return;

  // Get translated bureau names
  const labels = data.map((d) => {
    if (d.bureauCode === '100000') {
      return t('charts.bureauApprovalRate.nationwide');
    }
    return t(`bureaus.${d.bureauCode}`, d.bureau);
  });

  const approvalRates = data.map((d) => d.approvalRate);
  const processed = data.map((d) => d.processed);
  const bureauCodes = data.map((d) => d.bureauCode);

  // Assign colors - track index for non-nationwide bureaus
  let colorIndex = 0;
  const backgroundColors = bureauCodes.map((code) => {
    if (code === '100000') {
      return isDark.value ? NATIONWIDE_COLOR_DARK : NATIONWIDE_COLOR;
    }
    const color = chartColors.bureaus[colorIndex % chartColors.bureaus.length];
    colorIndex++;
    return color;
  });

  const uiColors = getChartUIColors(isDark.value);

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: t('stats.approvalRate'),
          data: approvalRates,
          backgroundColor: backgroundColors,
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: 'y', // Horizontal bars
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false, // Hide legend since bars are self-explanatory
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
          callbacks: {
            label: (context) => {
              const index = context.dataIndex;
              const rate = approvalRates[index];
              const count = processed[index];
              return `${rate.toFixed(1)}% (${count.toLocaleString()} ${t('charts.bureauApprovalRate.processed')})`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: uiColors.grid,
          },
          ticks: {
            color: uiColors.text,
            font: {
              family: chartFonts.family,
              size: chartFonts.size,
            },
            callback: (value) => `${value}%`,
          },
          title: {
            display: true,
            text: t('stats.approvalRate'),
            color: uiColors.text,
            font: {
              family: chartFonts.family,
              size: chartFonts.size,
              weight: 'bold',
            },
          },
        },
        y: {
          grid: {
            display: false,
          },
          ticks: {
            color: uiColors.text,
            font: {
              family: chartFonts.family,
              size: chartFonts.size,
            },
          },
        },
      },
    },
  };

  chartInstance = new Chart(ctx, config);
};

// Fetch data - hardcoded to Permanent Residence (type 60)
const fetchData = async () => {
  await fetchBureauApprovalRates('60', selectedPeriod.value);
};

// Initial fetch
onMounted(async () => {
  await fetchData();
  if (bureauApprovalRates.value?.data?.length) {
    createChart();
  }
});

// Watch for period changes and refetch
watch(selectedPeriod, () => {
  fetchData();
});

// Watch for changes to redraw chart
watch([bureauApprovalRates, () => isDark.value, locale], () => {
  if (!props.loading && bureauApprovalRates.value?.data?.length) {
    nextTick(() => {
      createChart();
    });
  }
}, { deep: true });

// Cleanup
onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy();
  }
});
</script>
