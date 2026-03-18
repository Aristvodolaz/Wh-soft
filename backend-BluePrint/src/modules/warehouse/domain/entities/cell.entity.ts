import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/entity.base';
import { Warehouse } from './warehouse.entity';
import { Zone } from './zone.entity';

@Entity('cells')
export class Cell extends BaseEntity {
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ name: 'zone_id', type: 'uuid' })
  zoneId: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  barcode: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  aisle: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  bay: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  level: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  position: string | null;

  @Column({
    name: 'max_weight',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    default: null,
  })
  maxWeight: number | null;

  @Column({
    name: 'max_volume',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    default: null,
  })
  maxVolume: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_occupied', type: 'boolean', default: false })
  isOccupied: boolean;

  @ManyToOne(() => Zone, (zone) => zone.cells, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone?: Zone;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse?: Warehouse;
}
