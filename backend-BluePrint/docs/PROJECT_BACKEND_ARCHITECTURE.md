# WMS Platform — Backend Architecture

> Version: 1.0 | Stage: 1 (Project Initialization) | Date: 2026-03-16

---

## 1. System Overview

WMS Platform is a **cloud-native SaaS Warehouse Management System** built as a production-grade multi-tenant backend. The system manages warehouses, inventory, orders, employees, tasks, and analytics for thousands of warehouse operations simultaneously.

### Key Properties
- **Multi-tenant SaaS** — all data is scoped by `tenantId`
- **Mobile-first** — supports warehouse scanners (TSD) and Android devices
- **Real-time operations** — event-driven domain model
- **Cloud-native** — Docker + Kubernetes, 12-factor app
- **Zero-downtime** — rolling deployments, graceful shutdown

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| Framework | NestJS | 10.x |
| Language | TypeScript | 5.4 |
| ORM | TypeORM | 0.3.x |
| Database | PostgreSQL | 16 |
| Cache / Sessions | Redis | 7 |
| Auth | JWT + Passport | — |
| Validation | class-validator | 0.14 |
| API Docs | Swagger / OpenAPI 3 | — |
| Rate Limiting | @nestjs/throttler | 5.x |
| Events | @nestjs/event-emitter | 2.x |
| Health Checks | @nestjs/terminus | 10.x |
| Container | Docker | — |
| Orchestration | Kubernetes | — |
| Testing | Jest + Supertest | — |

---

## 3. Architecture: Clean Architecture + DDD

```
┌─────────────────────────────────────────────────────┐
│                  Interface Layer                      │
│  Controllers · DTOs · Swagger Decorators             │
├─────────────────────────────────────────────────────┤
│                 Application Layer                     │
│  Use Cases · Commands · Queries · Event Handlers     │
├─────────────────────────────────────────────────────┤
│                   Domain Layer                        │
│  Entities · Aggregates · Value Objects · Events      │
│  (NO framework dependencies)                         │
├─────────────────────────────────────────────────────┤
│               Infrastructure Layer                    │
│  TypeORM Repositories · Redis · Event Bus · External │
└─────────────────────────────────────────────────────┘
```

### Dependency Rule
Dependencies only point **inward**. Domain layer has zero framework imports.

---

## 4. Project Structure

```
src/
├── main.ts                   # Bootstrap: Swagger, validation, guards
├── app.module.ts             # Root module, global config
│
├── config/                   # Typed config with Joi validation
│   ├── index.ts              # Joi validation schema
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── jwt.config.ts
│
├── shared/                   # Cross-cutting concerns
│   ├── domain/               # DDD base classes (framework-free)
│   │   ├── entity.base.ts
│   │   ├── aggregate-root.base.ts
│   │   ├── domain-event.base.ts
│   │   └── value-object.base.ts
│   ├── exceptions/
│   ├── guards/               # JwtAuthGuard, RolesGuard
│   ├── decorators/           # @Roles, @CurrentUser, @TenantId, @Public
│   ├── filters/              # Global HTTP exception filter
│   ├── interceptors/         # Logging, response transform
│   └── types/                # Role enum, pagination types
│
├── modules/                  # Feature modules (Clean Architecture)
│   ├── auth/                 # Stage 3
│   ├── warehouse/            # Stage 4
│   ├── inventory/            # Stage 5
│   ├── orders/               # Stage 6
│   ├── employees/            # Stage 3+
│   ├── tasks/                # Stage 7
│   └── analytics/            # Stage 8
│
├── infrastructure/           # External integrations
│   ├── database/             # TypeORM + PostgreSQL
│   ├── redis/                # ioredis client
│   └── event-bus/            # Domain event publisher
│
└── health/                   # Terminus health checks
```

---

## 5. Multi-Tenancy Strategy

Every entity extends `BaseEntity` which includes a `tenantId: uuid` column.

### Rules
1. All TypeORM queries **must** include `WHERE tenant_id = :tenantId`
2. `tenantId` is extracted from the JWT payload on every request
3. Admin users (SUPER_ADMIN) can access cross-tenant data only via dedicated super-admin APIs
4. Tenant isolation is enforced at the **repository layer** — use base repository methods that auto-inject tenant scope

### JWT Payload
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "tenantId": "tenant-uuid",
  "role": "WAREHOUSE_ADMIN",
  "iat": 1700000000,
  "exp": 1700003600
}
```

---

## 6. Security Model

### Authentication
- **Web users**: email + password → JWT access token (1h) + refresh token (7d)
- **Mobile workers**: PIN code (4–6 digits) → short-lived mobile token (8h)
- **Token refresh**: POST /auth/refresh with refresh token

### Authorization (RBAC)
| Role | Access |
|------|--------|
| SUPER_ADMIN | All tenants, all operations |
| WAREHOUSE_ADMIN | Own tenant, all operations |
| MANAGER | Own tenant, manage orders/tasks/employees |
| WORKER | Own tenant, own tasks only |
| ANALYST | Own tenant, read-only analytics |

### Guards
- `JwtAuthGuard` — applied globally via `APP_GUARD`, can be bypassed with `@Public()`
- `RolesGuard` — applied per-endpoint with `@Roles(...)`

---

## 7. Database Schema (Tables)

| Table | Module | Description |
|-------|--------|-------------|
| `tenants` | Core | Tenant registry |
| `users` | Auth | All users, includes PIN hash |
| `warehouses` | Warehouse | Top-level warehouse |
| `zones` | Warehouse | Zones within a warehouse |
| `cells` | Warehouse | Individual storage cells |
| `products` | Inventory | Product catalog / SKU registry |
| `inventory_items` | Inventory | Stock per cell |
| `batches` | Inventory | Lot/batch tracking |
| `inventory_movements` | Inventory | Full audit log |
| `orders` | Orders | Inbound/outbound orders |
| `order_items` | Orders | Line items per order |
| `tasks` | Tasks | Warehouse operation tasks |

All tables include: `id UUID PK`, `tenant_id UUID NOT NULL`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.

---

## 8. API Structure

**Base URL**: `/api/v1`
**Docs**: `GET /docs` (Swagger UI, dev only)
**Health**: `GET /api/health`

### Endpoints by Module
```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/mobile-pin

GET    /api/v1/warehouses
POST   /api/v1/warehouses
POST   /api/v1/warehouses/:id/cells/bulk

GET    /api/v1/inventory
GET    /api/v1/inventory/scan?barcode=...
POST   /api/v1/inventory/move

GET    /api/v1/orders
POST   /api/v1/orders
POST   /api/v1/orders/:id/confirm

GET    /api/v1/tasks/my
PATCH  /api/v1/tasks/:id/complete

GET    /api/v1/analytics/dashboard
GET    /api/v1/analytics/employees/:id/kpi
```

### Standard Response Format
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-03-16T12:00:00.000Z"
}
```

### Error Response Format
```json
{
  "success": false,
  "statusCode": 400,
  "code": "RESOURCE_NOT_FOUND",
  "message": "Warehouse with id \"abc\" not found",
  "timestamp": "2026-03-16T12:00:00.000Z",
  "path": "/api/v1/warehouses/abc"
}
```

---

## 9. Event System

Domain events are published via `EventBusService` using `@nestjs/event-emitter`.

### Event Format
```typescript
interface DomainEvent {
  eventName: string;   // e.g. "inventory.moved"
  occurredAt: Date;
  aggregateId: string;
  tenantId: string;
}
```

### Registered Events
| Event | Trigger |
|-------|---------|
| `inventory.moved` | Stock moved between cells |
| `inventory.adjusted` | Manual stock adjustment |
| `order.created` | New order created |
| `order.confirmed` | Order confirmed |
| `order.shipped` | Order shipped |
| `task.assigned` | Task assigned to worker |
| `task.completed` | Task marked complete |

---

## 10. Infrastructure

### Rate Limiting
- **Global**: 100 requests / 60 seconds per IP
- Applied via `ThrottlerGuard` registered as `APP_GUARD`
- Override per route with `@Throttle()`

### Caching (Redis)
- Session tokens
- Inventory snapshot cache
- Analytics aggregations

### Observability
- Structured logging via NestJS `Logger`
- Health endpoint: `GET /api/health` (DB + memory + disk)
- Prometheus metrics: `GET /api/metrics` (Stage 8)
