import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { CorrelationIdMiddleware } from './shared/middleware/correlation-id.middleware';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './infrastructure/redis/redis.constants';
import { ThrottlerRedisStorage } from './infrastructure/redis/throttler-redis.storage';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import jwtConfig from './config/jwt.config';
import { validationSchema } from './config';

import { DatabaseModule } from './infrastructure/database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { EventBusModule } from './infrastructure/event-bus/event-bus.module';
import { MetricsModule } from './infrastructure/metrics/metrics.module';

import { AuthModule } from './modules/auth/auth.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Config — global, validates all env vars on startup
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
      validationSchema,
      validationOptions: { abortEarly: true },
    }),

    // Infrastructure (must load before ThrottlerModule to provide REDIS_CLIENT)
    DatabaseModule,
    RedisModule,

    // Rate limiting — Redis-backed storage for multi-instance safety
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => ({
        storage: new ThrottlerRedisStorage(redis),
        throttlers: [
          {
            ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10) * 1000,
            limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
          },
        ],
      }),
    }),

    // Event Bus
    EventBusModule,

    // Metrics (global — exposes GET /metrics in Prometheus text format)
    MetricsModule,

    // Health checks
    TerminusModule,
    HealthModule,

    // Domain modules
    AuthModule,
    WarehouseModule,
    InventoryModule,
    OrdersModule,
    EmployeesModule,
    TasksModule,
    AnalyticsModule,
  ],
  providers: [
    // Global rate-limit guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
