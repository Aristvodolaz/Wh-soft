import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/entity.base';

export enum ProductUnit {
  PIECE = 'PIECE',
  BOX = 'BOX',
  PALLET = 'PALLET',
  KG = 'KG',
  LITER = 'LITER',
  METER = 'METER',
}

@Entity('products')
export class Product extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  sku: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  barcode: string | null;

  @Column({
    type: 'enum',
    enum: ProductUnit,
    enumName: 'product_unit_enum',
    default: ProductUnit.PIECE,
  })
  unit: ProductUnit;

  @Column({ type: 'numeric', precision: 10, scale: 3, nullable: true, default: null })
  weight: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 3, nullable: true, default: null })
  volume: number | null;

  @Column({ name: 'min_stock_level', type: 'int', default: 0 })
  minStockLevel: number;

  @Column({ name: 'max_stock_level', type: 'int', nullable: true, default: null })
  maxStockLevel: number | null;

  @Column({ name: 'reorder_point', type: 'int', default: 0 })
  reorderPoint: number;

  @Column({ type: 'jsonb', default: '{}' })
  attributes: Record<string, unknown>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
