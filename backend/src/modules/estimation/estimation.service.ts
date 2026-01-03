import { Injectable } from '@nestjs/common';
import { StatsService } from '../stats/stats.service';
import type {
  EstimationRequest,
  EstimationResult,
  ImmigrationData,
} from '../../types';
import { STATUS_CODES } from '../../constants';

@Injectable()
export class EstimationService {
  /**
   * EWMA decay factor (0.85 = recent months weighted ~6x more than older ones).
   * This gives roughly a 6-month effective window where newer data dominates.
   * Higher values (closer to 1) = more weight on recent data.
   */
  private readonly DECAY_FACTOR = 0.85;

  /**
   * Average days per month for rate calculations.
   * Using 30 as a simplification; actual months vary 28-31 days.
   * This is acceptable for estimation purposes.
   */
  private readonly DAYS_PER_MONTH = 30;

  /**
   * Maximum fallback wait time (10 years in days) when processing rate is zero.
   * This prevents infinite wait times while indicating a very long wait.
   */
  private readonly MAX_FALLBACK_DAYS = 365 * 10;

  constructor(private readonly statsService: StatsService) {}

  /**
   * Calculate EWMA (Exponentially Weighted Moving Average) processing rates
   */
  private calculateEWMARate(
    data: ImmigrationData[],
    months: string[],
  ): { rate: number; stdDev: number } {
    if (months.length === 0) return { rate: 0, stdDev: 0 };

    // Calculate weights (more recent months have higher weight)
    const weights = months.map((_, i) =>
      Math.pow(this.DECAY_FACTOR, months.length - 1 - i),
    );
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    // Calculate daily processing rates for each month
    // Use GRANTED + DENIED to match stats.service.ts calculation
    const dailyRates = months.map((month) => {
      const monthData = data.filter(
        (d) =>
          d.month === month &&
          (d.status === STATUS_CODES.GRANTED ||
            d.status === STATUS_CODES.DENIED),
      );
      const processed = monthData.reduce((sum, d) => sum + d.value, 0);
      return processed / this.DAYS_PER_MONTH;
    });

    // Calculate weighted average
    const weightedSum = dailyRates.reduce(
      (sum, rate, i) => sum + rate * weights[i],
      0,
    );
    const avgRate = weightedSum / totalWeight;

    // Calculate standard deviation
    const variance =
      dailyRates.reduce((sum, rate, i) => {
        const diff = rate - avgRate;
        return sum + diff * diff * weights[i];
      }, 0) / totalWeight;
    const stdDev = Math.sqrt(variance);

    return { rate: avgRate, stdDev };
  }

  /**
   * Get the number of days in a month
   */
  private getDaysInMonth(monthStr: string): number {
    const [year, month] = monthStr.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  }

  /**
   * Format a date as YYYY-MM
   */
  private formatMonth(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  /**
   * Get days between two dates
   */
  private getDaysBetween(start: Date, end: Date): number {
    const utcStart = Date.UTC(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    );
    const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.ceil((utcEnd - utcStart) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get value for a specific month and status
   */
  private getMonthValue(
    data: ImmigrationData[],
    month: string,
    status: string,
  ): number {
    return (
      data.find((d) => d.month === month && d.status === status)?.value || 0
    );
  }

  /**
   * Estimate queue position based on application date
   */
  private estimateQueuePosition(
    data: ImmigrationData[],
    applicationDate: string,
    dailyNew: number,
    dailyProcessed: number,
  ): number {
    // Get months from the filtered data (not global months)
    // This matches the reference project's approach
    const months = [...new Set(data.map((d) => d.month))].sort();
    if (months.length === 0) return 1;

    const lastAvailableMonth = months[months.length - 1];

    const appDate = new Date(applicationDate);
    const appDay = appDate.getDate();
    const applicationMonth = this.formatMonth(appDate);

    // Previous month calculation
    const prevMonthDate = new Date(appDate);
    prevMonthDate.setMonth(appDate.getMonth() - 1);
    const prevMonth = this.formatMonth(prevMonthDate);

    // Check data availability
    const hasActualAppMonth = months.includes(applicationMonth);
    const hasActualPrevMonth = months.includes(prevMonth);

    // ============================================
    // Calculate carryover (pending from previous month)
    // ============================================
    let carriedOver = 0;

    if (hasActualPrevMonth) {
      // Have actual data for previous month
      // Carryover = Total received - Processed = Net pending
      const totalReceived = this.getMonthValue(
        data,
        prevMonth,
        STATUS_CODES.TOTAL_RECEIVED,
      );
      const totalProcessed = this.getMonthValue(
        data,
        prevMonth,
        STATUS_CODES.TOTAL_PROCESSED,
      );
      carriedOver = totalReceived - totalProcessed;

      // Fallback: if TOTAL_RECEIVED not available, use CARRYOVER directly
      if (carriedOver <= 0) {
        carriedOver = this.getMonthValue(
          data,
          prevMonth,
          STATUS_CODES.CARRYOVER,
        );
      }
    } else {
      // Need to simulate carryover for months outside data range
      const availableMonths = months.filter((m) => m < applicationMonth);

      if (availableMonths.length > 0) {
        const lastDataMonth = availableMonths[availableMonths.length - 1];

        // Start with carryover from last available month
        const totalReceived = this.getMonthValue(
          data,
          lastDataMonth,
          STATUS_CODES.TOTAL_RECEIVED,
        );

        const totalProcessed = this.getMonthValue(
          data,
          lastDataMonth,
          STATUS_CODES.TOTAL_PROCESSED,
        );

        let simulatedCarryover = totalReceived - totalProcessed;
        if (simulatedCarryover <= 0) {
          simulatedCarryover = this.getMonthValue(
            data,
            lastDataMonth,
            STATUS_CODES.CARRYOVER,
          );
        }

        // Simulate month-by-month from last data to application month
        const lastDataDate = new Date(lastDataMonth + '-01');
        const currentMonthDate = new Date(lastDataDate);
        currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);

        const appMonthDate = new Date(applicationMonth + '-01');

        while (currentMonthDate < appMonthDate) {
          const daysInMonth = this.getDaysInMonth(
            this.formatMonth(currentMonthDate),
          );
          const netChange = (dailyNew - dailyProcessed) * daysInMonth;
          simulatedCarryover = Math.max(0, simulatedCarryover + netChange);
          currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
        }

        carriedOver = simulatedCarryover;
      }
    }

    // ============================================
    // Calculate received/processed BY application date (pro-rated by day)
    // ============================================
    let receivedByAppDate: number;
    let processedByAppDate: number;

    if (hasActualAppMonth) {
      // Use actual data for the application month, pro-rated by day
      const receivedInMonth = this.getMonthValue(
        data,
        applicationMonth,
        STATUS_CODES.NEW_RECEIVED,
      );
      const processedInMonth = this.getMonthValue(
        data,
        applicationMonth,
        STATUS_CODES.TOTAL_PROCESSED,
      );
      const daysInMonth = this.getDaysInMonth(applicationMonth);

      receivedByAppDate = (receivedInMonth / daysInMonth) * appDay;
      processedByAppDate = (processedInMonth / daysInMonth) * appDay;
    } else {
      // Estimate using daily rates
      receivedByAppDate = dailyNew * appDay;
      processedByAppDate = dailyProcessed * appDay;
    }

    // ============================================
    // Queue at application time
    // ============================================
    // Queue = carryover + apps received before user - apps processed before user
    const queueAtApplication = Math.round(
      carriedOver + receivedByAppDate - processedByAppDate,
    );

    // ============================================
    // Calculate total processed since application
    // ============================================
    const today = new Date();
    const isFutureDate = appDate > today;

    // For future dates, no processing has happened yet
    if (isFutureDate) {
      // Return queue at application time directly
      return Math.round(queueAtApplication);
    }

    // For past dates, calculate processing that has happened since application
    // Part 1: Confirmed processed (from actual data after application month)
    let confirmedProcessed = 0;

    if (hasActualAppMonth) {
      // Processing in application month after user applied
      const daysInMonth = this.getDaysInMonth(applicationMonth);
      const processedInAppMonth = dailyProcessed * (daysInMonth - appDay);
      confirmedProcessed += processedInAppMonth;
    }

    // Processing in months after application month (from actual data)
    const monthsAfterApp = months.filter((m) => m > applicationMonth);
    monthsAfterApp.forEach((month) => {
      confirmedProcessed += this.getMonthValue(
        data,
        month,
        STATUS_CODES.TOTAL_PROCESSED,
      );
    });

    // Part 2: Estimated processing since last data month
    const lastDataDate = new Date(lastAvailableMonth + '-01');
    lastDataDate.setMonth(lastDataDate.getMonth() + 1); // End of last data month
    lastDataDate.setDate(0); // Last day of month

    const daysSinceData = this.getDaysBetween(lastDataDate, today);

    let estimatedProcessed = 0;
    if (applicationDate > lastAvailableMonth) {
      // App date is after last data - estimate all processing since app
      const daysSinceApp = this.getDaysBetween(appDate, today);
      estimatedProcessed =
        dailyProcessed * Math.max(0, daysSinceApp) - confirmedProcessed;
    } else {
      // App date is within data range - only estimate processing after data cutoff
      estimatedProcessed = dailyProcessed * Math.max(0, daysSinceData);
    }

    const totalProcessedSinceApp = Math.round(
      confirmedProcessed + Math.max(0, estimatedProcessed),
    );

    // ============================================
    // Current queue position
    // ============================================
    // Don't cap at 1 - negative position means already processed
    const queuePosition = queueAtApplication - totalProcessedSinceApp;

    return Math.round(queuePosition);
  }

  /**
   * Calculate bureau efficiency relative to average
   */
  private calculateBureauEfficiency(
    allData: ImmigrationData[],
    bureauData: ImmigrationData[],
    months: string[],
  ): number {
    if (months.length === 0) return 1.0;

    // Calculate overall processing rate
    const overallProcessed = allData
      .filter(
        (d) =>
          d.status === STATUS_CODES.TOTAL_PROCESSED && months.includes(d.month),
      )
      .reduce((sum, d) => sum + d.value, 0);

    // Calculate bureau processing rate
    const bureauProcessed = bureauData
      .filter(
        (d) =>
          d.status === STATUS_CODES.TOTAL_PROCESSED && months.includes(d.month),
      )
      .reduce((sum, d) => sum + d.value, 0);

    // Calculate pending for ratio
    const overallPending = allData
      .filter(
        (d) => d.status === STATUS_CODES.CARRYOVER && months.includes(d.month),
      )
      .reduce((sum, d) => sum + d.value, 0);

    const bureauPending = bureauData
      .filter(
        (d) => d.status === STATUS_CODES.CARRYOVER && months.includes(d.month),
      )
      .reduce((sum, d) => sum + d.value, 0);

    if (overallPending === 0 || bureauPending === 0) return 1.0;

    const overallRatio = overallProcessed / overallPending;
    const bureauRatio = bureauProcessed / bureauPending;

    return bureauRatio / overallRatio || 1.0;
  }

  /**
   * Calculate estimated completion date
   */
  calculateEstimate(request: EstimationRequest): EstimationResult {
    const { applicationDate, bureau, applicationType } = request;

    // Get filtered data
    const filter = {
      bureau: bureau !== 'all' ? bureau : undefined,
      type: applicationType !== 'all' ? applicationType : undefined,
    };
    const data = this.statsService.getAllStats(filter);
    const allData = this.statsService.getAllStats({
      type: applicationType !== 'all' ? applicationType : undefined,
    });

    // Get last 6 months for EWMA calculation
    const months = this.statsService.getAvailableMonths();
    const recentMonths = months.slice(-6);

    // Calculate EWMA processing rate
    const { rate: dailyRate, stdDev } = this.calculateEWMARate(
      data,
      recentMonths,
    );

    // Calculate daily new received rate for queue estimation
    let totalNewReceived = 0;
    let totalDays = 0;
    recentMonths.forEach((month) => {
      const monthData = data.filter(
        (d) => d.month === month && d.status === STATUS_CODES.NEW_RECEIVED,
      );
      totalNewReceived += monthData.reduce((sum, d) => sum + d.value, 0);
      totalDays += this.getDaysInMonth(month);
    });
    const dailyNew = totalDays > 0 ? totalNewReceived / totalDays : 0;

    // Estimate queue position using the reference project's approach
    const queuePosition = this.estimateQueuePosition(
      data,
      applicationDate,
      dailyNew,
      dailyRate,
    );

    // Calculate bureau efficiency (for informational purposes only, not used in calculation)
    const bureauData =
      bureau !== 'all'
        ? this.statsService.getAllStats({
            bureau,
            type: applicationType !== 'all' ? applicationType : undefined,
          })
        : data;
    const bureauEfficiency = this.calculateBureauEfficiency(
      allData,
      bureauData,
      recentMonths,
    );

    // Calculate days remaining using simple processing rate (matching reference project)
    // Note: Bureau efficiency is NOT applied - the data is already filtered by bureau,
    // so dailyRate already reflects that bureau's processing speed
    const daysRemaining =
      dailyRate > 0
        ? Math.ceil(queuePosition / dailyRate)
        : this.MAX_FALLBACK_DAYS;
    const optimisticDays =
      dailyRate + stdDev > 0
        ? Math.ceil(queuePosition / (dailyRate + stdDev))
        : daysRemaining;
    const pessimisticDays =
      dailyRate - stdDev > 0
        ? Math.ceil(queuePosition / (dailyRate - stdDev))
        : daysRemaining * 2;

    // Calculate estimated dates
    // For future application dates, calculate from the application date (not today)
    // For past/present dates, calculate from today
    const today = new Date();
    const appDate = new Date(applicationDate);
    const isFutureApplication = appDate > today;
    const baseDate = isFutureApplication ? appDate : today;

    const estimatedDate = new Date(baseDate);
    estimatedDate.setDate(baseDate.getDate() + daysRemaining);

    const optimisticDate = new Date(baseDate);
    optimisticDate.setDate(baseDate.getDate() + optimisticDays);

    const pessimisticDate = new Date(baseDate);
    pessimisticDate.setDate(baseDate.getDate() + pessimisticDays);

    // Calculate confidence level based on data availability
    const confidenceLevel = Math.min(
      100,
      recentMonths.length * 15 + (dailyRate > 0 ? 10 : 0),
    );

    // Check if application is already processed (estimated date in the past)
    const isAlreadyProcessed = estimatedDate < today && !isFutureApplication;

    // Calculate daysRemaining as the difference from today to estimated date
    // This is more intuitive than queue-based calculation
    const daysFromTodayToEstimated = Math.ceil(
      (estimatedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    const displayDaysRemaining = isAlreadyProcessed
      ? 0
      : Math.max(0, daysFromTodayToEstimated);

    return {
      estimatedDate: estimatedDate.toISOString().split('T')[0],
      optimisticDate: optimisticDate.toISOString().split('T')[0],
      pessimisticDate: pessimisticDate.toISOString().split('T')[0],
      queuePosition: isAlreadyProcessed ? 0 : Math.max(0, queuePosition),
      dailyProcessingRate: Math.round(dailyRate * 100) / 100,
      confidenceLevel,
      bureauEfficiency: Math.round(bureauEfficiency * 100) / 100,
      daysRemaining: displayDaysRemaining,
      isAlreadyProcessed,
    };
  }
}
