import { Module } from '@nestjs/common';
import { EstimationController } from './estimation.controller';
import { EstimationService } from './estimation.service';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [StatsModule],
  controllers: [EstimationController],
  providers: [EstimationService],
})
export class EstimationModule {}
