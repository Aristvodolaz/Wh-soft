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
**Production-grade SaaS Warehouse Management System**

## Authentication
Use Bearer JWT token in the Authorization header:
\`Authorization: Bearer <access_token>\`

## Multi-tenancy
All resources are scoped to the authenticated user's tenant.

## Rate Limiting
Default: 100 requests per 60 seconds per IP.
      `.trim(),
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
      .addTag('health', 'Health & readiness checks')
      .addTag('auth', 'Authentication — login, refresh, mobile PIN')
      .addTag('warehouses', 'Warehouse & zone management')
      .addTag('inventory', 'Inventory & stock management')
      .addTag('orders', 'Order management')
      .addTag('tasks', 'Warehouse task management')
      .addTag('analytics', 'Analytics & KPI dashboards')
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
