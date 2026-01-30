<template>
  <div class="space-y-3 pt-6">
    <!-- Filter Panel -->
    <FilterPanel
      :bureau="displayedBureau"
      @update:bureau="selectedBureau = $event"
      v-model:type="selectedType"
      :bureaus="bureaus"
      :bureau-disabled="isBureauFilterDisabled"
      :type-disabled="isTypeFilterDisabled"
    />

    <!-- Stats Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatsCard
        :title="$t('stats.totalApplications')"
        :value="summary?.totalReceived ?? 0"
        icon="📥"
        color="blue"
      >
        <template #after-value>
          <div v-if="velocities?.received">
            <VelocityTracker :current="velocities.received.current" :previous="velocities.received.previous" />
          </div>
        </template>
      </StatsCard>
      <StatsCard
        :title="$t('stats.pending')"
        :value="summary?.pendingCount ?? 0"
        icon="⏳"
        color="orange"
      >
        <template #after-value>
          <div v-if="velocities?.pending">
            <VelocityTracker :current="velocities.pending.current" :previous="velocities.pending.previous" inverse />
          </div>
        </template>
      </StatsCard>
      <StatsCard
        :title="$t('stats.granted')"
        :value="summary?.totalGranted ?? 0"
        icon="✅"
        color="green"
      >
        <template #after-value>
          <div v-if="velocities?.granted">
            <VelocityTracker :current="velocities.granted.current" :previous="velocities.granted.previous" />
          </div>
        </template>
      </StatsCard>
      <StatsCard
        :title="$t('stats.denied')"
        :value="summary?.totalDenied ?? 0"
        icon="❌"
        color="red"
      >
        <template #after-value>
          <div v-if="velocities?.denied">
            <VelocityTracker :current="velocities.denied.current" :previous="velocities.denied.previous" inverse />
          </div>
        </template>
      </StatsCard>
      <StatsCard
        :title="$t('stats.approvalRate')"
        :value="`${summary?.approvalRate ?? 0}%`"
        icon="📊"
        color="purple"
      >
        <template #after-value>
          <div v-if="velocities?.approvalRate">
            <VelocityTracker :current="velocities.approvalRate.current" :previous="velocities.approvalRate.previous" calculation="difference" />
          </div>
        </template>
      </StatsCard>
    </div>

    <!-- Chart Selector Tabs -->
    <div class="flex justify-center pb-1">
      <div class="inline-flex w-full md:w-auto justify-between md:justify-start bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
        <button
          v-for="(chart, index) in chartTabs"
          :key="chart.id"
          @click="setActiveChart(index)"
          :class="[
            'flex-1 md:flex-none flex items-center justify-center gap-2 px-2 py-2 md:px-4 md:py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
            activeChart === index
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          ]"
        >
          <span class="text-lg leading-none transition-all">{{ chart.icon }}</span>
          <span class="hidden md:inline">{{ chart.label }}</span>
        </button>
      </div>
    </div>


    <!-- Active Chart -->
    <div class="card p-2">
      <component
        :is="chartTabs[activeChart]?.component"
        :data="chartData"
        :loading="loading"
        :selected-type="displayedType"
      />
    </div>

    <!-- Processing Time Forecast -->
    <ProcessingTimeForecast :bureaus="bureaus" class="!mt-1.5" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
});

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const {
  loading,
  summary,
  bureaus,
  monthlyData,
  fetchSummary,
  fetchBureaus,
  fetchMonthlyData,
  fetchBacklogTrend,
  backlogTrend,
} = useStats();

// Initialize filters from URL query params
const selectedBureau = ref((route.query.bureau as string) || 'all');
const selectedType = ref((route.query.type as string) || 'all');



// Chart tabs
const chartTabs = computed(() => [
  { id: 'intake', label: t('charts.processingStatus'), icon: '📋', component: resolveComponent('IntakeProcessingChart') },
  { id: 'approval', label: t('charts.approvalRates'), icon: '📊', component: resolveComponent('ApprovalRateChart') },
  { id: 'backlog', label: t('charts.backlogTrend'), icon: '📈', component: resolveComponent('BacklogChart') },
  { id: 'yoy', label: t('charts.yearOverYear'), icon: '🗓️', component: resolveComponent('YoYChart') },
  { id: 'distribution', label: t('charts.bureauDistribution'), icon: '🏢', component: resolveComponent('BureauDistributionChart') },
]);

// Initialize active chart from URL
const getChartIndexFromUrl = () => {
  const chartId = route.query.chart as string;
  const index = chartTabs.value.findIndex(c => c.id === chartId);
  return index >= 0 ? index : 0;
};
const activeChart = ref(getChartIndexFromUrl());

const isBureauFilterDisabled = computed(() => {
  return chartTabs.value[activeChart.value]?.id === 'distribution';
});

const isTypeFilterDisabled = computed(() => {
  return false;
});

const displayedBureau = computed(() => {
  return isBureauFilterDisabled.value ? 'all' : selectedBureau.value;
});

const displayedType = computed(() => {
  return isTypeFilterDisabled.value ? 'all' : selectedType.value;
});

const chartData = computed(() => {
  if (chartTabs.value[activeChart.value]?.id === 'backlog') {
    return backlogTrend.value;
  }
  return monthlyData.value;
});

const updateUrl = () => {
  router.replace({
    query: {
      ...(selectedBureau.value !== 'all' && { bureau: selectedBureau.value }),
      ...(selectedType.value !== 'all' && { type: selectedType.value }),
      ...(activeChart.value !== 0 && { chart: chartTabs.value[activeChart.value]?.id }),
    }
  });
};

const setActiveChart = (index: number) => {
  activeChart.value = index;
  updateUrl();
  handleFilterUpdate(); // Ensure data for new chart is fetched
};

// Fetch data on filter update
const handleFilterUpdate = async () => {
  const filter = {
    bureau: displayedBureau.value,
    type: displayedType.value,
  };
  
  const promises: Promise<void>[] = [
    fetchSummary(filter),
    fetchMonthlyData(filter),
  ];

  if (chartTabs.value[activeChart.value]?.id === 'backlog') {
    promises.push(fetchBacklogTrend(filter));
  }

  await Promise.all(promises);
};

// Watch for filter changes and auto-update
watch([displayedBureau, selectedType], () => {
  handleFilterUpdate();
});

// Initial data fetch
onMounted(async () => {
  await fetchBureaus();
  // Set default bureau to first one if not specified in URL
  if (!route.query.bureau && bureaus.value.length > 0) {
    selectedBureau.value = bureaus.value[0]?.value ?? 'all';
  }
  await handleFilterUpdate();
});

// Compute monthly velocities (latest month vs previous month)
const velocities = computed(() => {
  if (monthlyData.value.length < 2) return null;
  const latest = monthlyData.value[monthlyData.value.length - 1];
  const previous = monthlyData.value[monthlyData.value.length - 2];
  
  if (!latest || !previous) return null;

  const calculateRate = (granted: number, denied: number) => {
    const total = granted + denied;
    return total > 0 ? (granted / total) * 100 : 0;
  };

  return {
    received: { current: latest.totalReceived, previous: previous.totalReceived },
    processed: { current: latest.processed, previous: previous.processed },
    granted: { current: latest.granted, previous: previous.granted },
    pending: { current: latest.pending, previous: previous.pending },
    denied: { current: latest.denied, previous: previous.denied },
    approvalRate: {
      current: calculateRate(latest.granted, latest.denied),
      previous: calculateRate(previous.granted, previous.denied)
    }
  };
});
</script>
