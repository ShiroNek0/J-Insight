// Types for immigration data

export interface ImmigrationData {
  month: string; // Format: YYYY-MM
  bureau: string; // Bureau code (e.g., '101170')
  type: string; // Application type code (e.g., '20')
  value: number; // Statistical value
  status: string; // Status code (e.g., '300000')
}

export interface RawDataEntry {
  '@tab': string;
  '@time': string;
  '@cat01': string; // Status code
  '@cat02': string; // Application type
  '@cat03': string; // Bureau code
  '@unit': string;
  $: string; // Value
}

export interface RawData {
  GET_STATS_DATA: {
    STATISTICAL_DATA: {
      DATA_INF: {
        VALUE: RawDataEntry[] | RawDataEntry;
      };
    };
  };
}

export interface StatsFilter {
  bureau?: string;
  type?: string;
  status?: string;
  startMonth?: string;
  endMonth?: string;
  monthRange?: number; // Number of months to look back
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

export interface EstimationRequest {
  applicationDate: string; // YYYY-MM-DD
  bureau: string;
  applicationType: string;
}

export interface EstimationResult {
  estimatedDate: string;
  optimisticDate: string; // -1σ (faster processing)
  pessimisticDate: string; // +1σ (slower processing)
  queuePosition: number;
  dailyProcessingRate: number;
  confidenceLevel: number; // 0-100%
  bureauEfficiency: number; // Relative to average (1.0 = average)
  daysRemaining: number;
  isAlreadyProcessed: boolean; // True if the application would have already been processed
}
