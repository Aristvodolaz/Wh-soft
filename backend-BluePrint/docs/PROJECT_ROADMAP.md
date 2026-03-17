# WMS Platform — Backend Development Roadmap

> Last Updated: 2026-03-16

---

## Overview

The backend is built in **8 stages**, each delivering a complete, deployable increment of functionality.

```
Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5 → Stage 6 → Stage 7 → Stage 8
Project    Infra     Auth       Warehouse  Inventory  Orders    Tasks    Analytics
Init       Setup     Module     Module     Module     Module    Module   + Observ.
  ✅        ✅        ⬜          ⬜          ⬜          ⬜         ⬜        ⬜
```

---

## Stage 1 — Project Initialization ✅

**Week 1 | Status: Complete**

Deliverables:
- [x] NestJS project scaffold at repo root
- [x] TypeScript strict config with path aliases
- [x] Shared domain layer (BaseEntity, AggregateRoot, DomainEvent, ValueObject)
- [x] Cross-cutting: guards, decorators, filters, interceptors, exceptions
- [x] Typed config module with Joi validation (fails fast on startup)
- [x] Infrastructure modules: DatabaseModule (TypeORM), RedisModule, EventBusModule
- [x] 7 domain module scaffolds (empty, ready for implementation)
- [x] Health check endpoint (`/api/health`)
- [x] Swagger/OpenAPI at `/docs` (dev only)
- [x] Docker: multi-stage Dockerfile + docker-compose (api + postgres + redis)
- [x] Kubernetes: deployment, service, configmap
- [x] Documentation: ARCHITECTURE.md, ROADMAP.md, TASKS.md, DECISIONS.md

---

## Stage 2 — Database Migrations & Infrastructure ✅

**Week 2 | Status: Complete**

Deliverables:
- [x] Migration: `1710000000001-CreateTenants` — tenants table, plan enum, auto-updated_at trigger
- [x] Migration: `1710000000002-CreateUsers` — users table, role enum, FK to tenants, indexes
- [x] `src/infrastructure/database/data-source.ts` — TypeORM DataSource for CLI
- [x] `src/infrastructure/database/seeds/seed.ts` — initial tenant + SUPER_ADMIN seeder
- [x] `RedisHealthIndicator` — dedicated Redis health check via @nestjs/terminus
- [x] `ThrottlerRedisStorage` — Redis-backed rate limiting (multi-instance Kubernetes safe)
- [x] `CorrelationIdMiddleware` — X-Correlation-ID header on all requests
- [x] `LoggingInterceptor` — structured logs include correlation ID per request
- [x] `AppModule` — ThrottlerModule wired to Redis storage, middleware applied globally

---

## Stage 3 — Authentication Module ⬜

**Week 3 | Status: Pending**

Deliverables:
- [ ] `User` entity and TypeORM repository
- [ ] `Tenant` entity
- [ ] Password hashing with bcryptjs (bcrypt factor 12)
- [ ] `LocalStrategy` (email + password)
- [ ] `JwtStrategy` (access token validation)
- [ ] `JwtRefreshStrategy` (refresh token validation)
- [ ] `MobilePinStrategy` (PIN-based auth for workers)
- [ ] `AuthController`: POST /auth/login, /auth/refresh, /auth/mobile-pin
- [ ] `AuthService`: login, refreshTokens, validateUser, hashPassword
- [ ] Refresh token rotation with Redis blacklist
- [ ] Unit tests: AuthService
- [ ] Integration tests: AuthController endpoints

---

## Stage 4 — Warehouse Module ⬜

**Week 4 | Status: Pending**

Deliverables:
- [ ] `Warehouse`, `Zone`, `Cell` entities + migrations
- [ ] WarehouseRepository, ZoneRepository, CellRepository (tenant-scoped)
- [ ] `WarehouseController`: GET /warehouses, POST /warehouses
- [ ] `POST /warehouses/:warehouseId/cells/bulk` — batch cell creation
- [ ] Cell constraints: type, weight, dimensions, temperature zone
- [ ] Zone types: RECEIVING, STORAGE, SHIPPING, QUARANTINE
- [ ] Domain events: `warehouse.created`, `cells.created`
- [ ] Unit tests: WarehouseService
- [ ] Integration tests: Warehouse endpoints

---

## Stage 5 — Inventory Module ⬜

**Week 5 | Status: Pending**

Deliverables:
- [ ] `Product`, `InventoryItem`, `Batch`, `InventoryMovement` entities + migrations
- [ ] Product catalog CRUD with SKU, barcode, EAN, UPC
- [ ] Stock tracking per cell (real-time balance)
- [ ] `GET /inventory` — paginated stock list with filters
- [ ] `GET /inventory/scan?barcode=` — scan-based lookup
- [ ] `POST /inventory/move` — move stock between cells
- [ ] `POST /inventory/adjust` — manual adjustment
- [ ] FIFO/FEFO picking strategy
- [ ] Low-stock threshold alerts
- [ ] Movement audit log (InventoryMovement)
- [ ] Domain events: `inventory.moved`, `inventory.adjusted`
- [ ] Unit tests: InventoryService
- [ ] Integration tests: Inventory endpoints

---

## Stage 6 — Orders Module ⬜

**Week 6 | Status: Pending**

Deliverables:
- [ ] `Order`, `OrderItem` entities + migrations
- [ ] Order status machine: DRAFT → CONFIRMED → IN_PROGRESS → PACKED → SHIPPED → CANCELLED
- [ ] `GET /orders` — paginated order list with status filter
- [ ] `POST /orders` — create inbound/outbound order
- [ ] `POST /orders/:id/confirm` — confirm order, reserve inventory
- [ ] `GET /orders/:id/picking-list` — optimized picking route
- [ ] Task auto-generation on order confirmation
- [ ] Inventory reservation on confirm
- [ ] Domain events: `order.created`, `order.confirmed`, `order.shipped`
- [ ] Unit tests: OrdersService
- [ ] Integration tests: Orders endpoints

---

## Stage 7 — Tasks Module ⬜

**Week 7 | Status: Pending**

Deliverables:
- [ ] `Task` entity + migration
- [ ] Task types: RECEIVING, PICKING, PACKING, REPLENISHMENT, AUDIT, MOVING
- [ ] Task status machine: PENDING → ASSIGNED → IN_PROGRESS → COMPLETED → CANCELLED
- [ ] `GET /tasks/my` — worker's task queue (mobile-optimized)
- [ ] `PATCH /tasks/:id/complete` — mark task done, validate with scan
- [ ] Task assignment algorithm (round-robin, skill-based)
- [ ] KPI data capture: start_time, end_time, scan_count, errors
- [ ] Domain events: `task.assigned`, `task.completed`
- [ ] Unit tests: TasksService
- [ ] Integration tests: Tasks endpoints

---

## Stage 8 — Analytics & Observability ⬜

**Week 8 | Status: Pending**

Deliverables:
- [ ] `GET /analytics/dashboard` — overview KPIs
- [ ] `GET /analytics/employees/:id/kpi` — employee performance
- [ ] Prometheus metrics endpoint (`/api/metrics`)
- [ ] Grafana dashboard configuration
- [ ] Structured JSON logging (ELK-ready)
- [ ] Alerting rules for critical metrics
- [ ] Performance optimization: Redis caching for analytics
- [ ] Load testing results (k6 or Artillery)
- [ ] Final security review

---

## Future (Post-MVP)

- Marketplace integrations (Wildberries, Ozon, Yandex.Market)
- 1C ERP connector
- AI-based inventory placement suggestions
- Predictive restocking alerts
- White-label tenant customization
- Webhooks for external systems
- Mobile offline sync (conflict resolution)
- Multi-warehouse cross-tenant analytics (SUPER_ADMIN)
- CQRS + separate read models for high-traffic analytics
