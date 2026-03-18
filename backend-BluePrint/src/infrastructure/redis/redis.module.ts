import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisHealthIndicator } from './redis-health.indicator';
import { REDIS_CLIENT } from './redis.constants';

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const client = new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            if (times > 10) return null;
            return Math.min(times * 100, 3000);
          },
          enableReadyCheck: true,
          lazyConnect: false,
        });

        client.on('connect', () => {
          console.log('[Redis] Connected');
        });

        client.on('error', (err: Error) => {
          console.error('[Redis] Connection error:', err.message);
        });

        return client;
      },
    },
    RedisHealthIndicator,
  ],
  exports: [REDIS_CLIENT, RedisHealthIndicator],
})
export class RedisModule {}
