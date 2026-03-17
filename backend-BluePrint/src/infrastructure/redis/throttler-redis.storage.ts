import { Inject, Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

/**
 * Redis-backed throttler storage.
 * Safe for multi-instance / Kubernetes deployments — all instances
 * share the same rate-limit counters via Redis.
 *
 * Registered in AppModule as ThrottlerModule storage option.
 */
@Injectable()
export class ThrottlerRedisStorage implements ThrottlerStorage {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    const redisKey = `throttle:${key}`;

    const pipeline = this.redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.pttl(redisKey);

    const results = await pipeline.exec();
    const totalHits = (results?.[0]?.[1] as number) ?? 1;
    const pttlResult = (results?.[1]?.[1] as number) ?? -1;

    // Set expiry on first hit
    if (totalHits === 1) {
      await this.redis.pexpire(redisKey, Math.ceil(ttl / 1000));
    }

    const timeToExpire = pttlResult > 0 ? Math.ceil(pttlResult / 1000) : Math.ceil(ttl / 1000);

    return { totalHits, timeToExpire };
  }
}
