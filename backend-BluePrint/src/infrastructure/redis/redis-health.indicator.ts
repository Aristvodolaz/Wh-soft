import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.ping();

      if (pong === 'PONG') {
        return this.getStatus(key, true, { status: 'connected' });
      }

      throw new Error(`Unexpected ping response: ${pong}`);
    } catch (error) {
      const err = error as Error;
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, { message: err.message }),
      );
    }
  }
}
