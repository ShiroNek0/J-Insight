<template>
  <div class="card px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-3 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
        {{ $t('forecast.title') }}
      </h3>
      <button
        @click="showDetails = !showDetails"
        class="text-sm text-indigo-500 hover:text-indigo-600"
      >
        {{ showDetails ? $t('common.hideDetails') : $t('common.showDetails') }}
      </button>
    </div>

    <!-- Input Form -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {{ $t('forecast.applicationDate') }}
        </label>
        <input
          v-model="applicationDate"
          type="date"
          class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <BaseSelect
          v-model="selectedBureau"
          :options="availableBureaus"
          :label="$t('filters.bureau')"
        />
      </div>

      <div>
        <BaseSelect
          v-model="selectedType"
          :options="formattedApplicationTypes"
          :label="$t('filters.applicationType')"
        />
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="loading" class="flex items-center justify-center py-4">
      <span class="animate-spin text-2xl">⟳</span>
      <span class="ml-2 text-slate-500">{{ $t('common.calculating') }}</span>
    </div>

    <!-- Result Display -->
    <div v-if="result" class="mt-6 p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-800">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Main Estimate -->
        <div class="text-center">
          <p class="text-base text-slate-600 dark:text-slate-400 mb-1 font-medium">{{ $t('forecast.estimatedCompletion') }}</p>
          <p class="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {{ formatDate(result.estimatedDate) }}
          </p>
          <p class="text-base text-slate-600 dark:text-slate-400">
            <span v-if="result.isAlreadyProcessed" class="text-green-500 font-medium">
              {{ $t('forecast.likelyProcessed') }}
            </span>
            <span v-else>
              {{ $t('forecast.daysRemaining', { days: result.daysRemaining }) }}
            </span>
          </p>
        </div>

        <!-- Queue Position -->
        <div class="text-center">
          <p class="text-base text-slate-600 dark:text-slate-400 mb-1 font-medium">{{ $t('forecast.queuePosition') }}</p>
          <p class="text-3xl font-bold text-slate-700 dark:text-slate-200">
            <span v-if="result.isAlreadyProcessed" class="text-green-500">{{ $t('forecast.completed') }}</span>
            <span v-else>#{{ result.queuePosition.toLocaleString() }}</span>
          </p>
          <p class="text-base text-slate-600 dark:text-slate-400">
            {{ result.isAlreadyProcessed ? $t('forecast.processedEstimate') : $t('forecast.currentBacklog') }}
          </p>
        </div>

        <!-- Daily Rate -->
        <div class="text-center">
          <p class="text-base text-slate-600 dark:text-slate-400 mb-1 font-medium">{{ $t('forecast.dailyProcessing') }}</p>
          <p class="text-3xl font-bold text-slate-700 dark:text-slate-200">
            {{ result.dailyProcessingRate }}
          </p>
          <p class="text-base text-slate-600 dark:text-slate-400">
            {{ $t('forecast.applicationsPerDay') }}
          </p>
        </div>

        <!-- Bureau Efficiency -->
        <div class="text-center">
          <p class="text-base text-slate-600 dark:text-slate-400 mb-1 font-medium">{{ $t('forecast.bureauEfficiency') }}</p>
          <p class="text-3xl font-bold" :class="result.bureauEfficiency > 1 ? 'text-green-500' : 'text-orange-500'">
            {{ (result.bureauEfficiency * 100).toFixed(0) }}%
          </p>
          <p class="text-base text-slate-600 dark:text-slate-400">
            {{ $t('forecast.relativeToNationalAvg') }}
          </p>
        </div>
      </div>

      <!-- Details (Formula & Disclaimer) -->
      <div v-if="showDetails" class="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-800 text-sm">
        <h4 class="font-semibold mb-3 text-slate-800 dark:text-slate-200">{{ $t('forecast.calculationDetails') }}</h4>
        
        <div class="space-y-4">
          <!-- Days Remaining Formula -->
          <FormulaTooltip
            :variables="{
              'D_{rem}': $t('forecast.variables.estimatedDays'),
              'Q_{pos}': $t('forecast.variables.currentQueue'),
              'R_{daily}': $t('forecast.variables.dailyRate')
            }"
          >
            <div class="px-3 py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-center">
              <MathBlock
                :formula="`D_{rem} \\approx \\left[\\frac{Q_{pos}}{R_{daily}}\\right] = \\left[\\frac{${result.queuePosition}}{${result.dailyProcessingRate}}\\right] \\approx ${result.daysRemaining} \\text{ days}`"
              />
            </div>
          </FormulaTooltip>

          <!-- Daily Processing Rate Formula -->
          <FormulaTooltip
            :variables="{
              'R_{daily}': $t('forecast.variables.dailyRate'),
              '\\sum P': $t('forecast.variables.totalProcessed'),
              '\\sum D': $t('forecast.variables.totalDays')
            }"
          >
            <div class="px-3 py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-center">
              <MathBlock
                formula="R_{daily} \approx \text{Weighted Avg } \left( \frac{\sum P}{\sum D} \right)_{6mo}"
              />
            </div>
          </FormulaTooltip>
        </div>

        <p class="mt-4 italic text-xs text-slate-500 dark:text-slate-400">
          {{ $t('forecast.disclaimer') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BureauOption } from '~/composables/useStats';
import MathBlock from './common/MathBlock.vue';
import FormulaTooltip from './common/FormulaTooltip.vue';
import BaseSelect from './common/BaseSelect.vue';

interface Props {
  bureaus: BureauOption[];
}

const props = defineProps<Props>();
const { t, locale } = useI18n();

const config = useRuntimeConfig();
const apiBase = config.public.apiBase as string;

const applicationDate = ref('');
const selectedBureau = ref('101170'); // Default to Tokyo if available, or handled in onMounted
const selectedType = ref('20');
const loading = ref(false);
const showDetails = ref(false);
const result = ref<{
  estimatedDate: string;
  optimisticDate: string;
  pessimisticDate: string;
  queuePosition: number;
  dailyProcessingRate: number;
  confidenceLevel: number;
  bureauEfficiency: number;
  daysRemaining: number;
  isAlreadyProcessed?: boolean;
} | null>(null);

const availableBureaus = computed(() => {
  return props.bureaus.filter(b => b.value !== 'all' && !b.label.includes('Airport')).map(b => ({
    ...b,
    label: t(`bureaus.${b.value}`, b.label)
  }));
});

const calculateEstimate = async () => {
  if (!applicationDate.value) return;
  
  loading.value = true;
  try {
    const response = await $fetch(`${apiBase}/estimation`, {
      method: 'POST',
      body: {
        applicationDate: applicationDate.value,
        bureau: selectedBureau.value,
        applicationType: selectedType.value,
      },
    });
    result.value = response as typeof result.value;
  } catch (err) {
    console.error('Failed to calculate estimate:', err);
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const monthFormat = locale.value === 'vi' ? 'long' : 'short';
  return date.toLocaleDateString(locale.value, { month: monthFormat, day: 'numeric', year: 'numeric' });
};

const { fetchApplicationTypes } = useStats();
const applicationTypes = ref<{ value: string; label: string; short: string }[]>([]);

// Set default date to today and calculate
onMounted(async () => {
  // Fetch application types
  const types = await fetchApplicationTypes();
  applicationTypes.value = types.filter(t => t.value !== 'all');
  
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  applicationDate.value = `${year}-${month}-${day}`;
  
  // Set default bureau if not already set or invalid
  if (availableBureaus.value.length > 0 && (!selectedBureau.value || selectedBureau.value === 'all')) {
    const tokyo = availableBureaus.value.find(b => b.value === '101170');
    selectedBureau.value = tokyo ? tokyo.value : (availableBureaus.value[0]?.value ?? '101170');
  }

  calculateEstimate();
});

// Watch for changes and auto-calculate
watch([applicationDate, selectedBureau, selectedType], () => {
  if (applicationDate.value) {
    calculateEstimate();
  }
});

const appTypeKeys: Record<string, string> = {
  '10': 'statusAcquisition',
  '20': 'periodExtension',
  '30': 'statusChange',
  '40': 'extraStatusActivities',
  '50': 'reEntry',
  '60': 'permanentResidence'
};

const formattedApplicationTypes = computed(() => {
  return applicationTypes.value.map(typeInfo => ({
    label: t(appTypeKeys[typeInfo.value] ? `applicationTypes.${appTypeKeys[typeInfo.value]}` : typeInfo.label),
    value: typeInfo.value
  }));
});
</script>
