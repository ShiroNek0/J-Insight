import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AGGREGATE_MAPPING, BUREAU_OPTIONS } from '../../constants';
import type {
  ImmigrationData,
  RawData,
  RawDataEntry,
  StatsFilter,
  StatsSummary,
} from '../../types';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);
  private cachedData: ImmigrationData[] | null = null;
  private cacheTimestamp: number = 0;

  /**
   * Cache duration in milliseconds (1 hour).
   * Cache will be invalidated after this period.
   */
  private readonly CACHE_DURATION_MS = 60 * 60 * 1000;

  /**
   * Get the path to the data file.
   * Uses __dirname for reliable path resolution regardless of working directory.
   */
  private getDataPath(): string {
    // Try environment variable first, fallback to relative path from this file
    return (
      process.env.DATA_PATH ||
      path.join(__dirname, '../../../../data', 'getStatsData.json')
    );
  }

  /**
   * Check if cache is valid (exists and not expired)
   */
  private isCacheValid(): boolean {
    if (!this.cachedData) return false;
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION_MS;
  }

  /**
   * Invalidate the cache manually.
   * Can be called from a controller endpoint or scheduled task.
   */
  invalidateCache(): void {
    this.cachedData = null;
    this.cacheTimestamp = 0;
    this.logger.log('Data cache invalidated');
  }

  /**
   * Load raw data from JSON file with proper error handling
   */
  private loadRawData(): RawData {
    const dataPath = this.getDataPath();

    try {
      if (!fs.existsSync(dataPath)) {
        this.logger.error(`Data file not found: ${dataPath}`);
        throw new HttpException(
          'Data source unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const rawContent = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(rawContent) as RawData;
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(`Failed to load data from ${dataPath}:`, error);
      throw new HttpException(
        'Failed to load statistics data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Transform e-Stat raw data to app format
   */
  private transformData(rawData: RawData): ImmigrationData[] {
    const dataInf = rawData?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE;
    if (!dataInf) return [];

    const values: RawDataEntry[] = Array.isArray(dataInf) ? dataInf : [dataInf];

    // First pass: collect raw values for deaggregation
    const valueMap = new Map<string, number>();

    values.forEach((entry) => {
      const key = `${entry['@time']}_${entry['@cat01']}_${entry['@cat02']}_${entry['@cat03']}`;
      valueMap.set(key, parseInt(entry['$']) || 0);
    });

    // Second pass: apply deaggregation corrections
    return values.map((entry) => {
      const month =
        entry['@time'].substring(0, 4) + '-' + entry['@time'].substring(8, 10);
      const bureau = entry['@cat03'];
      const originalValue = parseInt(entry['$']) || 0;

      // If this bureau has children, subtract their values
      let correctedValue = originalValue;
      const children = AGGREGATE_MAPPING[bureau];

      if (children) {
        children.forEach((childBureau) => {
          const childKey = `${entry['@time']}_${entry['@cat01']}_${entry['@cat02']}_${childBureau}`;
          const childValue = valueMap.get(childKey) || 0;
          correctedValue -= childValue;
        });
      }

      return {
        month,
        bureau,
        type: entry['@cat02'],
        value: Math.max(0, correctedValue), // Ensure non-negative
        status: entry['@cat01'],
      };
    });
  }

  /**
   * Get all statistics with optional filters.
   * Data is cached for CACHE_DURATION_MS and auto-refreshed after expiration.
   */
  getAllStats(filter?: StatsFilter): ImmigrationData[] {
    if (!this.isCacheValid()) {
      this.logger.log('Loading/refreshing data cache');
      const rawData = this.loadRawData();
      this.cachedData = this.transformData(rawData);
      this.cacheTimestamp = Date.now();
    }

    let data: ImmigrationData[] = this.cachedData!;

    if (filter) {
      data = data.filter((item) => {
        if (
          filter.bureau &&
          filter.bureau !== 'all' &&
          item.bureau !== filter.bureau
        ) {
          return false;
        }
        if (filter.type && filter.type !== 'all' && item.type !== filter.type) {
          return false;
        }
        if (filter.status && item.status !== filter.status) {
          return false;
        }
        if (filter.startMonth && item.month < filter.startMonth) {
          return false;
        }
        if (filter.endMonth && item.month > filter.endMonth) {
          return false;
        }
        return true;
      });

      // Apply month range filter
      if (filter.monthRange) {
        const months = [...new Set(data.map((d) => d.month))].sort().reverse();
        const selectedMonths = months.slice(0, filter.monthRange);
        data = data.filter((d) => selectedMonths.includes(d.month));
      }
    }

    return data;
  }

  /**
   * Get summary statistics
   */
  getSummary(filter?: StatsFilter): StatsSummary {
    const data = this.getAllStats(filter).filter((d) => d.bureau !== '100000');

    // Get the latest month
    const months = [...new Set(data.map((d) => d.month))].sort();
    const latestMonth = months[months.length - 1] || '';

    // Calculate totals for the latest month
    const latestData = data.filter((d) => d.month === latestMonth);

    const totalProcessed = latestData
      .filter((d) => d.status === '300000') // Total processed
      .reduce((sum, d) => sum + d.value, 0);

    const totalGranted = latestData
      .filter((d) => d.status === '301000') // Granted
      .reduce((sum, d) => sum + d.value, 0);

    const totalDenied = latestData
      .filter((d) => d.status === '302000') // Denied
      .reduce((sum, d) => sum + d.value, 0);

    const carryoverCount = latestData
      .filter((d) => d.status === '102000') // Carryover
      .reduce((sum, d) => sum + d.value, 0);

    const newReceived = latestData
      .filter((d) => d.status === '103000') // New
      .reduce((sum, d) => sum + d.value, 0);

    // Active Pending = Carryover + New - (Granted + Denied)
    // Note: We deliberately exclude "Other/Withdrawn" from the subtraction
    const pendingCount =
      carryoverCount + newReceived - (totalGranted + totalDenied);
    // Total Workload = Active Pending + (Granted + Denied)
    // This ensures Total = P + G + D exactly.
    const totalReceived = pendingCount + totalGranted + totalDenied;

    const approvalRate =
      totalProcessed > 0 ? (totalGranted / totalProcessed) * 100 : 0;

    return {
      totalReceived,
      totalProcessed,
      totalGranted,
      totalDenied,
      approvalRate: Math.round(approvalRate * 100) / 100,
      pendingCount,
      latestMonth,
    };
  }

  /**
   * Get available months
   */
  getAvailableMonths(): string[] {
    const data = this.getAllStats();
    return [...new Set(data.map((d) => d.month))].sort();
  }

  /**
   * Get monthly aggregated data for charts
   */
  getMonthlyData(filter?: StatsFilter): {
    month: string;
    received: number;
    totalReceived: number;
    processed: number;
    granted: number;
    denied: number;
    pending: number;
  }[] {
    const data = this.getAllStats(filter).filter((d) => d.bureau !== '100000');
    const months = [...new Set(data.map((d) => d.month))].sort();

    return months.map((month) => {
      const monthData = data.filter((d) => d.month === month);

      const carryover = monthData
        .filter((d) => d.status === '102000')
        .reduce((sum, d) => sum + d.value, 0);

      const received = monthData
        .filter((d) => d.status === '103000')
        .reduce((sum, d) => sum + d.value, 0);

      const granted = monthData
        .filter((d) => d.status === '301000')
        .reduce((sum, d) => sum + d.value, 0);

      const denied = monthData
        .filter((d) => d.status === '302000')
        .reduce((sum, d) => sum + d.value, 0);

      const totalProcessed = monthData
        .filter((d) => d.status === '300000')
        .reduce((sum, d) => sum + d.value, 0);

      // totalReceived = carryover + newReceived (same formula as getSummary)
      const totalReceived = carryover + received;

      return {
        month,
        received,
        totalReceived,
        processed: totalProcessed,
        granted,
        denied,
        pending: carryover,
      };
    });
  }
  /**
   * Get bureau distribution based on filtered data (aggregated)
   */
  getBureauDistribution(filter?: StatsFilter) {
    const data = this.getAllStats(filter);

    if (!data.length) return [];

    // Group by bureau and aggregate values
    const bureauMap = new Map<string, number>();

    data.forEach((item) => {
      // Exclude "100000" which is likely "All Bureaus" or similar aggregate code
      if (item.bureau === '100000') return;

      // We use status 102000 (Carryover) + 103000 (Newly Received) = Total Workload
      // This matches the stat card's "Total Applications" definition and avoids double-counting
      if (['102000', '103000'].includes(item.status)) {
        const current = bureauMap.get(item.bureau) || 0;
        bureauMap.set(item.bureau, current + item.value);
      }
    });

    // Convert to array and handle airport roll-up or specific labels if needed
    // The main bureau codes are known (Tokyo 101170, etc.)
    const result = Array.from(bureauMap.entries())
      .map(([bureau, value]) => ({
        bureau,
        value,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return result;
  }

  /**
   * Get backlog trend data (pending applications by type)
   */
  getBacklogTrend(
    filter?: StatsFilter,
  ): { month: string; [key: string]: number | string }[] {
    // We ignore value of 'type' in filter because we want breakdown of all types
    const data = this.getAllStats({ ...filter, type: 'all' }).filter(
      (d) => d.bureau !== '100000',
    );
    const months = [...new Set(data.map((d) => d.month))].sort();

    return months.map((month) => {
      const monthData = data.filter((d) => d.month === month);

      // Calculate pending (status 102000) for each type
      const entry: { month: string; [key: string]: number | string } = {
        month,
      };

      // Standard types: 10, 20, 30, 40, 50, 60
      ['10', '20', '30', '40', '50', '60'].forEach((type) => {
        entry[type] = monthData
          .filter((d) => d.type === type && d.status === '102000')
          .reduce((sum, d) => sum + d.value, 0);
      });

      return entry;
    });
  }

  /**
   * Get bureau approval rates for a specified period.
   * Bureaus with fewer than threshold processed applications are excluded.
   * @param type - Optional application type filter
   * @param monthRange - Number of months to include (0 or undefined = all time, 1 = latest month)
   */
  getBureauApprovalRates(
    type?: string,
    monthRange?: number,
  ): {
    data: Array<{
      bureau: string;
      bureauCode: string;
      approvalRate: number;
      processed: number;
    }>;
    periodStart: string;
    periodEnd: string;
    threshold: number;
    excludedBureaus: string[];
  } {
    const THRESHOLD = 50;

    // Get all data
    const allData = this.getAllStats();
    const months = [...new Set(allData.map((d) => d.month))].sort();

    // Determine which months to include based on monthRange
    let selectedMonths: string[];
    if (monthRange === undefined || monthRange === 0) {
      // All time
      selectedMonths = months;
    } else {
      // Last N months
      selectedMonths = months.slice(-monthRange);
    }

    const periodStart = selectedMonths[0] || '';
    const periodEnd = selectedMonths[selectedMonths.length - 1] || '';

    // Filter data to selected months and optionally by type
    let data = allData.filter((d) => selectedMonths.includes(d.month));
    if (type && type !== 'all') {
      data = data.filter((d) => d.type === type);
    }

    // Get bureau labels from constants
    const bureauLabels: Record<string, string> = {};
    BUREAU_OPTIONS.forEach((b) => {
      bureauLabels[b.value] = b.label;
    });

    // Aggregate granted (301000) and totalProcessed (300000) by bureau
    const bureauStats = new Map<
      string,
      { granted: number; totalProcessed: number }
    >();

    data.forEach((item) => {
      if (!bureauStats.has(item.bureau)) {
        bureauStats.set(item.bureau, { granted: 0, totalProcessed: 0 });
      }
      const stats = bureauStats.get(item.bureau)!;
      if (item.status === '301000') {
        stats.granted += item.value;
      } else if (item.status === '300000') {
        stats.totalProcessed += item.value;
      }
    });

    // Calculate approval rates and filter
    const results: Array<{
      bureau: string;
      bureauCode: string;
      approvalRate: number;
      processed: number;
    }> = [];
    const excludedBureaus: string[] = [];

    bureauStats.forEach((stats, bureauCode) => {
      const processed = stats.totalProcessed;
      const bureauLabel = bureauLabels[bureauCode] || bureauCode;

      // Always include Nationwide (100000), otherwise apply threshold
      if (bureauCode === '100000') {
        const approvalRate =
          processed > 0 ? (stats.granted / processed) * 100 : 0;
        results.push({
          bureau: 'Nationwide',
          bureauCode,
          approvalRate: Math.round(approvalRate * 100) / 100,
          processed,
        });
      } else if (processed >= THRESHOLD) {
        const approvalRate =
          processed > 0 ? (stats.granted / processed) * 100 : 0;
        results.push({
          bureau: bureauLabel,
          bureauCode,
          approvalRate: Math.round(approvalRate * 100) / 100,
          processed,
        });
      } else if (processed > 0) {
        excludedBureaus.push(bureauLabel);
      }
    });

    // Sort by approval rate descending
    results.sort((a, b) => b.approvalRate - a.approvalRate);

    return {
      data: results,
      periodStart,
      periodEnd,
      threshold: THRESHOLD,
      excludedBureaus,
    };
  }
}
