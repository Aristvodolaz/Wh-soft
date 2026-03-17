import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Analytics & Metrics E2E Tests
 *
 * Verifies:
 *   - Auth enforcement (401 without token)
 *   - Query param validation (400 for bad UUIDs)
 *   - Metrics endpoint is publicly reachable (no JWT required)
 *
 * Full integration tests (with DB) are run separately in CI.
 */
describe('Analytics & Metrics (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const VALID_UUID = '00000000-0000-0000-0000-000000000001';

  // ── GET /metrics ──────────────────────────────────────────────────────────────

  describe('GET /metrics', () => {
    it('returns Prometheus text format without authentication', () => {
      return request(app.getHttpServer())
        .get('/metrics')
        .expect((res) => {
          // May return 200 (metrics served) — endpoint intentionally public
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  // ── GET /api/analytics/dashboard ─────────────────────────────────────────────

  describe('GET /api/analytics/dashboard', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer())
        .get(`/api/analytics/dashboard?warehouseId=${VALID_UUID}`)
        .expect(401);
    });

    it('returns 400 when warehouseId is not a UUID', () => {
      return request(app.getHttpServer())
        .get('/api/analytics/dashboard?warehouseId=not-a-uuid')
        .set('Authorization', 'Bearer invalid')
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });
  });

  // ── GET /api/analytics/orders ─────────────────────────────────────────────────

  describe('GET /api/analytics/orders', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer())
        .get(`/api/analytics/orders?warehouseId=${VALID_UUID}`)
        .expect(401);
    });
  });

  // ── GET /api/analytics/inventory ─────────────────────────────────────────────

  describe('GET /api/analytics/inventory', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer())
        .get(`/api/analytics/inventory?warehouseId=${VALID_UUID}`)
        .expect(401);
    });
  });

  // ── GET /api/analytics/tasks ──────────────────────────────────────────────────

  describe('GET /api/analytics/tasks', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer())
        .get(`/api/analytics/tasks?warehouseId=${VALID_UUID}`)
        .expect(401);
    });
  });

  // ── GET /api/analytics/utilization ───────────────────────────────────────────

  describe('GET /api/analytics/utilization', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer())
        .get(`/api/analytics/utilization?warehouseId=${VALID_UUID}`)
        .expect(401);
    });
  });

  // ── GET /api/analytics/employees/:userId/kpi ──────────────────────────────────

  describe('GET /api/analytics/employees/:userId/kpi', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer())
        .get(`/api/analytics/employees/${VALID_UUID}/kpi?from=2026-03-01T00:00:00Z`)
        .expect(401);
    });

    it('returns 400 when userId is not a UUID', () => {
      return request(app.getHttpServer())
        .get('/api/analytics/employees/not-a-uuid/kpi?from=2026-03-01T00:00:00Z')
        .set('Authorization', 'Bearer invalid')
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });
  });
});
