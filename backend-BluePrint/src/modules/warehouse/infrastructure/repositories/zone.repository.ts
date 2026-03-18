import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZoneType } from '../../domain/entities/zone.entity';
import { Zone } from '../../domain/entities/zone.entity';

@Injectable()
export class ZoneRepository {
  constructor(
    @InjectRepository(Zone)
    private readonly repo: Repository<Zone>,
  ) {}

  async findAllByWarehouse(warehouseId: string, tenantId: string): Promise<Zone[]> {
    return this.repo.find({
      where: { warehouseId, tenantId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<Zone | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async findByIdAndWarehouse(
    id: string,
    warehouseId: string,
    tenantId: string,
  ): Promise<Zone | null> {
    return this.repo.findOne({ where: { id, warehouseId, tenantId } });
  }

  async findByCode(code: string, warehouseId: string, tenantId: string): Promise<Zone | null> {
    return this.repo.findOne({ where: { code: code.toUpperCase(), warehouseId, tenantId } });
  }

  async findByType(type: ZoneType, warehouseId: string, tenantId: string): Promise<Zone[]> {
    return this.repo.find({ where: { type, warehouseId, tenantId, isActive: true } });
  }

  async save(zone: Zone): Promise<Zone> {
    return this.repo.save(zone);
  }

  async existsByCode(
    code: string,
    warehouseId: string,
    tenantId: string,
    excludeId?: string,
  ): Promise<boolean> {
    const qb = this.repo
      .createQueryBuilder('z')
      .where('z.code = :code AND z.warehouse_id = :warehouseId AND z.tenant_id = :tenantId', {
        code: code.toUpperCase(),
        warehouseId,
        tenantId,
      });
    if (excludeId) qb.andWhere('z.id != :excludeId', { excludeId });
    return (await qb.getCount()) > 0;
  }
}
