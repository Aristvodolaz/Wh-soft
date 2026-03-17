import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/entity.base';
import { Zone } from './zone.entity';

@Entity('warehouses')
export class Warehouse extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'text', nullable: true, default: null })
  address: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  country: string | null;

  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  settings: Record<string, unknown>;

  @OneToMany(() => Zone, (zone) => zone.warehouse)
  zones?: Zone[];
}
