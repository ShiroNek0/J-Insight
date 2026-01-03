import { Controller, Get, Post, Query } from '@nestjs/common';
import { StatsService } from './stats.service';
import { BUREAU_OPTIONS } from '../../constants/bureau-options';
import { APPLICATION_OPTIONS } from '../../constants/application-options';
import type { StatsFilter } from '../../types';

/**
 * Safely parse monthRange string to number.
 * Returns undefined for invalid values (NaN, negative numbers).
 */
function parseMonthRange(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed < 0 ? undefined : parsed;
}

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /**
   * GET /api/stats
   * Get all statistics with optional filters
   */
  @Get()
  getStats(
    @Query('bureau') bureau?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('startMonth') startMonth?: string,
    @Query('endMonth') endMonth?: string,
    @Query('monthRange') monthRange?: string,
  ) {
    const filter: StatsFilter = {
      bureau,
      type,
      status,
      startMonth,
      endMonth,
      monthRange: parseMonthRange(monthRange),
    };

    return this.statsService.getAllStats(filter);
  }

  /**
   * GET /api/stats/summary
   * Get summary statistics
   */
  @Get('summary')
  getSummary(
    @Query('bureau') bureau?: string,
    @Query('type') type?: string,
    @Query('monthRange') monthRange?: string,
  ) {
    const filter: StatsFilter = {
      bureau,
      type,
      monthRange: parseMonthRange(monthRange),
    };

    return this.statsService.getSummary(filter);
  }

  /**
   * GET /api/stats/monthly
   * Get monthly aggregated data for charts
   */
  @Get('monthly')
  getMonthlyData(
    @Query('bureau') bureau?: string,
    @Query('type') type?: string,
    @Query('monthRange') monthRange?: string,
  ) {
    const filter: StatsFilter = {
      bureau,
      type,
      monthRange: parseMonthRange(monthRange),
    };

    return this.statsService.getMonthlyData(filter);
  }

  /**
   * GET /api/stats/distribution
   * Get bureau distribution for the latest month
   */
  @Get('distribution')
  getBureauDistribution(
    @Query('bureau') bureau?: string,
    @Query('type') type?: string,
    @Query('monthRange') monthRange?: string,
  ) {
    const filter: StatsFilter = {
      bureau,
      type,
      monthRange: parseMonthRange(monthRange),
    };

    return this.statsService.getBureauDistribution(filter);
  }

  /**
   * GET /api/stats/backlog
   * Get backlog trend with breakdown by application type
   */
  @Get('backlog')
  getBacklogTrend(
    @Query('bureau') bureau?: string,
    @Query('monthRange') monthRange?: string,
  ) {
    const filter: StatsFilter = {
      bureau,
      type: 'all', // force all types
      monthRange: parseMonthRange(monthRange),
    };

    return this.statsService.getBacklogTrend(filter);
  }

  /**
   * GET /api/stats/months
   * Get list of available months
   */
  @Get('months')
  getAvailableMonths() {
    return this.statsService.getAvailableMonths();
  }

  /**
   * GET /api/stats/bureaus
   * Get bureau options
   */
  @Get('bureaus')
  getBureaus() {
    return BUREAU_OPTIONS;
  }

  /**
   * GET /api/stats/applications
   * Get application type options
   */
  @Get('applications')
  getApplicationTypes() {
    return APPLICATION_OPTIONS;
  }

  /**
   * POST /api/stats/invalidate-cache
   * Invalidate the data cache to force reload on next request
   */
  @Post('invalidate-cache')
  invalidateCache() {
    this.statsService.invalidateCache();
    return { success: true, message: 'Cache invalidated' };
  }
}
