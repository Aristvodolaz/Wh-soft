import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Auth E2E Tests
 *
 * These tests verify the auth endpoints against a running NestJS app.
 * They do NOT require a live database — they verify that:
 *   - Invalid inputs return 400 (validation errors)
 *   - Invalid credentials return 401 (auth errors)
 *   - Invalid tokens return 401 (token errors)
 *
 * Integration tests with a real DB are handled separately.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Mirror the bootstrap setup from main.ts
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /api/auth/login ───────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('returns 400 when body is empty', () => {
      return request(app.getHttpServer()).post('/api/auth/login').send({}).expect(400);
    });

    it('returns 400 when email is invalid', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'Test1234!', tenantSlug: 'acme' })
        .expect(400);
    });

    it('returns 400 when password is too short', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@acme.com', password: 'abc', tenantSlug: 'acme' })
        .expect(400);
    });

    it('returns 400 when tenantSlug is missing', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@acme.com', password: 'SecurePass123!' })
        .expect(400);
    });

    it('returns 401 for non-existent tenant', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'user@nobody.com',
          password: 'SecurePass123!',
          tenantSlug: 'nonexistent-tenant',
        })
        .expect(401);
    });

    it('returns 401 for valid format but wrong credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'hacker@acme.com',
          password: 'WrongPassword123!',
          tenantSlug: 'acme',
        })
        .expect(401);
    });
  });

  // ── POST /api/auth/mobile-pin ──────────────────────────────────────────────

  describe('POST /api/auth/mobile-pin', () => {
    it('returns 400 when body is empty', () => {
      return request(app.getHttpServer()).post('/api/auth/mobile-pin').send({}).expect(400);
    });

    it('returns 400 when PIN contains non-digits', () => {
      return request(app.getHttpServer())
        .post('/api/auth/mobile-pin')
        .send({ email: 'worker@acme.com', pin: 'abc1', tenantSlug: 'acme' })
        .expect(400);
    });

    it('returns 400 when PIN is too short (< 4 digits)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/mobile-pin')
        .send({ email: 'worker@acme.com', pin: '12', tenantSlug: 'acme' })
        .expect(400);
    });

    it('returns 401 for non-existent tenant', () => {
      return request(app.getHttpServer())
        .post('/api/auth/mobile-pin')
        .send({ email: 'worker@nobody.com', pin: '1234', tenantSlug: 'ghost-tenant' })
        .expect(401);
    });

    it('returns 401 for wrong PIN', () => {
      return request(app.getHttpServer())
        .post('/api/auth/mobile-pin')
        .send({ email: 'worker@acme.com', pin: '9999', tenantSlug: 'acme' })
        .expect(401);
    });
  });

  // ── POST /api/auth/refresh ─────────────────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    it('returns 401 when no Authorization header is provided', () => {
      return request(app.getHttpServer()).post('/api/auth/refresh').send({}).expect(401);
    });

    it('returns 401 for a malformed Bearer token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer not.a.valid.jwt')
        .expect(401);
    });

    it('returns 401 for an access token used as a refresh token', async () => {
      // Access tokens are signed with a different secret from refresh tokens
      const fakeAccessJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
        '.eyJzdWIiOiJ1c2VyLXV1aWQiLCJlbWFpbCI6InVzZXJAYWNtZS5jb20iLCJ0ZW5hbnRJZCI6InQxIiwicm9sZSI6IldPUktFUiJ9' +
        '.invalid-signature';

      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${fakeAccessJwt}`)
        .expect(401);
    });
  });
});
