import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/entity.base';
import { Order } from './order.entity';

export enum OrderItemStatus {
  PENDING = 'PENDING',
  ALLOCATED = 'ALLOCATED',
  PICKED = 'PICKED',
  PACKED = 'PACKED',
  CANCELLED = 'CANCELLED',
}

@Entity('order_items')
export class OrderItem extends BaseEntity {
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'inventory_item_id', type: 'uuid', nullable: true, default: null })
  inventoryItemId: string | null;

  @Column({
    type: 'enum',
    enum: OrderItemStatus,
    enumName: 'order_item_status_enum',
    default: OrderItemStatus.PENDING,
  })
  status: OrderItemStatus;

  @Column({ name: 'requested_quantity', type: 'int' })
  requestedQuantity: number;

  @Column({ name: 'allocated_quantity', type: 'int', default: 0 })
  allocatedQuantity: number;

  @Column({ name: 'picked_quantity', type: 'int', default: 0 })
  pickedQuantity: number;

  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 12,
    scale: 4,
    nullable: true,
    default: null,
  })
  unitPrice: number | null;

  @Column({ type: 'text', nullable: true, default: null })
  notes: string | null;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: Order;
}
