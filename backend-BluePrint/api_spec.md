# API Specification — WMS Platform
**Document:** api_spec.md  
**Version:** v1  
**Format:** REST / JSON  
**Base URL:** `https://api.wmsplatform.io/api/v1`

---

## 1. Конвенции API

### 1.1 Общие правила

- Версионирование в URL: `/api/v1/`
- Формат дат: ISO 8601 (`2025-02-08T09:15:00Z`)
- Пагинация: `?page=1&limit=25`
- Сортировка: `?sort=created_at:desc`
- Фильтры: `?status=active&warehouseId=uuid`
- Язык ошибок: английский (коды) + ru/en описание

### 1.2 Стандартный ответ

```json
// Успех (список)
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 247,
    "totalPages": 10
  }
}

// Успех (объект)
{ "data": { "id": "...", "...": "..." } }

// Ошибка
{
  "error": {
    "code": "CELL_CAPACITY_EXCEEDED",
    "message": "Cell A-01-03-02 cannot accommodate 50 units (available: 12)",
    "details": { "cellId": "uuid", "available": 12, "requested": 50 }
  }
}
```

### 1.3 HTTP Статусы

| Код | Ситуация |
|-----|---------|
| 200 | OK — успешный GET, PUT |
| 201 | Created — успешный POST |
| 204 | No Content — успешный DELETE |
| 400 | Bad Request — невалидные данные |
| 401 | Unauthorized — нет/плохой JWT |
| 403 | Forbidden — нет прав |
| 404 | Not Found |
| 409 | Conflict — дубликат, конфликт |
| 422 | Unprocessable — бизнес-правило нарушено |
| 429 | Too Many Requests — rate limit |
| 500 | Internal Server Error |

---

## 2. Authentication

### POST /auth/login
```json
Request:
{ "email": "admin@company.com", "password": "secret" }

Response 200:
{
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiJ9...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expiresIn": 900,
    "user": {
      "id": "uuid", "email": "admin@company.com",
      "role": "WAREHOUSE_ADMIN", "tenantId": "uuid"
    }
  }
}
```

### POST /auth/refresh
```json
Request: { "refreshToken": "..." }
Response 200: { "data": { "accessToken": "...", "expiresIn": 900 } }
```

### POST /auth/mobile-pin
```json
// Для мобильного приложения
Request: { "employeeNumber": "EMP-001", "pin": "1234", "deviceId": "android-uuid" }
Response 200: { "data": { "accessToken": "...", "employee": {...} } }
```

---

## 3. Warehouses API

### GET /warehouses
```
Headers: Authorization: Bearer <token>
Query: ?page=1&limit=25

Response 200:
{
  "data": [
    {
      "id": "wh-uuid-1",
      "name": "Москва-Бутово",
      "address": "Бутово, ул. Складская, 15",
      "status": "active",
      "stats": { "totalCells": 480, "occupiedCells": 351, "occupancyPct": 73.1 }
    }
  ],
  "meta": { "total": 3, "page": 1, "limit": 25 }
}
```

### POST /warehouses
```json
Request:
{
  "name": "СПб-Пулково",
  "address": "г. Санкт-Петербург, Пулковское ш. 40",
  "timezone": "Europe/Moscow",
  "settings": { "defaultPickingStrategy": "FIFO" }
}

Response 201:
{ "data": { "id": "new-uuid", "name": "СПб-Пулково", ... } }
```

### POST /warehouses/:warehouseId/cells/bulk
```json
// Массовое создание ячеек
Request:
{
  "zoneId": "zone-uuid",
  "template": "A-{row}-{rack}-{shelf}",
  "rows": 10, "racks": 6, "shelves": 4,
  "cellDefaults": {
    "capacityUnits": 100,
    "capacityWeightKg": 500,
    "widthCm": 120, "heightCm": 200, "depthCm": 80
  }
}

Response 201:
{ "data": { "created": 240, "cells": [ { "id": "...", "code": "A-01-01-01" }, ... ] } }
```

---

## 4. Inventory API

### GET /inventory
```
Query: ?warehouseId=uuid&sku=MILK-001&cellId=uuid&lowStock=true&page=1

Response 200:
{
  "data": [
    {
      "id": "inv-uuid",
      "warehouseId": "wh-uuid",
      "cell": { "id": "cell-uuid", "code": "A-01-03-02" },
      "product": { "id": "prod-uuid", "sku": "MILK-001", "name": "Молоко 3.2% 1л" },
      "quantity": 48,
      "reservedQuantity": 12,
      "availableQuantity": 36,
      "batchNumber": "BATCH-2025-001",
      "expiryDate": "2025-03-15",
      "updatedAt": "2025-02-08T09:15:00Z"
    }
  ]
}
```

### GET /inventory/scan
```
// Сканирование — главный endpoint мобильного приложения
Query: ?barcode=4607100931867&warehouseId=uuid
  OR   ?qr=eyJ0eXBlIjoiQ0VMTCIsImNlbGxJZCI6InV1aWQifQ==

Response 200:
{
  "data": {
    "type": "PRODUCT",
    "product": {
      "id": "prod-uuid", "sku": "MILK-001",
      "name": "Молоко 3.2% 1л", "barcode": "4607100931867"
    },
    "inventory": [
      {
        "cellCode": "A-01-03-02", "quantity": 36,
        "batchNumber": "BATCH-2025-001", "expiryDate": "2025-03-15"
      }
    ],
    "totalAvailable": 36
  }
}

// Если QR-код ячейки:
{
  "data": {
    "type": "CELL",
    "cell": { "id": "cell-uuid", "code": "A-01-03-02", "status": "active" },
    "inventory": [ { "sku": "MILK-001", "name": "...", "quantity": 24 } ]
  }
}
```

### POST /inventory/move
```json
Request:
{
  "sourceCellId": "cell-uuid-1",
  "targetCellId": "cell-uuid-2",
  "sku": "MILK-001",
  "quantity": 12,
  "taskId": "task-uuid",
  "note": "Перемещение для оптимизации"
}

Response 200:
{
  "data": {
    "movementId": "movement-uuid",
    "sourceCell": { "code": "A-01-03-02", "remainingQty": 24 },
    "targetCell": { "code": "B-02-01-01", "newQty": 12 }
  }
}
```

### POST /inventory/adjust
```json
// Корректировка остатков (инвентаризация)
Request:
{
  "cellId": "cell-uuid",
  "sku": "MILK-001",
  "actualQuantity": 46,
  "reason": "STOCKTAKE",
  "note": "Инвентаризация 08.02.2025, плановая",
  "stocktakeSessionId": "session-uuid"
}

Response 200:
{
  "data": {
    "movementId": "uuid",
    "previousQty": 48,
    "newQty": 46,
    "delta": -2
  }
}
```

---

## 5. Orders API

### GET /orders
```
Query: ?type=OUTBOUND&status=confirmed&warehouseId=uuid&dateFrom=2025-02-01

Response 200:
{
  "data": [
    {
      "id": "order-uuid",
      "orderNumber": "SO-2847",
      "type": "OUTBOUND",
      "status": "IN_PROGRESS",
      "source": "WILDBERRIES",
      "externalId": "wb-12345",
      "itemsCount": 15,
      "pickedCount": 8,
      "createdAt": "2025-02-08T09:00:00Z",
      "requiredShipBy": "2025-02-08T14:00:00Z"
    }
  ]
}
```

### POST /orders
```json
Request:
{
  "type": "OUTBOUND",
  "source": "MANUAL",
  "warehouseId": "wh-uuid",
  "items": [
    { "sku": "MILK-001", "quantity": 6, "unitPrice": 89.90 },
    { "sku": "KEFIR-001", "quantity": 3, "unitPrice": 75.50 }
  ],
  "shippingMethod": "CDEK",
  "notes": "Хрупкое, не кантовать"
}

Response 201:
{
  "data": {
    "id": "order-uuid",
    "orderNumber": "SO-2848",
    "status": "DRAFT",
    "items": [...]
  }
}
```

### POST /orders/:id/confirm
```json
// Подтвердить заказ — зарезервировать остатки, создать задачи
Request: {}

Response 200:
{
  "data": {
    "orderId": "order-uuid",
    "status": "CONFIRMED",
    "pickingTasks": [
      { "taskId": "task-uuid", "type": "PICKING", "assignedTo": null }
    ],
    "reservedInventory": [
      { "sku": "MILK-001", "quantity": 6, "cellCode": "A-01-03-02" }
    ]
  }
}
```

### GET /orders/:id/picking-list
```json
// Оптимизированный маршрут сборки
Response 200:
{
  "data": {
    "orderId": "order-uuid",
    "route": [
      {
        "step": 1,
        "cellCode": "A-01-03-02",
        "items": [{ "sku": "MILK-001", "quantity": 6, "name": "Молоко 3.2% 1л" }]
      },
      {
        "step": 2,
        "cellCode": "A-02-01-01",
        "items": [{ "sku": "KEFIR-001", "quantity": 3, "name": "Кефир 1% 0.9л" }]
      }
    ],
    "estimatedTimeMin": 8
  }
}
```

---

## 6. Tasks API

### GET /tasks/my
```
// Задачи текущего сотрудника (mobile)
Query: ?status=pending&limit=20

Response 200:
{
  "data": [
    {
      "id": "task-uuid",
      "type": "PICKING",
      "status": "IN_PROGRESS",
      "priority": 9,
      "orderId": "order-uuid",
      "orderNumber": "SO-2847",
      "progress": { "completed": 8, "total": 15 },
      "instructions": { "route": [...] }
    }
  ]
}
```

### PATCH /tasks/:id/complete
```json
Request:
{
  "completedItems": [
    { "sku": "MILK-001", "quantity": 6, "cellId": "cell-uuid" }
  ],
  "note": "Одна позиция заменена"
}

Response 200:
{ "data": { "taskId": "uuid", "status": "COMPLETED", "completedAt": "..." } }
```

---

## 7. Analytics API

### GET /analytics/dashboard
```
Query: ?warehouseId=uuid&period=today

Response 200:
{
  "data": {
    "kpi": {
      "ordersToday": 247, "ordersTrend": 15.3,
      "activeReceiving": 12,
      "openTasks": 38,
      "warehouseOccupancyPct": 73.1
    },
    "ordersChart": {
      "labels": ["01.02", "02.02", ...],
      "received": [45, 52, ...],
      "shipped": [38, 49, ...]
    }
  }
}
```

### GET /analytics/employees/:employeeId/kpi
```
Query: ?period=month&year=2025&month=2

Response 200:
{
  "data": {
    "employeeId": "uuid",
    "name": "Алексей Петров",
    "period": "2025-02",
    "kpi": {
      "tasksCompleted": 342,
      "linesPerHour": 48.3,
      "accuracyPct": 99.1,
      "activeHours": 156,
      "idleHours": 12
    },
    "daily": [ { "date": "2025-02-01", "tasks": 18, "lph": 52.1 }, ... ]
  }
}
```

---

## 8. Rate Limits

| Endpoint группа | Limit | Window |
|----------------|-------|--------|
| Auth endpoints | 10 req | 1 min |
| GET /inventory/scan | 300 req | 1 min |
| POST /inventory/move | 120 req | 1 min |
| GET endpoints (general) | 600 req | 1 min |
| POST/PUT (general) | 120 req | 1 min |
| Analytics | 60 req | 1 min |
| Integrations sync | 30 req | 1 min |

Headers в ответе:
```
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 543
X-RateLimit-Reset: 1707382860
```

---

## 9. Webhooks

### Доступные события

| Event | Trigger |
|-------|---------|
| `order.created` | Новый заказ создан |
| `order.status_changed` | Статус заказа изменён |
| `order.shipped` | Заказ отгружен |
| `inventory.low_stock` | Товар ниже min_stock_level |
| `inventory.updated` | Остатки изменились |
| `task.assigned` | Задача назначена сотруднику |
| `task.completed` | Задача выполнена |
| `stocktake.completed` | Инвентаризация завершена |

### Payload формат

```json
{
  "event": "order.shipped",
  "timestamp": "2025-02-08T14:30:00Z",
  "tenantId": "tenant-uuid",
  "data": {
    "orderId": "order-uuid",
    "orderNumber": "SO-2847",
    "trackingNumber": "WB-1234567890",
    "shippedAt": "2025-02-08T14:28:00Z"
  }
}
```

Подпись: `X-WMS-Signature: sha256=<hmac_signature>`

---

*Документ: api_spec.md | WMS Platform API v1*
