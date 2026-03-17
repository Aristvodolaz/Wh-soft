import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/entity.base';
import { Cell } from './cell.entity';
import { Warehouse } from './warehouse.entity';

export enum ZoneType {
  STORAGE = 'STORAGE',
  RECEIVING = 'RECEIVING',
  SHIPPING = 'SHIPPING',
  STAGING = 'STAGING',
  RETURNS = 'RETURNS',
  HAZMAT = 'HAZMAT',
  COLD = 'COLD',
}

@Entity('zones')
export class Zone extends BaseEntity {
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({
    type: 'enum',
    enum: ZoneType,
    enumName: 'zone_type_enum',
    default: ZoneType.STORAGE,
  })
  type: ZoneType;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Warehouse, (warehouse) => warehouse.zones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse?: Warehouse;

  @OneToMany(() => Cell, (cell) => cell.zone)
  cells?: Cell[];
}
