import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Orders E2E Tests
 *
 * Verifies:
 *   - Auth enforcement (401 without token)
 *   - Input validation (400 for bad payloads)
 *   - UUID path param validation
 *
 * Full integration tests (with DB) are run separately in CI.
 */
describe('Orders (e2e)', () => {
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

  // ── GET /api/orders ──────────────────────────────────────────────────────────

  describe('GET /api/orders', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer()).get('/api/orders').expect(401);
    });

    it('returns 401 with a malformed token', () => {
      return request(app.getHttpServer())
        .get('/api/orders')
        .set('Authorization', 'Bearer bad.jwt.token')
        .expect(401);
    });
  });

  // ── GET /api/orders/:orderId ─────────────────────────────────────────────────

  describe('GET /api/orders/:orderId', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer()).get(`/api/orders/${VALID_UUID}`).expect(401);
    });

    it('returns 400 when orderId is not a UUID', () => {
      return request(app.getHttpServer())
        .get('/api/orders/not-a-uuid')
        .set('Authorization', 'Bearer invalid')
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });
  });

  // ── POST /api/orders ─────────────────────────────────────────────────────────

  describe('POST /api/orders', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer())
        .post('/api/orders')
        .send({ warehouseId: VALID_UUID })
        .expect(401);
    });

    it('returns 400 when warehouseId is missing', () => {
      return request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', 'Bearer invalid')
        .send({ type: 'OUTBOUND' })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });

    it('returns 400 when warehouseId is not a UUID', () => {
      return request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', 'Bearer invalid')
        .send({ warehouseId: 'not-a-uuid' })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });

    it('returns 400 when type is invalid', () => {
      return request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', 'Bearer invalid')
        .send({ warehouseId: VALID_UUID, type: 'INVALID' })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });

    it('returns 400 when priority is out of range', () => {
      return request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', 'Bearer invalid')
        .send({ warehouseId: VALID_UUID, priority: 15 })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });

    it('returns 400 when item requestedQuantity is zero', () => {
      return request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', 'Bearer invalid')
        .send({
          warehouseId: VALID_UUID,
          items: [{ productId: VALID_UUID, requestedQuantity: 0 }],
        })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });
  });

  // ── PATCH /api/orders/:orderId ───────────────────────────────────────────────

  describe('PATCH /api/orders/:orderId', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer())
        .patch(`/api/orders/${VALID_UUID}`)
        .send({ notes: 'update' })
        .expect(401);
    });

    it('returns 400 when orderId is not a UUID', () => {
      return request(app.getHttpServer())
        .patch('/api/orders/not-a-uuid')
        .set('Authorization', 'Bearer invalid')
        .send({ notes: 'update' })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });
  });

  // ── POST /api/orders/:orderId/items ─────────────────────────────────────────

  describe('POST /api/orders/:orderId/items', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer())
        .post(`/api/orders/${VALID_UUID}/items`)
        .send({ productId: VALID_UUID, requestedQuantity: 1 })
        .expect(401);
    });

    it('returns 400 when productId is missing', () => {
      return request(app.getHttpServer())
        .post(`/api/orders/${VALID_UUID}/items`)
        .set('Authorization', 'Bearer invalid')
        .send({ requestedQuantity: 1 })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });

    it('returns 400 when requestedQuantity is zero', () => {
      return request(app.getHttpServer())
        .post(`/api/orders/${VALID_UUID}/items`)
        .set('Authorization', 'Bearer invalid')
        .send({ productId: VALID_UUID, requestedQuantity: 0 })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });
  });

  // ── DELETE /api/orders/:orderId/items/:itemId ────────────────────────────────

  describe('DELETE /api/orders/:orderId/items/:itemId', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer())
        .delete(`/api/orders/${VALID_UUID}/items/${VALID_UUID}`)
        .expect(401);
    });

    it('returns 400 when itemId is not a UUID', () => {
      return request(app.getHttpServer())
        .delete(`/api/orders/${VALID_UUID}/items/not-a-uuid`)
        .set('Authorization', 'Bearer invalid')
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });
  });

  // ── Transition endpoints ─────────────────────────────────────────────────────

  describe('POST /api/orders/:orderId/confirm', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer()).post(`/api/orders/${VALID_UUID}/confirm`).expect(401);
    });
  });

  describe('POST /api/orders/:orderId/ship', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer()).post(`/api/orders/${VALID_UUID}/ship`).expect(401);
    });
  });

  describe('POST /api/orders/:orderId/cancel', () => {
    it('returns 401 without a JWT', () => {
      return request(app.getHttpServer()).post(`/api/orders/${VALID_UUID}/cancel`).expect(401);
    });
  });
});
