import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StatsModule } from './modules/stats/stats.module';
import { EstimationModule } from './modules/estimation/estimation.module';

@Module({
  imports: [StatsModule, EstimationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
