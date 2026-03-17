import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('APP_PORT', 3030);
  const env = config.get<string>('APP_ENV', 'development');
  const corsOrigin = config.get<string>('APP_CORS_ORIGIN', '*');

  // ── Security ────────────────────────────────────────────────────────────────
  app.use(helmet());
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    credentials: true,
  });

  // ── Global prefix & versioning ───────────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ── Validation pipe ──────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global filters & interceptors ────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // ── Swagger / OpenAPI ────────────────────────────────────────────────────────
  if (env !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('WMS Platform API')
      .setDescription(
        `
## [RU] Описание API
**Полнофункциональная SaaS-система управления складом (WMS)**

### Аутентификация
Используйте Bearer JWT токен в заголовке Authorization:
\`Authorization: Bearer <access_token>\`

### Мультитенантность
Все ресурсы разделены по Tenant ID. Доступ осуществляется только к данным вашей организации.

### Ограничение запросов (Rate Limiting)
По умолчанию: 100 запросов в 60 секунд на один IP-адрес.

---

## [EN] API Description
**Production-grade SaaS Warehouse Management System**

### Authentication
Use Bearer JWT token in the Authorization header:
\`Authorization: Bearer <access_token>\`

### Multi-tenancy
All resources are scoped to the authenticated user's tenant.

### Rate Limiting
Default: 100 requests per 60 seconds per IP.
      `.trim(),
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
      .addTag('health', 'Проверка состояния — Health & readiness checks')
      .addTag('auth', 'Авторизация — login, refresh, mobile PIN')
      .addTag('warehouses', 'Склады и зоны — Warehouse & zone management')
      .addTag('inventory', 'Инвентаризация и стоки — Inventory & stock management')
      .addTag('orders', 'Заказы — Order management')
      .addTag('tasks', 'Задачи склада — Warehouse task management')
      .addTag('analytics', 'Аналитика и дашборды — Analytics & KPI dashboards')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'WMS Platform — API Docs',
    });

    console.log(`[Swagger] API documentation: http://localhost:${port}/docs`);
  }

  // ── Graceful shutdown ────────────────────────────────────────────────────────
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  console.log(`[WMS] Backend running in ${env} mode on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
