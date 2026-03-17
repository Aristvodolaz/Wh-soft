# WMS Platform — Architecture Decision Records

> This document tracks key architectural decisions, their context, rationale, and consequences.

---

## ADR-001: NestJS as the Backend Framework

**Date**: 2026-03-16
**Status**: Accepted

### Context
Need a Node.js framework for a production-grade multi-module SaaS backend. Options considered: Express (bare), Fastify, NestJS, AdonisJS.

### Decision
Use **NestJS 10** as the primary framework.

### Consequences
- ✅ Built-in dependency injection, modular architecture aligns with DDD
- ✅ First-class TypeScript support, decorators-based
- ✅ @nestjs/swagger generates OpenAPI automatically from DTOs
- ✅ @nestjs/passport, @nestjs/jwt, @nestjs/throttler are battle-tested integrations
- ✅ @nestjs/testing makes unit and e2e testing straightforward
- ✅ Active ecosystem, long-term support
- ⚠️ Heavier than bare Express/Fastify — acceptable for SaaS complexity
- ⚠️ Decorator metadata requires `emitDecoratorMetadata: true` in tsconfig

---

## ADR-002: TypeORM over Prisma

**Date**: 2026-03-16
**Status**: Accepted

### Context
Need a PostgreSQL ORM with migration support, TypeScript types, and complex query capabilities. Options: Prisma, TypeORM, Drizzle, Knex.

### Decision
Use **TypeORM 0.3.x** as the ORM.

### Consequences
- ✅ Mature, production-proven with NestJS (`@nestjs/typeorm`)
- ✅ Full migration control — `synchronize: false` enforced in production
- ✅ Supports raw queries, query builder, and active record patterns
- ✅ Repository pattern aligns with DDD architecture
- ✅ Entity decorators integrate with class-validator
- ⚠️ Prisma has better DX for simple CRUD — acceptable trade-off for control
- ⚠️ TypeORM v0.3.x has breaking changes from v0.2 — use v0.3 exclusively

---

## ADR-003: UUID v4 as Primary Keys

**Date**: 2026-03-16
**Status**: Accepted

### Context
Need primary key strategy. Options: auto-increment integer, UUID v4, ULID, snowflake IDs.

### Decision
Use **UUID v4** (`PrimaryGeneratedColumn('uuid')`) for all entities.

### Consequences
- ✅ No sequential ID leakage (security: clients can't enumerate resources)
- ✅ Cross-service safe — no conflicts when merging data or migrating
- ✅ Generated client-side or server-side consistently
- ✅ Works naturally with multi-tenancy (tenant + UUID = globally unique)
- ⚠️ Larger index size vs integers — acceptable for our load profile
- ⚠️ Not sortable by time — use `created_at` for ordering

---

## ADR-004: In-Process Event Bus (@nestjs/event-emitter)

**Date**: 2026-03-16
**Status**: Accepted (temporary — see consequences)

### Context
Domain events need to be dispatched after aggregate state changes. Options: in-process EventEmitter, RabbitMQ, Kafka, Redis Streams.

### Decision
Use **@nestjs/event-emitter** (wraps Node.js EventEmitter) for domain events in MVP.

### Consequences
- ✅ Zero infrastructure dependency — works out of the box
- ✅ Synchronous and async handlers supported
- ✅ Easy to test with mocks
- ✅ Same API surface as external message brokers (event name, payload)
- ⚠️ Events are lost on process crash — acceptable for MVP, not for production
- 🔄 **Migration plan**: Replace with Redis Streams or Kafka in Stage 8 without changing event publishers/handlers — the `EventBusService` abstraction makes this transparent

---

## ADR-005: Joi for Configuration Validation

**Date**: 2026-03-16
**Status**: Accepted

### Context
Need environment variable validation at startup. Options: Joi, Zod, class-validator, manual.

### Decision
Use **Joi** with `@nestjs/config` `validationSchema` option.

### Consequences
- ✅ Application fails **immediately at startup** if required env vars are missing or invalid
- ✅ Eliminates entire class of runtime errors from missing configuration
- ✅ Well-supported by @nestjs/config
- ✅ Provides sensible defaults for optional variables
- ⚠️ Extra dependency alongside class-validator — minor overhead

---

## ADR-006: Multi-Stage Docker Build

**Date**: 2026-03-16
**Status**: Accepted

### Context
Need Docker image that is both fast to build and small in production.

### Decision
Use **2-stage Dockerfile**: `builder` (full deps + compile) and `runner` (prod deps + dist only).

### Consequences
- ✅ Production image ~150-200MB vs ~600MB single-stage
- ✅ Dev dependencies excluded from production
- ✅ Source TypeScript not exposed in production image
- ✅ Non-root user `nestjs:nodejs` for security
- ⚠️ Slightly longer initial build — worth the security/size benefits

---

## ADR-007: `synchronize: false` in TypeORM

**Date**: 2026-03-16
**Status**: Accepted (Non-negotiable)

### Context
TypeORM has a `synchronize: true` option that auto-creates/alters tables to match entities. This is dangerous in production.

### Decision
**Always** use `synchronize: false`. Schema changes go through migration files only.

### Consequences
- ✅ Prevents accidental data loss from schema drift
- ✅ Migrations are versioned, reviewable, and reversible
- ✅ Production deployments are explicit and predictable
- ⚠️ Requires discipline to run `migration:generate` and `migration:run` after entity changes
- ⚠️ Slightly more workflow overhead — acceptable, this is production software

---

## ADR-008: Global Rate Limiting via ThrottlerGuard

**Date**: 2026-03-16
**Status**: Accepted

### Context
Need rate limiting to prevent abuse and protect the API. Options: per-route decorators, nginx upstream limiting, global NestJS guard.

### Decision
Apply `ThrottlerGuard` as a global `APP_GUARD` with defaults of 100 req/60s.

### Consequences
- ✅ All endpoints protected by default — no missed routes
- ✅ Per-route override with `@Throttle()` decorator
- ✅ Skip throttling for specific routes with `@SkipThrottle()`
- ✅ Configurable via environment variables `THROTTLE_TTL` / `THROTTLE_LIMIT`
- ⚠️ Redis-backed storage needed for multi-instance deployments (add in Stage 2)
