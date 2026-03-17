# WMS Platform — Implementation Task Tracker

> Last Updated: 2026-03-17

---

## Stage 1 — Project Initialization ✅

### Root Configuration
- [x] `package.json` — NestJS 10, TypeORM, all dependencies
- [x] `tsconfig.json` — strict TypeScript + path aliases
- [x] `tsconfig.build.json` — production build config
- [x] `nest-cli.json` — NestJS CLI config
- [x] `.eslintrc.js` — ESLint + Prettier rules
- [x] `.prettierrc` — code formatting
- [x] `.gitignore` — excludes node_modules, dist, .env
- [x] `.env.example` — all env vars documented
- [x] `.dockerignore` — Docker build exclusions

### Source — Shared Layer
- [x] `src/shared/domain/entity.base.ts` — BaseEntity with tenantId
- [x] `src/shared/domain/aggregate-root.base.ts` — domain events support
- [x] `src/shared/domain/domain-event.base.ts` — DomainEvent interface
- [x] `src/shared/domain/value-object.base.ts` — immutable value objects
- [x] `src/shared/exceptions/app.exception.ts` — HTTP exceptions
- [x] `src/shared/exceptions/domain.exception.ts` — domain exceptions
- [x] `src/shared/guards/jwt-auth.guard.ts` — global JWT guard
- [x] `src/shared/guards/roles.guard.ts` — RBAC guard
- [x] `src/shared/decorators/roles.decorator.ts` — @Roles()
- [x] `src/shared/decorators/tenant.decorator.ts` — @TenantId()
- [x] `src/shared/decorators/current-user.decorator.ts` — @CurrentUser()
- [x] `src/shared/decorators/public.decorator.ts` — @Public()
- [x] `src/shared/filters/http-exception.filter.ts` — global error handler
- [x] `src/shared/interceptors/logging.interceptor.ts` — request logging
- [x] `src/shared/interceptors/transform.interceptor.ts` — response wrapper
- [x] `src/shared/types/role.enum.ts` — SUPER_ADMIN, WAREHOUSE_ADMIN, MANAGER, WORKER, ANALYST
- [x] `src/shared/types/pagination.types.ts` — PaginationQueryDto, PaginatedResult

### Source — Config
- [x] `src/config/index.ts` — Joi validation schema
- [x] `src/config/app.config.ts`
- [x] `src/config/database.config.ts`
- [x] `src/config/redis.config.ts`
- [x] `src/config/jwt.config.ts`

### Source — Infrastructure
- [x] `src/infrastructure/database/database.module.ts` — TypeORM async
- [x] `src/infrastructure/database/migrations/.gitkeep`
- [x] `src/infrastructure/redis/redis.module.ts` — ioredis client
- [x] `src/infrastructure/event-bus/event-bus.module.ts`
- [x] `src/infrastructure/event-bus/event-bus.service.ts`

### Source — Domain Modules (Scaffolds)
- [x] `src/modules/auth/auth.module.ts`
- [x] `src/modules/warehouse/warehouse.module.ts`
- [x] `src/modules/inventory/inventory.module.ts`
- [x] `src/modules/orders/orders.module.ts`
- [x] `src/modules/employees/employees.module.ts`
- [x] `src/modules/tasks/tasks.module.ts`
- [x] `src/modules/analytics/analytics.module.ts`

### Source — App Root
- [x] `src/app.module.ts` — root module wiring
- [x] `src/main.ts` — bootstrap with Swagger, guards, CORS

### Source — Health
- [x] `src/health/health.module.ts`
- [x] `src/health/health.controller.ts`

### Docker & Kubernetes
- [x] `Dockerfile` — multi-stage build (builder + runner)
- [x] `docker-compose.yml` — api + postgres + redis + healthchecks
- [x] `k8s/deployment.yaml` — 2 replicas, probes, resource limits
- [x] `k8s/service.yaml` — ClusterIP on port 3030
- [x] `k8s/configmap.yaml` — non-secret env vars

### Testing
- [x] `test/app.e2e-spec.ts` — health check + not-found test
- [x] `test/jest-e2e.json` — e2e Jest config

### Documentation
- [x] `PROJECT_BACKEND_ARCHITECTURE.md`
- [x] `PROJECT_ROADMAP.md`
- [x] `PROJECT_TASKS.md` (this file)
- [x] `PROJECT_DECISIONS.md`

---

## Stage 2 — Database Migrations & Infrastructure ✅

### Migration Naming Convention
All migrations follow the pattern `{timestamp}-{PascalCaseName}.ts` with class
name `{PascalCaseName}{timestamp}`. Every migration implements both `up()` (apply)
and `down()` (rollback). Rollback order is always the reverse of creation:
triggers → indexes → tables → enums (dependency-safe).

### Tasks
- [x] `src/infrastructure/database/data-source.ts` — TypeORM DataSource for CLI
- [x] `package.json` updated — migration scripts use `-d data-source.ts`
- [x] Migration: `1710000000001-CreateTenants` — tenants table + plan enum + trigger + rollback
- [x] Migration: `1710000000002-CreateUsers` — users table + role enum + FK + indexes + rollback
- [x] Migration: `1710000000003-CreateWarehouses` — warehouses table + indexes + rollback
- [x] Migration: `1710000000004-CreateZones` — zones table + zone_type_enum + indexes + rollback
- [x] Migration: `1710000000005-CreateCells` — cells table + partial barcode index + rollback
- [x] Migration: `1710000000006-CreateProducts` — products table + product_unit_enum + indexes + rollback
- [x] Migration: `1710000000007-CreateInventoryItems` — inventory_items + FKs + expiry index + rollback
- [x] Migration: `1710000000008-CreateBatches` — batches table + FKs + expiry index + rollback
- [x] Migration: `1710000000009-CreateInventoryMovements` — movements + movement_type/status enums + rollback
- [x] Migration: `1710000000010-CreateOrders` — orders + order_type/status enums + priority index + rollback
- [x] Migration: `1710000000011-CreateOrderItems` — order_items + order_item_status_enum + qty constraints + rollback
- [x] Migration: `1710000000012-CreateTasks` — tasks + task_type/status/priority enums + worker indexes + rollback
- [x] `src/infrastructure/database/seeds/seed.ts` — initial tenant + super admin
- [x] `src/infrastructure/redis/redis-health.indicator.ts` — Redis health check
- [x] `src/infrastructure/redis/throttler-redis.storage.ts` — Redis-backed rate limiting
- [x] `src/shared/middleware/correlation-id.middleware.ts` — X-Correlation-ID on every request
- [x] `LoggingInterceptor` updated — includes correlation ID in every log line
- [x] `RedisModule` updated — exports `RedisHealthIndicator`, `ThrottlerRedisStorage`
- [x] `HealthController` updated — includes Redis health check
- [x] `AppModule` updated — ThrottlerModule uses Redis storage, correlation middleware applied globally

---

## Stage 3 — Auth Module ✅

### Entities & Repository
- [x] `src/modules/auth/domain/entities/tenant.entity.ts` — TenantPlan enum, no tenantId (IS the root)
- [x] `src/modules/auth/domain/entities/user.entity.ts` — email + passwordHash + pinHash + role
- [x] `src/modules/auth/infrastructure/repositories/user.repository.ts` — tenant-scoped queries
- [x] `src/modules/auth/infrastructure/repositories/tenant.repository.ts` — slug + active lookup

### DTOs
- [x] `src/modules/auth/application/dto/login.dto.ts` — email, password, tenantSlug
- [x] `src/modules/auth/application/dto/mobile-pin-login.dto.ts` — email, 4–8 digit pin, tenantSlug
- [x] `src/modules/auth/application/dto/refresh-token.dto.ts`
- [x] `src/modules/auth/application/dto/token-response.dto.ts` — accessToken, refreshToken, role, expiresIn

### Services & Controllers
- [x] `src/modules/auth/application/services/auth.service.ts` — validateUser, validatePin, login, refresh, hashPassword, hashPin
- [x] `src/modules/auth/application/strategies/local.strategy.ts` — passport-local + passReqToCallback for tenantSlug
- [x] `src/modules/auth/application/strategies/jwt.strategy.ts` — Bearer token validation
- [x] `src/modules/auth/application/strategies/jwt-refresh.strategy.ts` — refresh token rotation
- [x] `src/modules/auth/application/strategies/mobile-pin.strategy.ts` — WORKER PIN auth
- [x] `src/modules/auth/interface/controllers/auth.controller.ts` — POST /auth/login, /auth/refresh, /auth/mobile-pin
- [x] `src/modules/auth/auth.module.ts` — wired with TypeORM, PassportModule, JwtModule

### Tests
- [x] `src/modules/auth/application/services/__tests__/auth.service.spec.ts` — validateUser, validatePin, login, hashPassword, hashPin
- [x] `src/modules/auth/application/strategies/__tests__/local.strategy.spec.ts` — valid + invalid paths
- [x] `test/auth.e2e-spec.ts` — validation errors (400), auth errors (401) for all 3 endpoints

---

## Stage 4 — Warehouse Module ✅

> Migrations already exist (003–005). Stage 4 adds TypeORM entities + business logic.

### Entities
- [x] `src/modules/warehouse/domain/entities/warehouse.entity.ts` — extends BaseEntity
- [x] `src/modules/warehouse/domain/entities/zone.entity.ts` — ZoneType enum, FK to warehouse
- [x] `src/modules/warehouse/domain/entities/cell.entity.ts` — location fields (aisle/bay/level/position), weight/volume limits

### Repositories (tenant-scoped)
- [x] `src/modules/warehouse/infrastructure/repositories/warehouse.repository.ts` — existsByCode, findAllByTenant
- [x] `src/modules/warehouse/infrastructure/repositories/zone.repository.ts` — existsByCode, findByType
- [x] `src/modules/warehouse/infrastructure/repositories/cell.repository.ts` — bulkInsert (transactional), findAvailable

### Application Layer
- [x] `src/modules/warehouse/application/dto/create-warehouse.dto.ts` — code regex validation
- [x] `src/modules/warehouse/application/dto/update-warehouse.dto.ts` — PartialType + isActive toggle
- [x] `src/modules/warehouse/application/dto/create-zone.dto.ts` — ZoneType enum
- [x] `src/modules/warehouse/application/dto/bulk-create-cells.dto.ts` — CellSpecDto nested, max 1000 cells
- [x] `src/modules/warehouse/application/dto/warehouse-response.dto.ts` — Warehouse/Zone/Cell/BulkResult response shapes
- [x] `src/modules/warehouse/application/services/warehouse.service.ts` — listWarehouses, createWarehouse, getWarehouse, updateWarehouse, listZones, createZone, bulkCreateCells, listCellsByZone

### Interface Layer
- [x] `src/modules/warehouse/interface/controllers/warehouse.controller.ts` — 8 endpoints, JWT + RBAC guards

### Module
- [x] `src/modules/warehouse/warehouse.module.ts` — TypeORM forFeature + all providers wired

### Tests
- [x] `src/modules/warehouse/application/services/__tests__/warehouse.service.spec.ts` — list, create, get, bulk create, conflict/not-found/duplicate-code cases
- [x] `test/warehouse.e2e-spec.ts` — 401 auth enforcement + 400 validation for all endpoints

---

## Stage 5 — Inventory Module ✅

> Migrations already exist (006–009). Stage 5 adds TypeORM entities + business logic.

### Entities
- [x] `src/modules/inventory/domain/entities/product.entity.ts` — ProductUnit enum (PIECE/BOX/PALLET/KG/LITER/METER)
- [x] `src/modules/inventory/domain/entities/inventory-item.entity.ts` — `availableQuantity` getter (qty - reservedQty)
- [x] `src/modules/inventory/domain/entities/batch.entity.ts` — lot/expiry tracking
- [x] `src/modules/inventory/domain/entities/inventory-movement.entity.ts` — MovementType + MovementStatus enums

### Repositories (tenant-scoped)
- [x] `src/modules/inventory/infrastructure/repositories/product.repository.ts` — findByBarcode, search (ILike), existsBySku
- [x] `src/modules/inventory/infrastructure/repositories/inventory-item.repository.ts` — findLowStock, findUnlocated, FEFO ordering
- [x] `src/modules/inventory/infrastructure/repositories/batch.repository.ts` — findExpiringSoon, FEFO ordering
- [x] `src/modules/inventory/infrastructure/repositories/inventory-movement.repository.ts` — findByPerformedBy, findPending, findByType

### Application Layer
- [x] `src/modules/inventory/application/dto/create-product.dto.ts`
- [x] `src/modules/inventory/application/dto/update-product.dto.ts` — PartialType + isActive toggle
- [x] `src/modules/inventory/application/dto/move-inventory.dto.ts` — quantity ≥ 1, MovementType enum
- [x] `src/modules/inventory/application/dto/scan-inventory.dto.ts` — barcode + warehouseId
- [x] `src/modules/inventory/application/dto/inventory-response.dto.ts` — Product/InventoryItem/Scan/Movement response shapes
- [x] `src/modules/inventory/application/services/inventory.service.ts` — listProducts, createProduct, getProduct, updateProduct, listInventory, scan (product→cell fallback), move (pessimistic write lock, transactional, emits `inventory.moved`)

### Interface Layer
- [x] `src/modules/inventory/interface/controllers/inventory.controller.ts` — 7 endpoints with JWT + RBAC guards

### Module
- [x] `src/modules/inventory/inventory.module.ts` — TypeORM forFeature + all providers + Cell for cross-module scan

### Tests
- [x] `src/modules/inventory/application/services/__tests__/inventory.service.spec.ts` — createProduct (conflict, uppercase), getProduct (found/not found), listInventory (availableQuantity), scan (PRODUCT match, 404)
- [x] `test/inventory.e2e-spec.ts` — 401 auth enforcement + 400 validation for all 7 endpoints

---

## Stage 6 — Orders Module ✅

> Migrations already exist (010–011). Stage 6 adds TypeORM entities + business logic.

### Entities
- [x] `src/modules/orders/domain/entities/order.entity.ts` — OrderType + OrderStatus enums, STATUS_TRANSITIONS map, TERMINAL_STATUSES set
- [x] `src/modules/orders/domain/entities/order-item.entity.ts` — OrderItemStatus enum, FK to order

### Repositories (tenant-scoped)
- [x] `src/modules/orders/infrastructure/repositories/order.repository.ts` — findAllByTenant (filterable by warehouse/type/status), findById with items relation, existsByOrderNumber
- [x] `src/modules/orders/infrastructure/repositories/order-item.repository.ts` — findByOrder, findById, save, remove

### Application Layer
- [x] `src/modules/orders/application/dto/create-order.dto.ts` — with nested CreateOrderItemDto
- [x] `src/modules/orders/application/dto/update-order.dto.ts` — PartialType excluding warehouseId + items
- [x] `src/modules/orders/application/dto/add-order-item.dto.ts`
- [x] `src/modules/orders/application/dto/order-response.dto.ts` — OrderResponseDto + OrderItemResponseDto
- [x] `src/modules/orders/application/services/orders.service.ts` — listOrders, createOrder (auto-number), updateOrder (DRAFT only), addItem, removeItem, transitionStatus (full state machine), domain events: order.created, order.confirmed, order.shipped, order.delivered, order.cancelled

### Interface Layer
- [x] `src/modules/orders/interface/controllers/orders.controller.ts` — 12 endpoints (CRUD + 8 transition actions) with JWT + RBAC guards

### Module
- [x] `src/modules/orders/orders.module.ts` — TypeORM forFeature + all providers

### Tests
- [x] `src/modules/orders/application/services/__tests__/orders.service.spec.ts` — createOrder (conflict, auto-number), getOrder (found/not found), addItem (DRAFT guard), removeItem (not found), transitionStatus (DRAFT→CONFIRMED, invalid, terminal, PACKED→SHIPPED)
- [x] `test/orders.e2e-spec.ts` — 401 auth enforcement + 400 validation for all endpoints

---

## Stage 7 — Tasks Module ✅

> Migration already exists (012). Stage 7 adds TypeORM entity + business logic.

### Entity
- [x] `src/modules/tasks/domain/entities/task.entity.ts` — TaskType (8 types), TaskStatus (6 states), TaskPriority (4 levels), TASK_TERMINAL_STATUSES, PRIORITY_ORDER

### Repository (tenant-scoped)
- [x] `src/modules/tasks/infrastructure/repositories/task.repository.ts` — findAllByTenant (multi-filter), findMyTasks (worker inbox), findNextPending (priority-ordered dispatcher queue), findOverdue, countActiveByUser

### Application Layer
- [x] `src/modules/tasks/application/dto/create-task.dto.ts` — all nullable FK fields, dueAt ISO string
- [x] `src/modules/tasks/application/dto/assign-task.dto.ts` — userId UUID
- [x] `src/modules/tasks/application/dto/complete-task.dto.ts` — optional notes
- [x] `src/modules/tasks/application/dto/task-response.dto.ts` — full task shape
- [x] `src/modules/tasks/application/services/tasks.service.ts` — listTasks, getTask, getMyTasks, getOverdueTasks, createTask, assignTask, autoAssign (self-serve), startTask, completeTask, failTask, cancelTask; domain events: task.assigned, task.completed

### Interface Layer
- [x] `src/modules/tasks/interface/controllers/tasks.controller.ts` — 11 endpoints (list/get/my/overdue/create/assign/auto-assign/start/complete/fail/cancel) with JWT + RBAC

### Module
- [x] `src/modules/tasks/tasks.module.ts` — TypeORM forFeature + all providers

### Tests
- [x] `src/modules/tasks/application/services/__tests__/tasks.service.spec.ts` — createTask (PENDING/ASSIGNED paths), getTask (found/not found), assignTask (success/wrong state), autoAssign (success/no tasks), startTask, completeTask, cancelTask (terminal guard), getMyTasks
- [x] `test/tasks.e2e-spec.ts` — 401 auth enforcement + 400 validation for all endpoints

---

## Stage 8 — Analytics & Observability ✅

### Infrastructure — Metrics
- [x] `src/infrastructure/metrics/metrics.service.ts` — lightweight in-process Prometheus registry (counter/gauge, no external lib), `renderText()` → Prometheus exposition format
- [x] `src/infrastructure/metrics/metrics.controller.ts` — GET /metrics (public, excluded from Swagger)
- [x] `src/infrastructure/metrics/metrics.module.ts` — @Global(), exports MetricsService
- [x] `src/app.module.ts` updated — MetricsModule imported globally

### Application Layer
- [x] `src/modules/analytics/application/dto/analytics-response.dto.ts` — OrdersSummaryDto, InventorySummaryDto, TasksSummaryDto, WarehouseUtilizationDto, DashboardResponseDto, EmployeeKpiDto, TaskTypeBreakdownDto
- [x] `src/modules/analytics/application/services/analytics.service.ts` — getDashboard (4 parallel SQL queries), getOrdersSummary (last 30 days by status), getInventorySummary (SKUs/units/low-stock/OOS), getTasksSummary (today by status), getWarehouseUtilization (% cells occupied), getEmployeeKpi (completed/failed/avgTime/accuracy/byType breakdown)

### Interface Layer
- [x] `src/modules/analytics/interface/controllers/analytics.controller.ts` — 6 endpoints: dashboard, orders, inventory, tasks, utilization, employees/:userId/kpi

### Module
- [x] `src/modules/analytics/analytics.module.ts` — wired with DataSource (via DatabaseModule global) + AnalyticsService

### Tests
- [x] `src/modules/analytics/application/services/__tests__/analytics.service.spec.ts` — getOrdersSummary (row mapping), getInventorySummary, getTasksSummary, getWarehouseUtilization (zero cells), getDashboard (4 parallel queries), getEmployeeKpi (accuracy calc, null handling)
- [x] `test/analytics.e2e-spec.ts` — /metrics accessibility + 401 auth enforcement for all 6 analytics endpoints
