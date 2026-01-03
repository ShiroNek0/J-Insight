import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AGGREGATE_MAPPING } from '../../constants';
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
  getMonthlyData(
    filter?: StatsFilter,
  ): { month: string; received: number; processed: number; pending: number }[] {
    const data = this.getAllStats(filter).filter((d) => d.bureau !== '100000');
    const months = [...new Set(data.map((d) => d.month))].sort();

    return months.map((month) => {
      const monthData = data.filter((d) => d.month === month);

      return {
        month,
        received: monthData
          .filter((d) => d.status === '103000')
          .reduce((sum, d) => sum + d.value, 0),
        processed: monthData
          .filter((d) => ['301000', '302000'].includes(d.status)) // Sum of Granted + Denied
          .reduce((sum, d) => sum + d.value, 0),
        granted: monthData
          .filter((d) => d.status === '301000')
          .reduce((sum, d) => sum + d.value, 0),
        denied: monthData
          .filter((d) => d.status === '302000')
          .reduce((sum, d) => sum + d.value, 0),
        pending: monthData
          .filter((d) => d.status === '102000')
          .reduce((sum, d) => sum + d.value, 0),
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
}
