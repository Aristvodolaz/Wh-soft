import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/entity.base';
import { OrderItem } from './order-item.entity';

export enum OrderType {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  TRANSFER = 'TRANSFER',
  RETURN = 'RETURN',
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  IN_PICKING = 'IN_PICKING',
  PICKED = 'PICKED',
  IN_PACKING = 'IN_PACKING',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

/** Terminal states — no further transitions allowed */
export const TERMINAL_STATUSES = new Set<OrderStatus>([
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.RETURNED,
]);

/** Allowed status transitions */
export const STATUS_TRANSITIONS: Readonly<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.DRAFT]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.IN_PICKING, OrderStatus.CANCELLED],
  [OrderStatus.IN_PICKING]: [OrderStatus.PICKED, OrderStatus.CANCELLED],
  [OrderStatus.PICKED]: [OrderStatus.IN_PACKING, OrderStatus.CANCELLED],
  [OrderStatus.IN_PACKING]: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  [OrderStatus.PACKED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.RETURNED]: [],
};

@Entity('orders')
export class Order extends BaseEntity {
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ name: 'order_number', type: 'varchar', length: 100 })
  orderNumber: string;

  @Column({
    type: 'enum',
    enum: OrderType,
    enumName: 'order_type_enum',
    default: OrderType.OUTBOUND,
  })
  type: OrderType;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    enumName: 'order_status_enum',
    default: OrderStatus.DRAFT,
  })
  status: OrderStatus;

  @Column({ name: 'customer_name', type: 'varchar', length: 255, nullable: true, default: null })
  customerName: string | null;

  @Column({ name: 'customer_email', type: 'varchar', length: 255, nullable: true, default: null })
  customerEmail: string | null;

  @Column({ name: 'customer_phone', type: 'varchar', length: 50, nullable: true, default: null })
  customerPhone: string | null;

  @Column({ name: 'shipping_address', type: 'jsonb', nullable: true, default: null })
  shippingAddress: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true, default: null })
  notes: string | null;

  @Column({ type: 'smallint', default: 5 })
  priority: number;

  @Column({ name: 'expected_at', type: 'timestamptz', nullable: true, default: null })
  expectedAt: Date | null;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true, default: null })
  confirmedAt: Date | null;

  @Column({ name: 'shipped_at', type: 'timestamptz', nullable: true, default: null })
  shippedAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true, default: null })
  deliveredAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true, default: null })
  cancelledAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true, default: null })
  createdBy: string | null;

  @Column({ name: 'confirmed_by', type: 'uuid', nullable: true, default: null })
  confirmedBy: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: ['insert', 'update'] })
  items?: OrderItem[];
}
