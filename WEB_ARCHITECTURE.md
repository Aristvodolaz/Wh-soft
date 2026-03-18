# WEB Architecture — WMS Platform Frontend

**Version:** 1.0 (Stage 1)
**Stack:** Next.js 14 (App Router) · TypeScript · TailwindCSS · TanStack Query · Zustand · Axios

---

## Directory Structure

```
src/
├── app/                         # Next.js App Router
│   ├── layout.tsx               # Root layout (Providers, Toaster)
│   ├── page.tsx                 # Redirects → /dashboard
│   ├── providers.tsx            # QueryClient + Toaster
│   ├── (auth)/
│   │   └── login/page.tsx      # Login page (public)
│   └── (dashboard)/
│       ├── layout.tsx           # Auth guard + AppLayout wrapper
│       ├── dashboard/page.tsx
│       ├── warehouses/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── inventory/
│       │   ├── products/page.tsx
│       │   └── page.tsx         # Stock levels
│       ├── orders/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── tasks/page.tsx
│       ├── employees/page.tsx
│       ├── analytics/page.tsx
│       ├── integrations/page.tsx
│       └── settings/page.tsx
│
├── widgets/                     # Page-level composed UI blocks (no business logic)
│   ├── layout/
│   │   ├── sidebar.tsx          # Fixed 240px nav, collapsible to 56px
│   │   ├── topbar.tsx           # Header with warehouse switcher + user menu
│   │   └── app-layout.tsx      # Sidebar + Topbar + main
│   ├── dashboard/
│   │   ├── kpi-section.tsx      # 4 KPI cards grid
│   │   ├── orders-chart.tsx     # Line chart (recharts)
│   │   └── active-tasks-panel.tsx
│   ├── warehouse/
│   │   └── warehouse-table.tsx
│   ├── inventory/
│   │   └── product-table.tsx    # Filterable, paginated, with search
│   ├── orders/
│   │   └── orders-table.tsx
│   └── tasks/
│       └── tasks-table.tsx
│
├── features/                    # Business features — API hooks + forms
│   ├── auth/
│   │   ├── api/auth-api.ts      # Raw axios calls (login/refresh)
│   │   ├── store/auth-store.ts  # Zustand (persisted JWT + warehouse selection)
│   │   └── components/login-form.tsx
│   ├── warehouses/api/
│   │   ├── warehouse-api.ts
│   │   └── use-warehouses.ts    # TanStack Query hooks
│   ├── inventory/api/
│   │   ├── inventory-api.ts
│   │   └── use-inventory.ts
│   ├── orders/api/
│   │   ├── orders-api.ts
│   │   └── use-orders.ts
│   ├── tasks/api/
│   │   ├── tasks-api.ts
│   │   └── use-tasks.ts
│   └── analytics/api/
│       ├── analytics-api.ts
│       └── use-analytics.ts
│
├── entities/                    # Domain TypeScript types (mirrors backend DTOs)
│   ├── auth/types.ts
│   ├── warehouse/types.ts
│   ├── inventory/types.ts
│   ├── order/types.ts
│   ├── task/types.ts
│   └── analytics/types.ts
│
└── shared/
    ├── api/
    │   ├── client.ts            # Axios instance (baseURL, timeout)
    │   ├── interceptors.ts      # Token attachment + 401 refresh + retry
    │   └── index.ts
    ├── config/
    │   └── env.ts               # Typed env vars
    ├── lib/
    │   ├── cn.ts                # clsx + tailwind-merge
    │   ├── format.ts            # Date, number formatters
    │   └── storage.ts           # localStorage wrapper for tokens
    └── ui/                      # Base component library
        ├── button.tsx
        ├── input.tsx
        ├── select.tsx
        ├── search-input.tsx
        ├── table.tsx
        ├── badge.tsx
        ├── card.tsx
        ├── kpi-card.tsx
        ├── modal.tsx
        ├── drawer.tsx
        ├── skeleton.tsx
        ├── spinner.tsx
        ├── pagination.tsx
        └── empty-state.tsx
```

---

## Layer Responsibilities

| Layer | Responsibility | Can import from |
|-------|---------------|-----------------|
| `app/` | Routing, page composition | widgets, features, entities, shared |
| `widgets/` | Composed page sections | features, entities, shared |
| `features/` | API hooks, forms, feature state | entities, shared |
| `entities/` | TypeScript types only | (nothing) |
| `shared/` | Reusable utils and UI | (nothing above shared) |

---

## Auth Flow

1. User submits login form → `POST /auth/login` → receives `accessToken` + `refreshToken`
2. Zustand store saves tokens + decodes JWT payload (role, tenantId)
3. localStorage also stores tokens (via `storage.ts`)
4. Axios request interceptor attaches `Authorization: Bearer <token>` to every request
5. On 401: interceptor calls `POST /auth/refresh`, retries original request once
6. On refresh failure: clears tokens, redirects to `/login`
7. Route guard in `(dashboard)/layout.tsx` checks `isAuthenticated()` before rendering

---

## State Management Strategy

- **Server state** (API data): TanStack Query (caching, background refetch, mutations)
- **Client/UI state** (auth, selected warehouse): Zustand (persisted)
- **Form state**: react-hook-form + zod validation
- **No Redux** — Zustand is sufficient for this scale

---

## Performance

- All dashboard pages are Client Components (real-time data)
- Static pages (login) are Server Components
- TanStack Query caches for 30s, auto-refetches dashboard every 30s
- Lazy loading via Next.js App Router automatic code splitting
- Skeleton loaders prevent layout shift on data load
