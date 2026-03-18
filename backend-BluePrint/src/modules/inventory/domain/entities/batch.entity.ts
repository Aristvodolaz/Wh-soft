import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/entity.base';
import { Product } from './product.entity';

@Entity('batches')
export class Batch extends BaseEntity {
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'batch_number', type: 'varchar', length: 100 })
  batchNumber: string;

  @Column({ name: 'lot_number', type: 'varchar', length: 100, nullable: true, default: null })
  lotNumber: string | null;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ name: 'expiry_date', type: 'date', nullable: true, default: null })
  expiryDate: Date | null;

  @Column({ name: 'manufactured_date', type: 'date', nullable: true, default: null })
  manufacturedDate: Date | null;

  @Column({
    name: 'cost_price',
    type: 'numeric',
    precision: 12,
    scale: 4,
    nullable: true,
    default: null,
  })
  costPrice: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;
}
