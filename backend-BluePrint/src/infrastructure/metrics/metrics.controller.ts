import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

/**
 * Exposes GET /metrics in Prometheus text exposition format.
 *
 * Excluded from Swagger docs — intended only for scraping by
 * Prometheus / VictoriaMetrics / Grafana Agent.
 *
 * To protect this endpoint in production, add IP-allowlist middleware
 * or a separate internal-only port via a Kubernetes Service.
 */
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  scrape(): string {
    return this.metricsService.renderText();
  }
}
