import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';

/**
 * MetricsModule — exposes GET /metrics in Prometheus text format.
 *
 * Global so MetricsService can be injected anywhere without importing
 * MetricsModule explicitly (e.g. from interceptors, guards, services).
 */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
