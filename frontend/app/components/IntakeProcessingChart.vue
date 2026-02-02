<template>
  <div class="space-y-4">
    <div v-if="loading" class="h-chart-sm md:h-chart-lg flex items-center justify-center">
      <div class="animate-spin text-3xl">⟳</div>
    </div>

    <div v-else-if="data.length === 0" class="h-chart-sm md:h-chart-lg flex items-center justify-center text-slate-500">
      No data available
    </div>

    <div v-else class="h-chart-sm md:h-chart-lg w-full relative flex flex-col">
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
      <Chart
        :key="isDark ? 'dark' : 'light'"
        type="bar"
        :data="chartData"
        :options="chartOptions"
        class="w-full h-full"
      />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Chart } from 'vue-chartjs';
import { chartColors, chartFonts, getChartUIColors } from '~/constants/chartColors';
import BaseSelect from './common/BaseSelect.vue';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DataItem {
  month: string;
  received: number;
  processed: number;
  pending: number;
  granted: number;
  denied: number;
}

interface Props {
  data: DataItem[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const { isDark } = useDarkMode();
const { t } = useI18n();

const selectedPeriod = ref(12);

const periodOptions = computed(() => [
  { value: 12, label: t('periods.12months') },
  { value: 24, label: t('periods.24months') },
  { value: 36, label: t('periods.36months') },
  { value: 0, label: t('periods.allTime') },
]);

const displayData = computed(() => {
  if (selectedPeriod.value === 0) return props.data;
  return props.data.slice(-selectedPeriod.value);
});

const chartData = computed(() => {
  const data = displayData.value;
  
  return {
    labels: data.map(d => d.month),
    datasets: [
      {
        type: 'bar' as const,
        label: t('chartLabels.backlog'),
        backgroundColor: chartColors.pending,
        // Legacy = Pending - New. If New > Pending, Legacy is 0.
        data: data.map(d => Math.max(0, d.pending - d.received)),
        stack: 'combined',
        order: 1, // Top-most
      },
      {
        type: 'bar' as const,
        label: t('chartLabels.new'),
        backgroundColor: chartColors.newReceived,
        // New in Pending = Math.min(Pending, New).
        data: data.map(d => Math.min(d.pending, d.received)),
        stack: 'combined',
        order: 2,
      },
      {
        type: 'bar' as const,
        label: t('chartLabels.denied'),
        backgroundColor: chartColors.denied,
        data: data.map(d => d.denied),
        stack: 'combined',
        order: 3,
      },
      {
        type: 'bar' as const,
        label: t('chartLabels.granted'),
        backgroundColor: chartColors.granted,
        data: data.map(d => d.granted),
        stack: 'combined',
        order: 4, // Bottom-most
      }
    ]
  };
});

const chartOptions = computed(() => {
  const uiColors = getChartUIColors(isDark.value);

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        stacked: true, // Enable stacking on Y axis
        position: 'left' as const,
        grid: {
          color: uiColors.grid,
        },
        ticks: {
          color: uiColors.text,
          font: {
            family: chartFonts.family,
            size: chartFonts.size,
          },
          callback: (value: number) => {
            if (value >= 1000) return `${value / 1000}k`;
            return value;
          }
        },
        title: {
          display: true,
          text: t('chartLabels.totalApplications'),
          color: uiColors.text,
          font: {
            family: chartFonts.family,
            size: chartFonts.size,
            weight: 'bold',
          }
        }
      },
      x: {
        stacked: true, // Enable stacking on X axis
        grid: {
          display: false,
        },
        ticks: {
          color: uiColors.text,
          maxRotation: 45,
          minRotation: 45,
          font: {
            family: chartFonts.family,
            size: chartFonts.size,
          }
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
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 25,
          color: uiColors.text,
          usePointStyle: true,
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
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || '';
            const value = context.parsed.y;

            if (label) {
              label += ': ';
            }
            if (value !== null) {
              label += new Intl.NumberFormat('en-US').format(value);
            }

            return label;
          }
        }
      }
    }
  };
}) as any;
</script>
