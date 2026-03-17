import { Module } from '@nestjs/common';
import { AnalyticsService } from './application/services/analytics.service';
import { AnalyticsController } from './interface/controllers/analytics.controller';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
