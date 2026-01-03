import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { EstimationService } from './estimation.service';
import type { EstimationRequest } from '../../types';

@Controller('estimation')
export class EstimationController {
  constructor(private readonly estimationService: EstimationService) {}

  /**
   * POST /api/estimation
   * Calculate queue position estimate
   */
  @Post()
  calculateEstimate(@Body() request: EstimationRequest) {
    return this.estimationService.calculateEstimate(request);
  }

  /**
   * GET /api/estimation
   * Calculate queue position estimate via GET
   */
  @Get()
  getEstimate(
    @Query('applicationDate') applicationDate: string,
    @Query('bureau') bureau: string = 'all',
    @Query('applicationType') applicationType: string = 'all',
  ) {
    return this.estimationService.calculateEstimate({
      applicationDate,
      bureau,
      applicationType,
    });
  }
}
