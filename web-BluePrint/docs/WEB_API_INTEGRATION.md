# WEB API Integration — WMS Platform

**Backend:** NestJS on `http://localhost:3030`
**Auth:** JWT Bearer + refresh token rotation
**Multi-tenant:** `tenantSlug` in login body → `tenantId` in JWT

---

## API Client Setup

```typescript
// src/shared/api/client.ts
// Axios instance with baseURL = NEXT_PUBLIC_API_URL

// src/shared/api/interceptors.ts
// Request: attach Authorization: Bearer <accessToken>
// Response 401: auto-refresh → retry → redirect /login on failure
```

---

## Endpoints Reference

### Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/auth/login` | `{email, password, tenantSlug}` | `TokenResponse` |
| POST | `/auth/refresh` | `{refreshToken}` | `TokenResponse` |
| POST | `/auth/mobile-pin` | `{email, pin, tenantSlug}` | `TokenResponse` |

### Warehouses

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/warehouses` | JWT | List all |
| POST | `/warehouses` | JWT (ADMIN) | Create |
| GET | `/warehouses/:id` | JWT | Detail |
| PATCH | `/warehouses/:id` | JWT (ADMIN) | Update |
| GET | `/warehouses/:id/zones` | JWT | List zones |
| POST | `/warehouses/:id/zones` | JWT (ADMIN) | Create zone |
| GET | `/warehouses/:id/zones/:zoneId/cells` | JWT | List cells |
| POST | `/warehouses/:id/cells/bulk` | JWT (ADMIN) | Bulk create cells |

### Inventory

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/inventory/products` | JWT | All products |
| POST | `/inventory/products` | JWT (MANAGER+) | Create product |
| GET | `/inventory/products/:id` | JWT | Detail |
| PATCH | `/inventory/products/:id` | JWT (MANAGER+) | Update |
| GET | `/inventory?warehouseId=` | JWT | Stock by warehouse |
| GET | `/inventory/scan?barcode=&warehouseId=` | JWT | Resolve barcode |
| POST | `/inventory/move` | JWT (WORKER+) | Move stock |

### Orders

| Method | Path | Notes |
|--------|------|-------|
| GET | `/orders` | Query: warehouseId, type, status |
| POST | `/orders` | Create |
| GET | `/orders/:id` | With items |
| PATCH | `/orders/:id` | DRAFT only |
| POST | `/orders/:id/confirm` | DRAFT → CONFIRMED |
| POST | `/orders/:id/start-picking` | CONFIRMED → IN_PICKING |
| POST | `/orders/:id/mark-picked` | → PICKED |
| POST | `/orders/:id/start-packing` | → IN_PACKING |
| POST | `/orders/:id/mark-packed` | → PACKED |
| POST | `/orders/:id/ship` | → SHIPPED |
| POST | `/orders/:id/deliver` | → DELIVERED |
| POST | `/orders/:id/cancel` | Any non-terminal → CANCELLED |

### Tasks

| Method | Path | Notes |
|--------|------|-------|
| GET | `/tasks` | All (manager view) |
| GET | `/tasks/my` | Current user's tasks |
| GET | `/tasks/overdue` | Overdue tasks |
| POST | `/tasks` | Create |
| PATCH | `/tasks/:id/assign` | Assign to worker |
| POST | `/tasks/auto-assign?warehouseId=` | Self-claim |
| POST | `/tasks/:id/start` | ASSIGNED → IN_PROGRESS |
| POST | `/tasks/:id/complete` | → COMPLETED |
| POST | `/tasks/:id/fail` | → FAILED |
| POST | `/tasks/:id/cancel` | → CANCELLED |

### Analytics

| Method | Path | Query |
|--------|------|-------|
| GET | `/analytics/dashboard` | warehouseId (required) |
| GET | `/analytics/orders` | warehouseId |
| GET | `/analytics/inventory` | warehouseId |
| GET | `/analytics/tasks` | warehouseId |
| GET | `/analytics/utilization` | warehouseId |
| GET | `/analytics/employees/:userId/kpi` | from, to |

---

## React Query Patterns

```typescript
// Query
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: inventoryApi.listProducts,
  })
}

// Mutation with cache invalidation
export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: inventoryApi.createProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

// Dependent query
export function useInventory(warehouseId: string) {
  return useQuery({
    queryKey: ['inventory', warehouseId],
    queryFn: () => inventoryApi.listInventory(warehouseId),
    enabled: !!warehouseId,  // Only runs when warehouseId is set
  })
}
```

---

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3030
```
