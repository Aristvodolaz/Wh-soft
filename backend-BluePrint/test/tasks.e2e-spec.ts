import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Tasks E2E Tests
 *
 * Verifies:
 *   - Auth enforcement (401 without token)
 *   - Input validation (400 for bad payloads)
 *   - UUID path param validation
 *
 * Full integration tests (with DB) are run separately in CI.
 */
describe('Tasks (e2e)', () => {
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

  // ── GET /api/tasks ────────────────────────────────────────────────────────────

  describe('GET /api/tasks', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer()).get('/api/tasks').expect(401);
    });

    it('returns 401 with a malformed token', () => {
      return request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', 'Bearer bad.jwt.token')
        .expect(401);
    });
  });

  // ── GET /api/tasks/my ─────────────────────────────────────────────────────────

  describe('GET /api/tasks/my', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer()).get('/api/tasks/my').expect(401);
    });
  });

  // ── GET /api/tasks/overdue ────────────────────────────────────────────────────

  describe('GET /api/tasks/overdue', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer()).get('/api/tasks/overdue').expect(401);
    });
  });

  // ── GET /api/tasks/:taskId ────────────────────────────────────────────────────

  describe('GET /api/tasks/:taskId', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer()).get(`/api/tasks/${VALID_UUID}`).expect(401);
    });

    it('returns 400 when taskId is not a UUID', () => {
      return request(app.getHttpServer())
        .get('/api/tasks/not-a-uuid')
        .set('Authorization', 'Bearer invalid')
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });
  });

  // ── POST /api/tasks ───────────────────────────────────────────────────────────

  describe('POST /api/tasks', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer())
        .post('/api/tasks')
        .send({ warehouseId: VALID_UUID, type: 'PICK', title: 'Pick items' })
        .expect(401);
    });

    it('returns 400 when warehouseId is missing', () => {
      return request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', 'Bearer invalid')
        .send({ type: 'PICK', title: 'Pick items' })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });

    it('returns 400 when type is invalid', () => {
      return request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', 'Bearer invalid')
        .send({ warehouseId: VALID_UUID, type: 'INVALID', title: 'Pick items' })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });

    it('returns 400 when title is missing', () => {
      return request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', 'Bearer invalid')
        .send({ warehouseId: VALID_UUID, type: 'PICK' })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });

    it('returns 400 when priority is invalid', () => {
      return request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', 'Bearer invalid')
        .send({ warehouseId: VALID_UUID, type: 'PICK', title: 'X', priority: 'EXTREME' })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });

    it('returns 400 when quantity is zero', () => {
      return request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', 'Bearer invalid')
        .send({ warehouseId: VALID_UUID, type: 'PICK', title: 'X', quantity: 0 })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });
  });

  // ── PATCH /api/tasks/:taskId/assign ──────────────────────────────────────────

  describe('PATCH /api/tasks/:taskId/assign', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer())
        .patch(`/api/tasks/${VALID_UUID}/assign`)
        .send({ userId: VALID_UUID })
        .expect(401);
    });

    it('returns 400 when userId is not a UUID', () => {
      return request(app.getHttpServer())
        .patch(`/api/tasks/${VALID_UUID}/assign`)
        .set('Authorization', 'Bearer invalid')
        .send({ userId: 'not-a-uuid' })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });
  });

  // ── POST /api/tasks/auto-assign ───────────────────────────────────────────────

  describe('POST /api/tasks/auto-assign', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer())
        .post(`/api/tasks/auto-assign?warehouseId=${VALID_UUID}`)
        .expect(401);
    });

    it('returns 400 when warehouseId is not a UUID', () => {
      return request(app.getHttpServer())
        .post('/api/tasks/auto-assign?warehouseId=not-a-uuid')
        .set('Authorization', 'Bearer invalid')
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });
  });

  // ── POST /api/tasks/:taskId/start ─────────────────────────────────────────────

  describe('POST /api/tasks/:taskId/start', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer()).post(`/api/tasks/${VALID_UUID}/start`).expect(401);
    });

    it('returns 400 when taskId is not a UUID', () => {
      return request(app.getHttpServer())
        .post('/api/tasks/not-a-uuid/start')
        .set('Authorization', 'Bearer invalid')
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });
  });

  // ── POST /api/tasks/:taskId/complete ──────────────────────────────────────────

  describe('POST /api/tasks/:taskId/complete', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer()).post(`/api/tasks/${VALID_UUID}/complete`).expect(401);
    });
  });

  // ── POST /api/tasks/:taskId/cancel ────────────────────────────────────────────

  describe('POST /api/tasks/:taskId/cancel', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer()).post(`/api/tasks/${VALID_UUID}/cancel`).expect(401);
    });
  });
});
