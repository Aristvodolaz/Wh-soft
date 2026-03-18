# Backend Book — WMS Platform
**Document:** backend_book.md  
**Version:** 1.0  
**Audience:** Backend Engineers

---

## 1. Архитектурные Принципы

### 1.1 Clean Architecture

Бизнес-логика не зависит от фреймворков, БД или HTTP. Зависимости направлены строго внутрь:

```
Frameworks & Drivers (HTTP, DB, Queue)
    ↓ depends on
Interface Adapters (Controllers, Repos, Presenters)
    ↓ depends on
Application (Use Cases, DTOs, Ports)
    ↓ depends on
Domain (Entities, Value Objects, Domain Events)
```

**Правила:**
- Domain не импортирует ничего из NestJS, TypeORM, Express
- Use Case не знает о HTTP-запросах
- Repository — только интерфейс в Application, реализация в Infrastructure
- Domain Events публикуются через EventBus, не через прямые вызовы

### 1.2 Domain-Driven Design (DDD)

**Bounded Contexts:**

| Контекст | Домен | Агрегаты |
|----------|-------|----------|
| Warehouse | Физическая структура склада | Warehouse, Zone, Cell |
| Inventory | Учёт товаров и движений | InventoryItem, Batch |
| Orders | Заказы и фулфилмент | Order, OrderItem |
| Employees | Персонал и задачи | Employee, Task, Shift |
| Analytics | Агрегированные данные | — (CQRS Read Models) |

**Value Objects:**
- `CellCode` — валидирует формат кода ячейки (A-01-03-02)
- `SKU` — нормализует и валидирует SKU
- `Quantity` — всегда целое, >= 0
- `Money` — decimal + currency, без float
- `DateRange` — иммутабельный интервал дат

### 1.3 Event-Driven Architecture

Все изменения состояния публикуют Domain Events:

```typescript
// Domain Event Base
export abstract class DomainEvent {
  readonly eventId: string = uuid();
  readonly occurredAt: Date = new Date();
  abstract readonly eventName: string;
}

// Example Event
export class InventoryMovedEvent extends DomainEvent {
  readonly eventName = 'inventory.moved';
  constructor(
    public readonly sku: string,
    public readonly sourceCellId: string,
    public readonly targetCellId: string,
    public readonly quantity: number,
    public readonly performedBy: string,
    public readonly warehouseId: string,
  ) { super(); }
}
```

---

## 2. Структура Проекта

```
src/
├── app.module.ts
├── main.ts                         # Bootstrap, Swagger, pipes
├── config/
│   ├── app.config.ts               # env vars, зависит от @nestjs/config
│   ├── database.config.ts
│   ├── kafka.config.ts
│   └── redis.config.ts
│
├── shared/
│   ├── domain/
│   │   ├── domain-event.base.ts
│   │   ├── aggregate-root.base.ts
│   │   ├── value-object.base.ts
│   │   └── entity.base.ts
│   ├── exceptions/
│   │   ├── domain.exception.ts
│   │   ├── not-found.exception.ts
│   │   └── business-rule.exception.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── tenant.decorator.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── tenant.guard.ts
│   ├── filters/
│   │   └── global-exception.filter.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── audit.interceptor.ts
│   └── utils/
│       ├── pagination.util.ts
│       └── date.util.ts
│
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── domain/
│   │   ├── application/
│   │   │   └── use-cases/
│   │   │       ├── login.use-case.ts
│   │   │       └── refresh-token.use-case.ts
│   │   └── infrastructure/
│   │       ├── strategies/
│   │       │   ├── jwt.strategy.ts
│   │       │   └── local.strategy.ts
│   │       └── controllers/
│   │           └── auth.controller.ts
│   │
│   ├── warehouse/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── warehouse.entity.ts
│   │   │   │   ├── zone.entity.ts
│   │   │   │   └── cell.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   └── cell-code.vo.ts
│   │   │   └── events/
│   │   │       └── cell-created.event.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── create-warehouse.use-case.ts
│   │   │   │   ├── create-cell.use-case.ts
│   │   │   │   └── bulk-create-cells.use-case.ts
│   │   │   ├── ports/
│   │   │   │   └── warehouse.repository.port.ts
│   │   │   └── dto/
│   │   │       ├── create-warehouse.dto.ts
│   │   │       └── create-cell.dto.ts
│   │   ├── infrastructure/
│   │   │   ├── repositories/
│   │   │   │   └── warehouse.repository.ts
│   │   │   ├── typeorm/
│   │   │   │   ├── warehouse.orm-entity.ts
│   │   │   │   └── cell.orm-entity.ts
│   │   │   └── controllers/
│   │   │       └── warehouse.controller.ts
│   │   └── warehouse.module.ts
│   │
│   ├── inventory/          # аналогичная структура
│   ├── orders/
│   ├── employees/
│   ├── tasks/
│   ├── analytics/
│   ├── integrations/
│   └── billing/
│
└── infrastructure/
    ├── database/
    │   ├── migrations/
    │   └── seeds/
    ├── kafka/
    │   ├── kafka.module.ts
    │   └── event-bus.service.ts
    ├── redis/
    │   └── redis.module.ts
    └── elasticsearch/
        └── search.module.ts
```

---

## 3. Ключевые Паттерны

### 3.1 Aggregate Root

```typescript
// shared/domain/aggregate-root.base.ts
export abstract class AggregateRoot<T> {
  private _domainEvents: DomainEvent[] = [];
  protected readonly props: T;

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}

// warehouse/domain/entities/cell.entity.ts
export class Cell extends AggregateRoot<CellProps> {
  static create(props: CreateCellProps): Cell {
    const cell = new Cell({ ...props, status: CellStatus.ACTIVE });
    cell.addDomainEvent(new CellCreatedEvent(cell.id, props.warehouseId));
    return cell;
  }

  addInventory(quantity: number): void {
    if (this.props.currentLoad + quantity > this.props.capacity) {
      throw new DomainException(`Cell ${this.props.code} capacity exceeded`);
    }
    this.props.currentLoad += quantity;
  }
}
```

### 3.2 Repository Implementation (TypeORM)

```typescript
// warehouse/infrastructure/repositories/warehouse.repository.ts
@Injectable()
export class WarehouseRepository implements WarehouseRepositoryPort {
  constructor(
    @InjectRepository(WarehouseOrmEntity)
    private readonly repo: Repository<WarehouseOrmEntity>,
  ) {}

  async findById(id: string): Promise<Warehouse | null> {
    const entity = await this.repo.findOne({
      where: { id },
      relations: ['zones', 'zones.cells'],
    });
    return entity ? WarehouseMapper.toDomain(entity) : null;
  }

  async save(warehouse: Warehouse): Promise<void> {
    const entity = WarehouseMapper.toOrm(warehouse);
    await this.repo.save(entity);
    // Publish domain events after successful save
    const events = warehouse.pullDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }
  }
}
```

### 3.3 Use Case с транзакцией

```typescript
// inventory/application/use-cases/move-inventory.use-case.ts
@Injectable()
export class MoveInventoryUseCase {
  constructor(
    private readonly inventoryRepo: InventoryRepositoryPort,
    private readonly cellRepo: CellRepositoryPort,
    private readonly eventBus: EventBusService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(cmd: MoveInventoryCommand): Promise<MoveInventoryResult> {
    return this.dataSource.transaction(async (manager) => {
      const sourceCell = await this.cellRepo.findById(cmd.sourceCellId, manager);
      const targetCell = await this.cellRepo.findById(cmd.targetCellId, manager);
      
      if (!sourceCell) throw new NotFoundException('Source cell not found');
      if (!targetCell) throw new NotFoundException('Target cell not found');
      if (!targetCell.canAccommodate(cmd.quantity)) {
        throw new BusinessRuleException('CELL_CAPACITY_EXCEEDED');
      }

      const items = await this.inventoryRepo.findByCellAndSku(
        cmd.sourceCellId, cmd.sku, manager
      );
      if (!items || items.quantity < cmd.quantity) {
        throw new BusinessRuleException('INSUFFICIENT_INVENTORY');
      }

      items.move(cmd.quantity, cmd.targetCellId);
      sourceCell.removeLoad(cmd.quantity);
      targetCell.addLoad(cmd.quantity);

      await this.inventoryRepo.save(items, manager);
      await this.cellRepo.saveMany([sourceCell, targetCell], manager);

      await this.eventBus.publish(new InventoryMovedEvent({
        sku: cmd.sku,
        sourceCellId: cmd.sourceCellId,
        targetCellId: cmd.targetCellId,
        quantity: cmd.quantity,
        performedBy: cmd.performedBy,
        warehouseId: cmd.warehouseId,
      }));

      return { movementId: items.lastMovementId, success: true };
    });
  }
}
```

---

## 4. Code Conventions

### 4.1 Именование

| Элемент | Конвенция | Пример |
|---------|-----------|--------|
| Классы | PascalCase | `MoveInventoryUseCase` |
| Интерфейсы | PascalCase + Port/Interface | `InventoryRepositoryPort` |
| Файлы | kebab-case | `move-inventory.use-case.ts` |
| Переменные | camelCase | `warehouseId`, `cellCode` |
| Константы | UPPER_SNAKE | `MAX_CELL_CAPACITY` |
| Enum значения | UPPER_SNAKE | `CellStatus.ACTIVE` |
| Database columns | snake_case | `warehouse_id`, `created_at` |
| API endpoints | kebab-case | `/api/v1/inventory-movements` |
| Kafka topics | dot.notation | `inventory.moved`, `order.created` |

### 4.2 Error Handling

```typescript
// Hierarchy
AppException extends Error
  DomainException extends AppException        // Бизнес-правила
  NotFoundException extends AppException      // 404
  ConflictException extends AppException      // 409
  BusinessRuleException extends AppException  // 422

// Usage
throw new DomainException('CELL_CAPACITY_EXCEEDED', {
  cellId: cell.id,
  available: cell.availableCapacity,
  requested: quantity,
});

// Global Filter maps to HTTP codes
DomainException      → 400
NotFoundException    → 404
ConflictException    → 409
BusinessRuleException → 422
Unhandled            → 500
```

### 4.3 Тестирование

```
Пирамида тестов:
  E2E (10%)    — Playwright, критические user flows
  Integration (30%) — Supertest + реальная БД
  Unit (60%)   — Jest, domain entities, use cases

Покрытие:
  Domain layer:       95%+
  Application layer:  85%+
  Infrastructure:     60%+
```

---

## 5. Multi-tenancy

Стратегия: **Schema-per-tenant** в PostgreSQL.

```sql
-- Создание схемы при регистрации тенанта
CREATE SCHEMA tenant_abc123;
SET search_path TO tenant_abc123, public;

-- Все таблицы создаются в схеме тенанта
-- Таблицы platform-уровня (tenants, billing) — в public схеме
```

```typescript
// Middleware устанавливает search_path на каждый запрос
async use(req: Request, res: Response, next: NextFunction) {
  const schema = `tenant_${req.user.tenantId.replace(/-/g, '_')}`;
  await this.dataSource.query(`SET search_path TO ${schema}, public`);
  next();
}
```

---

*Документ: backend_book.md | WMS Platform v1.0*
