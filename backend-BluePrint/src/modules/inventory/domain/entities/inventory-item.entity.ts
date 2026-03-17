import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/entity.base';
import { Cell } from '../../../warehouse/domain/entities/cell.entity';
import { Product } from './product.entity';

@Entity('inventory_items')
export class InventoryItem extends BaseEntity {
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'cell_id', type: 'uuid', nullable: true, default: null })
  cellId: string | null;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ name: 'reserved_quantity', type: 'int', default: 0 })
  reservedQuantity: number;

  @Column({ name: 'lot_number', type: 'varchar', length: 100, nullable: true, default: null })
  lotNumber: string | null;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true, default: null })
  serialNumber: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true, default: null })
  expiryDate: Date | null;

  @Column({
    name: 'cost_price',
    type: 'numeric',
    precision: 12,
    scale: 4,
    nullable: true,
    default: null,
  })
  costPrice: number | null;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ManyToOne(() => Cell, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cell_id' })
  cell?: Cell | null;

  /** Computed: quantity that is free to pick/allocate. */
  get availableQuantity(): number {
    return this.quantity - this.reservedQuantity;
  }
}
