import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/entity.base';
import { Cell } from '../../../warehouse/domain/entities/cell.entity';
import { Product } from './product.entity';
import { InventoryItem } from './inventory-item.entity';

export enum MovementType {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
  DAMAGED = 'DAMAGED',
}

export enum MovementStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('inventory_movements')
export class InventoryMovement extends BaseEntity {
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'inventory_item_id', type: 'uuid' })
  inventoryItemId: string;

  @Column({ name: 'from_cell_id', type: 'uuid', nullable: true, default: null })
  fromCellId: string | null;

  @Column({ name: 'to_cell_id', type: 'uuid', nullable: true, default: null })
  toCellId: string | null;

  @Column({
    type: 'enum',
    enum: MovementType,
    enumName: 'movement_type_enum',
  })
  type: MovementType;

  @Column({
    type: 'enum',
    enum: MovementStatus,
    enumName: 'movement_status_enum',
    default: MovementStatus.PENDING,
  })
  status: MovementStatus;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  reference: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  notes: string | null;

  @Column({ name: 'performed_by', type: 'uuid', nullable: true, default: null })
  performedBy: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true, default: null })
  completedAt: Date | null;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ManyToOne(() => InventoryItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'inventory_item_id' })
  inventoryItem?: InventoryItem;

  @ManyToOne(() => Cell, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'from_cell_id' })
  fromCell?: Cell | null;

  @ManyToOne(() => Cell, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'to_cell_id' })
  toCell?: Cell | null;
}
