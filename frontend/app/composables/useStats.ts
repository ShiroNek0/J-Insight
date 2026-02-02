export interface ImmigrationData {
  month: string;
  bureau: string;
  type: string;
  value: number;
  status: string;
}

export interface StatsSummary {
  totalReceived: number;
  totalProcessed: number;
  totalGranted: number;
  totalDenied: number;
  approvalRate: number;
  pendingCount: number;
  latestMonth: string;
}

export interface BureauOption {
  value: string;
  label: string;
  short: string;
  coordinates?: [number, number];
  border?: string;
  background?: string;
}

export interface StatsFilter {
  bureau: string;
  type: string;
  monthRange: number;
}

export const useStats = () => {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase as string;

  const loading = ref(false);
  const error = ref<string | null>(null);
  const stats = ref<ImmigrationData[]>([]);
  const summary = ref<StatsSummary | null>(null);
  const bureaus = ref<BureauOption[]>([]);
  const monthlyData = ref<{ month: string; received: number; totalReceived: number; processed: number; pending: number; granted: number; denied: number }[]>([]);
  const bureauDistribution = ref<BureauDistribution[]>([]);

  const fetchStats = async (filter?: Partial<StatsFilter>) => {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filter?.bureau && filter.bureau !== 'all') params.append('bureau', filter.bureau);
      if (filter?.type && filter.type !== 'all') params.append('type', filter.type);
      if (filter?.monthRange) params.append('monthRange', filter.monthRange.toString());

      const response = await $fetch<ImmigrationData[]>(`${apiBase}/stats?${params}`);
      stats.value = response;
    } catch (err) {
      error.value = 'Failed to fetch statistics';
      console.error(err);
    } finally {
      loading.value = false;
    }
  };

  const fetchSummary = async (filter?: Partial<StatsFilter>) => {
    try {
      const params = new URLSearchParams();
      if (filter?.bureau && filter.bureau !== 'all') params.append('bureau', filter.bureau);
      if (filter?.type && filter.type !== 'all') params.append('type', filter.type);
      if (filter?.monthRange) params.append('monthRange', filter.monthRange.toString());

      const response = await $fetch<StatsSummary>(`${apiBase}/stats/summary?${params}`);
      summary.value = response;
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  const fetchBureaus = async () => {
    try {
      const response = await $fetch<BureauOption[]>(`${apiBase}/stats/bureaus`);
      bureaus.value = response;
    } catch (err) {
      console.error('Failed to fetch bureaus:', err);
    }
  };

  const fetchMonthlyData = async (filter?: Partial<StatsFilter>) => {
    try {
      const params = new URLSearchParams();
      if (filter?.bureau && filter.bureau !== 'all') params.append('bureau', filter.bureau);
      if (filter?.type && filter.type !== 'all') params.append('type', filter.type);
      if (filter?.monthRange) params.append('monthRange', filter.monthRange.toString());

      const response = await $fetch<{ month: string; received: number; totalReceived: number; processed: number; pending: number; granted: number; denied: number }[]>(
        `${apiBase}/stats/monthly?${params}`
      );
      monthlyData.value = response;
    } catch (err) {
      console.error('Failed to fetch monthly data:', err);
    }
  };

  const fetchApplicationTypes = async () => {
    try {
      const response = await $fetch<{ value: string; label: string; short: string }[]>(`${apiBase}/stats/applications`);
      return response;
    } catch (err) {
      console.error('Failed to fetch application types:', err);
      return [];
    }
  };

  const fetchBureauDistribution = async (filter?: Partial<StatsFilter>) => {
    try {
      const params = new URLSearchParams();
      if (filter?.bureau && filter.bureau !== 'all') params.append('bureau', filter.bureau);
      if (filter?.type && filter.type !== 'all') params.append('type', filter.type);
      if (filter?.monthRange) params.append('monthRange', filter.monthRange.toString());

      const response = await $fetch<BureauDistribution[]>(`${apiBase}/stats/distribution?${params}`);
      bureauDistribution.value = response;
    } catch (err) {
      console.error('Failed to fetch bureau distribution:', err);
    }
  };

  const backlogTrend = ref<BacklogTrendEntry[]>([]);

  const fetchBacklogTrend = async (filter?: Partial<StatsFilter>) => {
    try {
      const params = new URLSearchParams();
      if (filter?.bureau && filter.bureau !== 'all') params.append('bureau', filter.bureau);
      // type ignored
      if (filter?.monthRange) params.append('monthRange', filter.monthRange.toString());

      const response = await $fetch<BacklogTrendEntry[]>(`${apiBase}/stats/backlog?${params}`);
      backlogTrend.value = response;
    } catch (err) {
      console.error('Failed to fetch backlog trend:', err);
    }
  };

  const bureauApprovalRates = ref<BureauApprovalRatesResponse | null>(null);

  const fetchBureauApprovalRates = async (type?: string, monthRange?: number) => {
    try {
      const params = new URLSearchParams();
      if (type && type !== 'all') params.append('type', type);
      if (monthRange !== undefined) params.append('monthRange', monthRange.toString());

      const response = await $fetch<BureauApprovalRatesResponse>(`${apiBase}/stats/bureau-approval-rates?${params}`);
      bureauApprovalRates.value = response;
    } catch (err) {
      console.error('Failed to fetch bureau approval rates:', err);
    }
  };

  return {
    loading,
    error,
    stats,
    summary,
    bureaus,
    monthlyData,
    fetchStats,
    fetchSummary,
    fetchBureaus,
    fetchMonthlyData,
    fetchApplicationTypes,
    fetchBureauDistribution,
    bureauDistribution,
    fetchBacklogTrend,
    backlogTrend,
    fetchBureauApprovalRates,
    bureauApprovalRates,
  };
};

export interface BureauDistribution {
  bureau: string;
  value: number;
}

export interface BacklogTrendEntry {
  month: string;
  [key: string]: string | number;
}

export interface BureauApprovalRateEntry {
  bureau: string;
  bureauCode: string;
  approvalRate: number;
  processed: number;
}

export interface BureauApprovalRatesResponse {
  data: BureauApprovalRateEntry[];
  periodStart: string;
  periodEnd: string;
  threshold: number;
  excludedBureaus: string[];
}
