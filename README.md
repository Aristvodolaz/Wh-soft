# WMS Platform — Backend

**Production-grade SaaS Warehouse Management System**

> Node.js · NestJS · TypeScript · PostgreSQL · Redis · Docker · Kubernetes

---

## Repository Structure

```
backend-BluePrint/
├── landing-BluePrint/      # Next.js landing page (separate app)
├── src/                    # NestJS backend source
├── test/                   # E2E tests
├── k8s/                    # Kubernetes manifests
├── Dockerfile
├── docker-compose.yml
└── PROJECT_*.md            # Architecture documentation
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### Local Development (Docker)

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env with your values

# 2. Start all services
docker-compose up

# API:    http://localhost:3030
# Docs:   http://localhost:3030/docs
# Health: http://localhost:3030/api/health
```

### Local Development (Node.js)

```bash
# Install dependencies
npm install

# Start PostgreSQL and Redis (via Docker)
docker-compose up postgres redis -d

# Start API in watch mode
npm run start:dev
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Development with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run lint` | ESLint check + auto-fix |
| `npm run test` | Unit tests |
| `npm run test:cov` | Coverage report |
| `npm run test:e2e` | E2E tests |
| `npm run migration:generate` | Generate new migration |
| `npm run migration:run` | Run pending migrations |
| `npm run migration:revert` | Revert last migration |

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check (public) |
| `GET /docs` | Swagger UI (dev only) |
| `POST /api/v1/auth/login` | Login with email+password |
| `POST /api/v1/auth/refresh` | Refresh access token |
| `POST /api/v1/auth/mobile-pin` | Worker PIN authentication |
| `GET /api/v1/warehouses` | List warehouses |
| `GET /api/v1/inventory` | Stock list |
| `GET /api/v1/orders` | Order list |
| `GET /api/v1/tasks/my` | Worker task queue |
| `GET /api/v1/analytics/dashboard` | Dashboard KPIs |

---

## Architecture

| Document | Description |
|----------|-------------|
| [PROJECT_BACKEND_ARCHITECTURE.md](./PROJECT_BACKEND_ARCHITECTURE.md) | System architecture, modules, DB schema |
| [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) | Stage-by-stage development roadmap |
| [PROJECT_TASKS.md](./PROJECT_TASKS.md) | Implementation task checklist |
| [PROJECT_DECISIONS.md](./PROJECT_DECISIONS.md) | Architecture Decision Records (ADR) |

---

## Environment Variables

See [.env.example](./.env.example) for the complete list.

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PORT` | `3030` | Server port |
| `APP_ENV` | `development` | Environment |
| `DB_HOST` | — | PostgreSQL host |
| `DB_USER` | — | PostgreSQL username |
| `DB_PASSWORD` | — | PostgreSQL password |
| `DB_NAME` | — | Database name |
| `REDIS_HOST` | — | Redis host |
| `JWT_SECRET` | — | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | — | Refresh token secret (min 32 chars) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 10 |
| Language | TypeScript 5.4 (strict) |
| Database | PostgreSQL 16 + TypeORM 0.3 |
| Cache | Redis 7 + ioredis |
| Auth | JWT + Passport |
| API Docs | Swagger / OpenAPI 3 |
| Container | Docker (multi-stage) |
| Orchestration | Kubernetes |
| Testing | Jest + Supertest |
