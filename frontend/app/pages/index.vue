<template>
  <div class="space-y-3 pt-6">
    <!-- Filter Panel - key forces re-render when view changes to ensure correct type display -->
    <FilterPanel
      :key="`filter-${activeViewId}-${typeSelectKey}`"
      :bureau="displayedBureau"
      @update:bureau="selectedBureau = $event"
      :type="displayedType"
      @update:type="selectedType = $event"
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

    <!-- Main Group Tabs -->
    <div class="flex justify-center pb-1">
      <div class="inline-flex w-full md:w-auto justify-between md:justify-start bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
        <button
          v-for="group in chartGroups"
          :key="group.id"
          @click="setActiveGroup(group.id)"
          :class="[
            'flex-1 md:flex-none flex items-center justify-center gap-2 px-2 py-2 md:px-4 md:py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
            activeGroupId === group.id
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          ]"
        >
          <span class="text-lg leading-none transition-all">{{ group.icon }}</span>
          <span class="hidden md:inline">{{ group.label }}</span>
        </button>
      </div>
    </div>

    <!-- Active Chart -->
    <div class="card p-2">
      <!-- Chart Title with Dropdown Selector -->
      <div class="flex items-center gap-2 px-2 mb-2">
        <template v-if="activeGroup.items.length > 1">
          <div class="relative" ref="chartDropdownRef">
            <button
              @click.stop="toggleChartDropdown"
              class="group flex items-center gap-2 text-xl font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1 -mx-2 rounded-lg transition-colors"
            >
              <span>{{ activeItem?.label }}</span>
              <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
                <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': chartDropdownOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
            <div
              v-if="chartDropdownOpen"
              class="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 min-w-[200px] py-1"
            >
              <button
                v-for="item in activeGroup.items"
                :key="item.id"
                @click="selectChartFromDropdown(item.id)"
                :class="[
                  'w-full px-4 py-2 text-left text-sm transition-colors',
                  activeViewId === item.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                ]"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <h2 class="text-xl font-bold text-slate-600 dark:text-slate-400 py-1">
            {{ activeItem?.label }}
          </h2>
        </template>
      </div>
      <component
        :is="activeItem?.component"
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

// Static chart metadata for SSR-safe lookup (must be defined before getInitialType)
const CHART_METADATA: Record<string, { disablesBureau?: boolean; disablesType?: boolean; defaultType?: string }> = {
  'byBureau': { disablesBureau: true, disablesType: true, defaultType: '60' },
  'bureau': { disablesBureau: true }
};

// Initialize filters from URL query params
const selectedBureau = ref((route.query.bureau as string) || 'all');
const selectedType = ref((route.query.type as string) || 'all');

// Chart group types
interface ChartItem {
  id: string;
  label: string;
  icon: string;
  component: ReturnType<typeof resolveComponent>;
  disablesBureau?: boolean;
  disablesType?: boolean;
  defaultType?: string;
}

interface ChartGroup {
  id: string;
  label: string;
  icon: string;
  items: ChartItem[];
}

// Chart groups with sub-items
const chartGroups = computed<ChartGroup[]>(() => [
  {
    id: 'processing',
    label: t('chartGroups.processing'),
    icon: '📋',
    items: [
      { id: 'intake', label: t('charts.processingStatus'), icon: '📋', component: resolveComponent('IntakeProcessingChart') }
    ]
  },
  {
    id: 'approval',
    label: t('chartGroups.approval'),
    icon: '📊',
    items: [
      { id: 'overTime', label: t('charts.approvalRates'), icon: '📊', component: resolveComponent('ApprovalRateChart') },
      { id: 'byBureau', label: t('charts.bureauApprovalRate.title'), icon: '🏛️', component: resolveComponent('BureauApprovalRateChart'), disablesBureau: true, disablesType: true, defaultType: '60' }
    ]
  },
  {
    id: 'trends',
    label: t('chartGroups.trends'),
    icon: '📈',
    items: [
      { id: 'backlog', label: t('charts.backlogTrend'), icon: '📈', component: resolveComponent('BacklogChart') },
      { id: 'yoy', label: t('charts.yearOverYear'), icon: '🗓️', component: resolveComponent('YoYChart') }
    ]
  },
  {
    id: 'distribution',
    label: t('chartGroups.distribution'),
    icon: '🏢',
    items: [
      { id: 'bureau', label: t('charts.bureauDistribution'), icon: '🏢', component: resolveComponent('BureauDistributionChart'), disablesBureau: true }
    ]
  }
]);

// Legacy URL backward compatibility map
const LEGACY_CHART_MAP: Record<string, { group: string; view: string }> = {
  'intake': { group: 'processing', view: 'intake' },
  'approval': { group: 'approval', view: 'overTime' },
  'backlog': { group: 'trends', view: 'backlog' },
  'yoy': { group: 'trends', view: 'yoy' },
  'distribution': { group: 'distribution', view: 'bureau' },
  'bureauApprovalRate': { group: 'approval', view: 'byBureau' },
};

// Initialize active group/view from URL
const getSelectionFromUrl = () => {
  const chartParam = route.query.chart as string;
  const viewParam = route.query.view as string;

  // Check for legacy URL format (single chart param)
  if (chartParam && !viewParam && LEGACY_CHART_MAP[chartParam]) {
    return LEGACY_CHART_MAP[chartParam];
  }

  // New URL format: chart=groupId&view=viewId
  if (chartParam) {
    const group = chartGroups.value.find(g => g.id === chartParam);
    if (group) {
      const view = viewParam ? group.items.find(i => i.id === viewParam) : group.items[0];
      return { group: group.id, view: view?.id || group.items[0].id };
    }
  }

  // Default to first group and first item
  return { group: 'processing', view: 'intake' };
};

const initialSelection = getSelectionFromUrl();
const activeGroupId = ref(initialSelection.group);
const activeViewId = ref(initialSelection.view);

// Chart dropdown state
const chartDropdownOpen = ref(false);
const chartDropdownRef = ref<HTMLElement | null>(null);

const toggleChartDropdown = () => {
  chartDropdownOpen.value = !chartDropdownOpen.value;
};

const selectChartFromDropdown = (viewId: string) => {
  setActiveView(viewId);
  chartDropdownOpen.value = false;
};

const handleOutsideClick = (e: MouseEvent) => {
  if (chartDropdownOpen.value && chartDropdownRef.value && !chartDropdownRef.value.contains(e.target as Node)) {
    chartDropdownOpen.value = false;
  }
};

// Derived computed values
const activeGroup = computed(() =>
  chartGroups.value.find(g => g.id === activeGroupId.value) || chartGroups.value[0]
);

const activeItem = computed(() =>
  activeGroup.value?.items.find(i => i.id === activeViewId.value) || activeGroup.value?.items[0]
);

// Filter logic uses item metadata with static fallback for SSR
const chartMetadata = computed(() => CHART_METADATA[activeViewId.value] || {});
const isBureauFilterDisabled = computed(() => activeItem.value?.disablesBureau ?? chartMetadata.value.disablesBureau ?? false);
const isTypeFilterDisabled = computed(() => activeItem.value?.disablesType ?? chartMetadata.value.disablesType ?? false);

const displayedBureau = computed(() => {
  return isBureauFilterDisabled.value ? 'all' : selectedBureau.value;
});

const displayedType = computed(() => {
  const defaultType = activeItem.value?.defaultType ?? chartMetadata.value.defaultType;
  if (defaultType) {
    return defaultType;
  }
  return isTypeFilterDisabled.value ? 'all' : selectedType.value;
});

const chartData = computed(() => {
  if (activeItem.value?.id === 'backlog') {
    return backlogTrend.value;
  }
  return monthlyData.value;
});

const updateUrl = () => {
  const isDefaultView = activeGroupId.value === 'processing' && activeViewId.value === 'intake';
  const needsViewParam = activeGroup.value.items.length > 1;

  router.replace({
    query: {
      ...(selectedBureau.value !== 'all' && { bureau: selectedBureau.value }),
      ...(selectedType.value !== 'all' && { type: selectedType.value }),
      ...(!isDefaultView && { chart: activeGroupId.value }),
      ...(!isDefaultView && needsViewParam && { view: activeViewId.value }),
    }
  });
};

const setActiveGroup = (groupId: string) => {
  activeGroupId.value = groupId;
  // Set to first item in the group
  const group = chartGroups.value.find(g => g.id === groupId);
  if (group && group.items.length > 0) {
    activeViewId.value = group.items[0].id;
  }
  updateUrl();
  handleFilterUpdate();
};

const setActiveView = (viewId: string) => {
  activeViewId.value = viewId;
  updateUrl();
  handleFilterUpdate();
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

  if (activeItem.value?.id === 'backlog') {
    promises.push(fetchBacklogTrend(filter));
  }

  await Promise.all(promises);
};

// Watch for filter changes and auto-update
watch([displayedBureau, selectedType], () => {
  updateUrl();
  handleFilterUpdate();
});

// Force trigger reactivity on hydration to fix SSR mismatch for type selector
const typeSelectKey = ref(0);

// Initial data fetch
onMounted(async () => {
  // Force FilterPanel re-render after hydration to fix SSR mismatch
  await nextTick();
  typeSelectKey.value++;
  await fetchBureaus();
  // Set default bureau to first one if not specified in URL
  if (!route.query.bureau && bureaus.value.length > 0) {
    selectedBureau.value = bureaus.value[0]?.value ?? 'all';
  }
  await handleFilterUpdate();

  // Add listener for closing dropdown on outside click
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
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
