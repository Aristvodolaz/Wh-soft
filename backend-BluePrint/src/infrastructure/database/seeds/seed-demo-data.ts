/**
 * Demo data seeder — full WMS scenario for screenshots and demos.
 * Idempotent via marker order DEMO-SEED-MARKER-v2.
 */

import * as bcrypt from 'bcryptjs';
import { QueryRunner } from 'typeorm';

const DEMO_MARKER = 'DEMO-SEED-MARKER-v2';

interface DemoContext {
  tenantId: string;
  warehouseId: string;
  storageZoneId: string;
  userIds: {
    admin: string;
    manager: string;
    worker: string;
    workers: string[];
    analyst: string;
  };
}

interface ZoneSeed {
  code: string;
  name: string;
  type: string;
}

interface CellSeed {
  zoneCode: string;
  code: string;
  barcode: string;
  aisle: string;
  bay: string;
  level: string;
  occupied: boolean;
}

interface ProductSeed {
  sku: string;
  name: string;
  unit: string;
  barcode: string;
  weight: number;
  minStock: number;
  reorder: number;
  description: string;
}

interface OrderSeed {
  orderNumber: string;
  type: string;
  status: string;
  customerName: string;
  customerEmail: string;
  priority: number;
  items: { sku: string; qty: number; itemStatus: string }[];
}

interface TaskSeed {
  type: string;
  status: string;
  priority: string;
  title: string;
  description: string;
  workerIndex?: number;
  assignTo?: 'manager' | null;
  orderNumber?: string;
  productSku?: string;
  quantity?: number;
  completed?: boolean;
  failed?: boolean;
  today?: boolean;
}

const EXTRA_ZONES: ZoneSeed[] = [
  { code: 'RC-01', name: 'Зона приёмки', type: 'RECEIVING' },
  { code: 'SH-01', name: 'Зона отгрузки', type: 'SHIPPING' },
  { code: 'ST-01', name: 'Буферная зона', type: 'STAGING' },
  { code: 'RT-01', name: 'Зона возвратов', type: 'RETURNS' },
];

function buildStorageCells(): CellSeed[] {
  const cells: CellSeed[] = [];
  let idx = 1;
  for (const aisle of ['A', 'B', 'C', 'D', 'E']) {
    for (let bay = 1; bay <= 4; bay++) {
      for (let level = 1; level <= 2; level++) {
        const code = `${aisle}-${String(bay).padStart(2, '0')}-${String(level).padStart(2, '0')}`;
        cells.push({
          zoneCode: 'GS-01',
          code,
          barcode: `20001${String(idx).padStart(6, '0')}`,
          aisle,
          bay: String(bay).padStart(2, '0'),
          level: String(level).padStart(2, '0'),
          occupied: idx <= 32,
        });
        idx++;
      }
    }
  }
  return cells;
}

const CELLS: CellSeed[] = [
  ...buildStorageCells(),
  { zoneCode: 'RC-01', code: 'RC-01', barcode: '200020000001', aisle: 'RC', bay: '01', level: '01', occupied: true },
  { zoneCode: 'RC-01', code: 'RC-02', barcode: '200020000002', aisle: 'RC', bay: '02', level: '01', occupied: true },
  { zoneCode: 'RC-01', code: 'RC-03', barcode: '200020000003', aisle: 'RC', bay: '03', level: '01', occupied: false },
  { zoneCode: 'SH-01', code: 'SH-01', barcode: '200030000001', aisle: 'SH', bay: '01', level: '01', occupied: true },
  { zoneCode: 'SH-01', code: 'SH-02', barcode: '200030000002', aisle: 'SH', bay: '02', level: '01', occupied: false },
  { zoneCode: 'ST-01', code: 'ST-01', barcode: '200040000001', aisle: 'ST', bay: '01', level: '01', occupied: true },
  { zoneCode: 'ST-01', code: 'ST-02', barcode: '200040000002', aisle: 'ST', bay: '02', level: '01', occupied: false },
];

const PRODUCTS: ProductSeed[] = [
  { sku: 'ELEC-001', name: 'Ноутбук Dell Latitude 5540', unit: 'PIECE', barcode: '4600000000001', weight: 1.65, minStock: 5, reorder: 10, description: '15.6", Intel Core i5, 16GB RAM' },
  { sku: 'ELEC-002', name: 'Монитор Samsung 27"', unit: 'PIECE', barcode: '4600000000002', weight: 5.2, minStock: 3, reorder: 8, description: 'IPS, 2560×1440, 75Hz' },
  { sku: 'ELEC-003', name: 'Клавиатура Logitech K380', unit: 'PIECE', barcode: '4600000000003', weight: 0.42, minStock: 10, reorder: 20, description: 'Bluetooth, компактная' },
  { sku: 'ELEC-004', name: 'USB-C кабель 2м', unit: 'PIECE', barcode: '4600000000004', weight: 0.08, minStock: 50, reorder: 100, description: '100W, PD 3.0' },
  { sku: 'FOOD-001', name: 'Вода Aqua Carpatica 1.5л', unit: 'LITER', barcode: '4600000000005', weight: 1.5, minStock: 100, reorder: 200, description: 'Горная вода, 6 бут. в уп.' },
  { sku: 'FOOD-002', name: 'Кофе Jacobs 500г', unit: 'PIECE', barcode: '4600000000006', weight: 0.5, minStock: 20, reorder: 40, description: 'Молотый, средняя обжарка' },
  { sku: 'CLOTH-001', name: 'Футболка Cotton Basic M', unit: 'PIECE', barcode: '4600000000007', weight: 0.18, minStock: 15, reorder: 30, description: '100% хлопок, белая' },
  { sku: 'CLOTH-002', name: 'Джинсы Slim Fit 32', unit: 'PIECE', barcode: '4600000000008', weight: 0.55, minStock: 8, reorder: 15, description: 'Тёмно-синие, stretch' },
  { sku: 'TOOL-001', name: 'Дрель Bosch GSB 13', unit: 'PIECE', barcode: '4600000000009', weight: 1.8, minStock: 2, reorder: 5, description: '600W, ударная' },
  { sku: 'TOOL-002', name: 'Набор бит 32 шт', unit: 'BOX', barcode: '4600000000010', weight: 0.35, minStock: 5, reorder: 12, description: 'Cr-V сталь, магнитный держатель' },
  { sku: 'OFFICE-001', name: 'Бумага A4 500 л', unit: 'BOX', barcode: '4600000000011', weight: 2.5, minStock: 20, reorder: 40, description: 'Офисная бумага, 80 г/м²' },
  { sku: 'CHEM-001', name: 'Средство для мытья полов 5л', unit: 'LITER', barcode: '4600000000012', weight: 5.0, minStock: 10, reorder: 25, description: 'Концентрат, нейтральный pH' },
];

const INVENTORY: { sku: string; cellCode: string; zoneCode: string; qty: number; reserved: number; lot?: string }[] = [
  { sku: 'ELEC-001', cellCode: 'A-01-01', zoneCode: 'GS-01', qty: 24, reserved: 2 },
  { sku: 'ELEC-002', cellCode: 'A-01-02', zoneCode: 'GS-01', qty: 18, reserved: 1 },
  { sku: 'ELEC-003', cellCode: 'A-02-01', zoneCode: 'GS-01', qty: 45, reserved: 0 },
  { sku: 'ELEC-004', cellCode: 'A-02-02', zoneCode: 'GS-01', qty: 320, reserved: 10 },
  { sku: 'FOOD-001', cellCode: 'B-01-01', zoneCode: 'GS-01', qty: 480, reserved: 24, lot: 'LOT-2026-041' },
  { sku: 'FOOD-002', cellCode: 'B-01-02', zoneCode: 'GS-01', qty: 86, reserved: 0, lot: 'LOT-2026-038' },
  { sku: 'CLOTH-001', cellCode: 'B-02-01', zoneCode: 'GS-01', qty: 3, reserved: 0 },
  { sku: 'CLOTH-002', cellCode: 'C-01-01', zoneCode: 'GS-01', qty: 12, reserved: 2 },
  { sku: 'TOOL-001', cellCode: 'C-01-02', zoneCode: 'GS-01', qty: 7, reserved: 1 },
  { sku: 'TOOL-002', cellCode: 'RC-01', zoneCode: 'RC-01', qty: 28, reserved: 0 },
  { sku: 'OFFICE-001', cellCode: 'D-03-01', zoneCode: 'GS-01', qty: 8, reserved: 0 },
  { sku: 'CHEM-001', cellCode: 'E-04-02', zoneCode: 'GS-01', qty: 0, reserved: 0 },
];

const OUTBOUND_ORDERS: OrderSeed[] = [
  { orderNumber: 'ORD-2026-0001', type: 'OUTBOUND', status: 'DRAFT', customerName: 'ТОВ «ТехноМаркет»', customerEmail: 'orders@technomarket.ua', priority: 5, items: [{ sku: 'ELEC-001', qty: 2, itemStatus: 'PENDING' }] },
  { orderNumber: 'ORD-2026-0002', type: 'OUTBOUND', status: 'CONFIRMED', customerName: 'ООО «ОфисПлюс»', customerEmail: 'supply@officeplus.ua', priority: 7, items: [{ sku: 'ELEC-002', qty: 3, itemStatus: 'ALLOCATED' }, { sku: 'ELEC-003', qty: 5, itemStatus: 'ALLOCATED' }] },
  { orderNumber: 'ORD-2026-0003', type: 'OUTBOUND', status: 'IN_PICKING', customerName: 'ИП Коваленко А.В.', customerEmail: 'kovalenko@gmail.com', priority: 8, items: [{ sku: 'ELEC-001', qty: 1, itemStatus: 'ALLOCATED' }, { sku: 'ELEC-004', qty: 10, itemStatus: 'ALLOCATED' }] },
  { orderNumber: 'ORD-2026-0004', type: 'OUTBOUND', status: 'PICKED', customerName: 'ТОВ «СтройГрад»', customerEmail: 'logistics@stroygrad.ua', priority: 6, items: [{ sku: 'TOOL-001', qty: 2, itemStatus: 'PICKED' }] },
  { orderNumber: 'ORD-2026-0005', type: 'OUTBOUND', status: 'IN_PACKING', customerName: 'Магазин «ModaStyle»', customerEmail: 'wh@modastyle.ua', priority: 7, items: [{ sku: 'CLOTH-001', qty: 4, itemStatus: 'PICKED' }, { sku: 'CLOTH-002', qty: 2, itemStatus: 'PICKED' }] },
  { orderNumber: 'ORD-2026-0006', type: 'OUTBOUND', status: 'SHIPPED', customerName: 'ТОВ «FreshFood»', customerEmail: 'warehouse@freshfood.ua', priority: 5, items: [{ sku: 'FOOD-001', qty: 48, itemStatus: 'PACKED' }, { sku: 'FOOD-002', qty: 12, itemStatus: 'PACKED' }] },
  { orderNumber: 'ORD-2026-0007', type: 'OUTBOUND', status: 'DELIVERED', customerName: 'ООО «КомпьютерСервис»', customerEmail: 'buy@compserv.ua', priority: 4, items: [{ sku: 'ELEC-003', qty: 8, itemStatus: 'PACKED' }] },
  { orderNumber: 'ORD-2026-0009', type: 'OUTBOUND', status: 'CANCELLED', customerName: 'ТОВ «CancelTest»', customerEmail: 'test@cancel.ua', priority: 3, items: [{ sku: 'TOOL-002', qty: 5, itemStatus: 'CANCELLED' }] },
  { orderNumber: 'ORD-2026-0010', type: 'OUTBOUND', status: 'CONFIRMED', customerName: 'Интернет-магазин «GadgetHub»', customerEmail: 'wh@gadgethub.ua', priority: 9, items: [{ sku: 'ELEC-001', qty: 3, itemStatus: 'ALLOCATED' }, { sku: 'ELEC-002', qty: 2, itemStatus: 'ALLOCATED' }] },
  { orderNumber: 'ORD-2026-0011', type: 'OUTBOUND', status: 'IN_PICKING', customerName: 'ТОВ «BookStore»', customerEmail: 'log@bookstore.ua', priority: 6, items: [{ sku: 'OFFICE-001', qty: 15, itemStatus: 'ALLOCATED' }] },
  { orderNumber: 'ORD-2026-0012', type: 'OUTBOUND', status: 'PACKED', customerName: 'ООО «SportLine»', customerEmail: 'depot@sportline.ua', priority: 5, items: [{ sku: 'CLOTH-002', qty: 6, itemStatus: 'PACKED' }] },
];

const INBOUND_ORDERS: OrderSeed[] = [
  { orderNumber: 'IN-2026-0001', type: 'INBOUND', status: 'CONFIRMED', customerName: 'Поставщик «ElectroTrade»', customerEmail: 'delivery@electrotrade.ua', priority: 8, items: [{ sku: 'ELEC-001', qty: 10, itemStatus: 'PENDING' }, { sku: 'ELEC-002', qty: 6, itemStatus: 'PENDING' }] },
  { orderNumber: 'IN-2026-0002', type: 'INBOUND', status: 'CONFIRMED', customerName: 'ООО «FoodSupply»', customerEmail: 'supply@foodsupply.ua', priority: 7, items: [{ sku: 'FOOD-001', qty: 120, itemStatus: 'PENDING' }, { sku: 'FOOD-002', qty: 40, itemStatus: 'PENDING' }] },
  { orderNumber: 'IN-2026-0003', type: 'INBOUND', status: 'DRAFT', customerName: 'ТОВ «OfficeWorld»', customerEmail: 'wh@officeworld.ua', priority: 5, items: [{ sku: 'OFFICE-001', qty: 50, itemStatus: 'PENDING' }] },
  { orderNumber: 'IN-2026-0004', type: 'INBOUND', status: 'CONFIRMED', customerName: 'Поставщик «ToolMaster»', customerEmail: 'log@toolmaster.ua', priority: 6, items: [{ sku: 'TOOL-001', qty: 8, itemStatus: 'PENDING' }, { sku: 'TOOL-002', qty: 20, itemStatus: 'PENDING' }] },
  { orderNumber: 'IN-2026-0005', type: 'INBOUND', status: 'CONFIRMED', customerName: 'ТОВ «ChemClean»', customerEmail: 'orders@chemclean.ua', priority: 4, items: [{ sku: 'CHEM-001', qty: 30, itemStatus: 'PENDING' }] },
];

const TASKS: TaskSeed[] = [
  { type: 'RECEIVE', status: 'ASSIGNED', priority: 'HIGH', title: 'Приёмка IN-2026-0001', description: 'Паллета с ноутбуками и мониторами', workerIndex: 0, orderNumber: 'IN-2026-0001', today: true },
  { type: 'RECEIVE', status: 'IN_PROGRESS', priority: 'HIGH', title: 'Приёмка IN-2026-0002', description: 'Продукты питания, 2 паллеты', workerIndex: 1, orderNumber: 'IN-2026-0002', today: true },
  { type: 'RECEIVE', status: 'PENDING', priority: 'NORMAL', title: 'Приёмка IN-2026-0004', description: 'Инструмент ToolMaster', orderNumber: 'IN-2026-0004', today: true },
  { type: 'PUT_AWAY', status: 'ASSIGNED', priority: 'NORMAL', title: 'Размещение ELEC-001', description: 'После приёмки IN-2026-0001 → A-03-01', workerIndex: 2, productSku: 'ELEC-001', quantity: 10, today: true },
  { type: 'PICK', status: 'ASSIGNED', priority: 'HIGH', title: 'Сборка ORD-2026-0003', description: 'Ноутбук + кабели USB-C', workerIndex: 0, orderNumber: 'ORD-2026-0003', productSku: 'ELEC-001', quantity: 1, today: true },
  { type: 'PICK', status: 'IN_PROGRESS', priority: 'NORMAL', title: 'Сборка ORD-2026-0004', description: '2× дрель Bosch', workerIndex: 1, orderNumber: 'ORD-2026-0004', productSku: 'TOOL-001', quantity: 2, today: true },
  { type: 'PICK', status: 'IN_PROGRESS', priority: 'URGENT', title: 'Сборка ORD-2026-0010', description: 'Срочный заказ GadgetHub', workerIndex: 2, orderNumber: 'ORD-2026-0010', today: true },
  { type: 'PICK', status: 'ASSIGNED', priority: 'NORMAL', title: 'Сборка ORD-2026-0011', description: 'Бумага A4 для BookStore', workerIndex: 3, orderNumber: 'ORD-2026-0011', productSku: 'OFFICE-001', quantity: 15, today: true },
  { type: 'PACK', status: 'ASSIGNED', priority: 'NORMAL', title: 'Упаковка ORD-2026-0005', description: 'Одежда ModaStyle', workerIndex: 0, orderNumber: 'ORD-2026-0005', today: true },
  { type: 'PACK', status: 'IN_PROGRESS', priority: 'HIGH', title: 'Упаковка ORD-2026-0012', description: 'Джинсы SportLine', workerIndex: 1, orderNumber: 'ORD-2026-0012', today: true },
  { type: 'REPLENISH', status: 'PENDING', priority: 'HIGH', title: 'Пополнение CLOTH-001', description: 'Остаток 3 шт — ниже минимума', productSku: 'CLOTH-001', today: true },
  { type: 'REPLENISH', status: 'ASSIGNED', priority: 'HIGH', title: 'Пополнение CHEM-001', description: 'Нулевой остаток — срочно', workerIndex: 2, productSku: 'CHEM-001', today: true },
  { type: 'COUNT', status: 'ASSIGNED', priority: 'LOW', title: 'Инвентаризация зоны B', description: 'Пересчёт ячеек B-01 — B-02', workerIndex: 3, today: true },
  { type: 'INSPECT', status: 'ASSIGNED', priority: 'NORMAL', title: 'Контроль FOOD-002', description: 'Проверка срока годности', assignTo: 'manager', productSku: 'FOOD-002', today: true },
  { type: 'TRANSFER', status: 'PENDING', priority: 'LOW', title: 'Перемещение TOOL-002', description: 'RC-01 → GS-01 C-02-01', productSku: 'TOOL-002', quantity: 10, today: true },
  { type: 'PICK', status: 'PENDING', priority: 'NORMAL', title: 'Сборка ORD-2026-0002', description: 'Ожидает назначения', orderNumber: 'ORD-2026-0002', today: true },
  { type: 'RECEIVE', status: 'PENDING', priority: 'NORMAL', title: 'Приёмка IN-2026-0005', description: 'Химия ChemClean', orderNumber: 'IN-2026-0005', today: true },
  { type: 'PICK', status: 'COMPLETED', priority: 'NORMAL', title: 'Сборка ORD-2026-0007', description: 'Клавиатуры Logitech', workerIndex: 0, orderNumber: 'ORD-2026-0007', productSku: 'ELEC-003', quantity: 8, completed: true, today: true },
  { type: 'PICK', status: 'COMPLETED', priority: 'NORMAL', title: 'Сборка ORD-2026-0006', description: 'Продукты FreshFood', workerIndex: 1, orderNumber: 'ORD-2026-0006', completed: true, today: true },
  { type: 'PACK', status: 'COMPLETED', priority: 'NORMAL', title: 'Упаковка ORD-2026-0006', description: 'Упаковка продуктов', workerIndex: 0, orderNumber: 'ORD-2026-0006', completed: true, today: true },
  { type: 'RECEIVE', status: 'COMPLETED', priority: 'NORMAL', title: 'Приёмка FOOD-001', description: '480 ед. воды', workerIndex: 2, productSku: 'FOOD-001', quantity: 480, completed: true, today: true },
  { type: 'PUT_AWAY', status: 'COMPLETED', priority: 'LOW', title: 'Размещение FOOD-001', description: '→ B-01-01', workerIndex: 3, productSku: 'FOOD-001', quantity: 480, completed: true, today: true },
  { type: 'PICK', status: 'FAILED', priority: 'URGENT', title: 'Сборка ORD-2026-0002', description: 'Недостаток мониторов', workerIndex: 0, orderNumber: 'ORD-2026-0002', failed: true, today: true },
  { type: 'COUNT', status: 'COMPLETED', priority: 'LOW', title: 'Инвентаризация зоны A', description: 'Пересчёт A-01, A-02', workerIndex: 1, completed: true, today: true },
  { type: 'PICK', status: 'COMPLETED', priority: 'NORMAL', title: 'Сборка ORD-2026-0012', description: 'Джинсы', workerIndex: 2, completed: true, today: true },
  { type: 'PICK', status: 'COMPLETED', priority: 'NORMAL', title: 'Сборка (вчера)', description: 'KPI за прошлый день', workerIndex: 0, completed: true, today: false },
  { type: 'PACK', status: 'COMPLETED', priority: 'NORMAL', title: 'Упаковка (вчера)', description: 'KPI за прошлый день', workerIndex: 1, completed: true, today: false },
  { type: 'RECEIVE', status: 'COMPLETED', priority: 'NORMAL', title: 'Приёмка (3 дня назад)', description: 'KPI история', workerIndex: 2, completed: true, today: false },
];

async function hasMarker(qr: QueryRunner, tenantId: string): Promise<boolean> {
  const rows = await qr.query(
    `SELECT id FROM orders WHERE tenant_id = $1 AND order_number = $2 LIMIT 1`,
    [tenantId, DEMO_MARKER],
  );
  return rows.length > 0;
}

async function getOrCreateZone(
  qr: QueryRunner,
  tenantId: string,
  warehouseId: string,
  zone: ZoneSeed,
): Promise<string> {
  const existing = await qr.query(
    `SELECT id FROM zones WHERE warehouse_id = $1 AND code = $2 LIMIT 1`,
    [warehouseId, zone.code],
  );
  if (existing.length > 0) return existing[0].id;

  const [row] = await qr.query(
    `INSERT INTO zones (tenant_id, warehouse_id, name, code, type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [tenantId, warehouseId, zone.name, zone.code, zone.type],
  );
  console.log(`[Seed] ✓ Zone: ${zone.code}`);
  return row.id;
}

async function getOrCreateCell(
  qr: QueryRunner,
  tenantId: string,
  warehouseId: string,
  zoneId: string,
  cell: CellSeed,
): Promise<string> {
  const existing = await qr.query(
    `SELECT id FROM cells WHERE zone_id = $1 AND code = $2 LIMIT 1`,
    [zoneId, cell.code],
  );
  if (existing.length > 0) return existing[0].id;

  const [row] = await qr.query(
    `INSERT INTO cells (tenant_id, warehouse_id, zone_id, code, barcode, aisle, bay, level, is_occupied)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [tenantId, warehouseId, zoneId, cell.code, cell.barcode, cell.aisle, cell.bay, cell.level, cell.occupied],
  );
  return row.id;
}

async function getOrCreateProduct(qr: QueryRunner, tenantId: string, product: ProductSeed): Promise<string> {
  const existing = await qr.query(
    `SELECT id FROM products WHERE tenant_id = $1 AND sku = $2 LIMIT 1`,
    [tenantId, product.sku],
  );
  if (existing.length > 0) return existing[0].id;

  const [row] = await qr.query(
    `INSERT INTO products (tenant_id, sku, name, description, barcode, unit, weight, min_stock_level, reorder_point)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [tenantId, product.sku, product.name, product.description, product.barcode, product.unit, product.weight, product.minStock, product.reorder],
  );
  console.log(`[Seed] ✓ Product: ${product.sku}`);
  return row.id;
}

async function insertOrder(
  qr: QueryRunner,
  ctx: DemoContext,
  order: OrderSeed,
  productIds: Record<string, string>,
): Promise<string> {
  const shippingAddress = JSON.stringify({
    city: 'Київ',
    street: 'вул. Хрещатик, 22',
    zip: '01001',
    country: 'Україна',
  });

  const [orderRow] = await qr.query(
    `INSERT INTO orders (
       tenant_id, warehouse_id, order_number, type, status,
       customer_name, customer_email, customer_phone,
       shipping_address, priority, created_by,
       confirmed_at, shipped_at, delivered_at, cancelled_at,
       created_at
     )
     VALUES (
       $1, $2, $3, $4::order_type_enum, $5::order_status_enum,
       $6, $7, '+380501234567',
       $8::jsonb, $9, $10,
       CASE WHEN $5::order_status_enum NOT IN ('DRAFT') THEN NOW() - INTERVAL '2 days' ELSE NULL END,
       CASE WHEN $5::order_status_enum IN ('SHIPPED','DELIVERED','PACKED') THEN NOW() - INTERVAL '1 day' ELSE NULL END,
       CASE WHEN $5::order_status_enum = 'DELIVERED' THEN NOW() - INTERVAL '12 hours' ELSE NULL END,
       CASE WHEN $5::order_status_enum = 'CANCELLED' THEN NOW() - INTERVAL '3 days' ELSE NULL END,
       NOW() - INTERVAL '5 days'
     )
     RETURNING id`,
    [ctx.tenantId, ctx.warehouseId, order.orderNumber, order.type, order.status, order.customerName, order.customerEmail, shippingAddress, order.priority, ctx.userIds.admin],
  );

  for (const item of order.items) {
    const allocated = ['ALLOCATED', 'PICKED', 'PACKED'].includes(item.itemStatus) ? item.qty : 0;
    const picked = ['PICKED', 'PACKED'].includes(item.itemStatus) ? item.qty : 0;
    await qr.query(
      `INSERT INTO order_items (tenant_id, order_id, product_id, status, requested_quantity, allocated_quantity, picked_quantity, unit_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [ctx.tenantId, orderRow.id, productIds[item.sku], item.itemStatus, item.qty, allocated, picked, 499.99],
    );
  }
  return orderRow.id;
}

async function insertTask(
  qr: QueryRunner,
  ctx: DemoContext,
  task: TaskSeed,
  orderIds: Record<string, string>,
  productIds: Record<string, string>,
  cellIds: Record<string, string>,
): Promise<void> {
  const workers = ctx.userIds.workers.length ? ctx.userIds.workers : [ctx.userIds.worker];
  const assignee =
    task.assignTo === 'manager'
      ? ctx.userIds.manager
      : task.workerIndex !== undefined
        ? workers[task.workerIndex % workers.length]
        : null;

  const orderId = task.orderNumber ? orderIds[task.orderNumber] : null;
  const productId = task.productSku ? productIds[task.productSku] : null;
  const invEntry = task.productSku ? INVENTORY.find((i) => i.sku === task.productSku) : null;
  const fromCellId = invEntry ? cellIds[`${invEntry.zoneCode}:${invEntry.cellCode}`] : null;

  const createdAt = task.today !== false ? 'NOW()' : "NOW() - INTERVAL '3 days'";
  const assignedAt = assignee ? "NOW() - INTERVAL '2 hours'" : 'NULL';
  const startedAt = task.status === 'IN_PROGRESS' ? "NOW() - INTERVAL '45 minutes'" : 'NULL';
  const completedAt = task.completed
    ? task.today !== false
      ? "NOW() - INTERVAL '1 hour'"
      : "NOW() - INTERVAL '2 days'"
    : task.failed
      ? "NOW() - INTERVAL '30 minutes'"
      : 'NULL';

  await qr.query(
    `INSERT INTO tasks (
       tenant_id, warehouse_id, order_id, type, status, priority,
       title, description, assigned_to, assigned_at, started_at,
       completed_at, product_id, quantity, from_cell_id, created_at, updated_at
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9,
       ${assignedAt}, ${startedAt}, ${completedAt},
       $10, $11, $12, ${createdAt}, ${createdAt}
     )`,
    [
      ctx.tenantId,
      ctx.warehouseId,
      orderId,
      task.type,
      task.status,
      task.priority,
      task.title,
      task.description,
      assignee,
      productId,
      task.quantity ?? null,
      fromCellId,
    ],
  );
}

export async function seedDemoData(qr: QueryRunner, ctx: DemoContext): Promise<void> {
  if (await hasMarker(qr, ctx.tenantId)) {
    console.log('[Seed] Demo data v2 already exists — skipping.');
    return;
  }

  console.log('[Seed] Creating demo data v2…');

  const zoneIds: Record<string, string> = { 'GS-01': ctx.storageZoneId };
  for (const zone of EXTRA_ZONES) {
    zoneIds[zone.code] = await getOrCreateZone(qr, ctx.tenantId, ctx.warehouseId, zone);
  }

  const cellIds: Record<string, string> = {};
  for (const cell of CELLS) {
    const zoneId = zoneIds[cell.zoneCode];
    cellIds[`${cell.zoneCode}:${cell.code}`] = await getOrCreateCell(
      qr,
      ctx.tenantId,
      ctx.warehouseId,
      zoneId,
      cell,
    );
  }
  console.log(`[Seed] ✓ Cells: ${CELLS.length}`);

  const productIds: Record<string, string> = {};
  for (const product of PRODUCTS) {
    productIds[product.sku] = await getOrCreateProduct(qr, ctx.tenantId, product);
  }

  const inventoryIds: Record<string, string> = {};
  for (const inv of INVENTORY) {
    const existing = await qr.query(
      `SELECT ii.id FROM inventory_items ii
       JOIN products p ON p.id = ii.product_id
       WHERE ii.tenant_id = $1 AND ii.warehouse_id = $2 AND p.sku = $3 LIMIT 1`,
      [ctx.tenantId, ctx.warehouseId, inv.sku],
    );
    if (existing.length > 0) {
      inventoryIds[inv.sku] = existing[0].id;
      continue;
    }
    const productId = productIds[inv.sku];
    const cellId = cellIds[`${inv.zoneCode}:${inv.cellCode}`];
    const [row] = await qr.query(
      `INSERT INTO inventory_items (tenant_id, warehouse_id, product_id, cell_id, quantity, reserved_quantity, lot_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [ctx.tenantId, ctx.warehouseId, productId, cellId, inv.qty, inv.reserved, inv.lot ?? null],
    );
    inventoryIds[inv.sku] = row.id;
  }
  console.log(`[Seed] ✓ Inventory items: ${INVENTORY.length}`);

  for (const inv of INVENTORY.filter((i) => i.lot)) {
    const exists = await qr.query(
      `SELECT id FROM batches WHERE tenant_id = $1 AND batch_number = $2 LIMIT 1`,
      [ctx.tenantId, inv.lot],
    );
    if (exists.length > 0) continue;
    await qr.query(
      `INSERT INTO batches (tenant_id, warehouse_id, product_id, batch_number, lot_number, quantity, expiry_date, manufactured_date, cost_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [ctx.tenantId, ctx.warehouseId, productIds[inv.sku], inv.lot, inv.lot, inv.qty, '2027-06-01', '2026-01-15', 12.5],
    );
  }

  const orderIds: Record<string, string> = {};
  for (const order of [...OUTBOUND_ORDERS, ...INBOUND_ORDERS]) {
    const existing = await qr.query(
      `SELECT id FROM orders WHERE tenant_id = $1 AND order_number = $2 LIMIT 1`,
      [ctx.tenantId, order.orderNumber],
    );
    if (existing.length > 0) {
      orderIds[order.orderNumber] = existing[0].id;
      continue;
    }
    orderIds[order.orderNumber] = await insertOrder(qr, ctx, order, productIds);
  }
  console.log(`[Seed] ✓ Orders: ${OUTBOUND_ORDERS.length + INBOUND_ORDERS.length}`);

  for (const task of TASKS) {
    await insertTask(qr, ctx, task, orderIds, productIds, cellIds);
  }
  console.log(`[Seed] ✓ Tasks: ${TASKS.length}`);

  const movements = [
    { sku: 'ELEC-003', type: 'INBOUND', qty: 45, ref: 'PO-2026-0142' },
    { sku: 'FOOD-001', type: 'INBOUND', qty: 480, ref: 'PO-2026-0155' },
    { sku: 'ELEC-001', type: 'OUTBOUND', qty: 2, ref: 'ORD-2026-0007' },
    { sku: 'TOOL-002', type: 'TRANSFER', qty: 28, ref: 'RC-01→GS-01' },
    { sku: 'OFFICE-001', type: 'INBOUND', qty: 50, ref: 'IN-2026-0003' },
    { sku: 'CLOTH-001', type: 'ADJUSTMENT', qty: 2, ref: 'AUDIT-2026-03' },
  ];

  for (const mv of movements) {
    const invId = inventoryIds[mv.sku];
    if (!invId) continue;
    const productId = productIds[mv.sku];
    const cellKey = INVENTORY.find((i) => i.sku === mv.sku);
    const cellId = cellKey ? cellIds[`${cellKey.zoneCode}:${cellKey.cellCode}`] : null;
    await qr.query(
      `INSERT INTO inventory_movements (
         tenant_id, warehouse_id, product_id, inventory_item_id,
         from_cell_id, to_cell_id, type, status, quantity, reference, performed_by, completed_at
       )
       VALUES (
         $1, $2, $3, $4,
         CASE WHEN $5::movement_type_enum IN ('OUTBOUND','TRANSFER','ADJUSTMENT') THEN $6::uuid ELSE NULL END,
         CASE WHEN $5::movement_type_enum IN ('INBOUND','TRANSFER') THEN $6::uuid ELSE NULL END,
         $5::movement_type_enum, 'COMPLETED', $7, $8, $9, NOW() - INTERVAL '1 day'
       )`,
      [ctx.tenantId, ctx.warehouseId, productId, invId, mv.type, cellId, Math.abs(mv.qty), mv.ref, ctx.userIds.worker],
    );
  }
  console.log(`[Seed] ✓ Inventory movements: ${movements.length}`);

  const existingWh2 = await qr.query(
    `SELECT id FROM warehouses WHERE tenant_id = $1 AND code = 'PLS-001' LIMIT 1`,
    [ctx.tenantId],
  );
  if (existingWh2.length === 0) {
    await qr.query(
      `INSERT INTO warehouses (tenant_id, name, code, address, city, country, timezone)
       VALUES ($1, 'Склад Поларис', 'PLS-001', 'Логистический парк, корп. 3', 'Домодедово', 'Россия', 'Europe/Moscow')`,
      [ctx.tenantId],
    );
    console.log('[Seed] ✓ Second warehouse: PLS-001');
  }

  const analystEmail = 'olena.analyst@blueprint.com';
  const existingAnalyst = await qr.query(
    `SELECT id FROM users WHERE tenant_id = $1 AND email = $2 LIMIT 1`,
    [ctx.tenantId, analystEmail],
  );
  if (existingAnalyst.length === 0) {
    const hash = await bcrypt.hash('Password123!', 12);
    await qr.query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, 'Olena', 'Analyst', 'ANALYST')`,
      [ctx.tenantId, analystEmail, hash],
    );
    console.log(`[Seed] ✓ Analyst: ${analystEmail}`);
  }

  await qr.query(
    `INSERT INTO orders (tenant_id, warehouse_id, order_number, type, status, customer_name, priority, metadata)
     VALUES ($1, $2, $3, 'OUTBOUND', 'DELIVERED', 'Demo Seed Marker', 1, '{"demo":true}'::jsonb)`,
    [ctx.tenantId, ctx.warehouseId, DEMO_MARKER],
  );
  console.log('[Seed] ✓ Demo data v2 complete.');
}
