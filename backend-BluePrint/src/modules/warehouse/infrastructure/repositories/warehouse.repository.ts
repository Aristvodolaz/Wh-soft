import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../../domain/entities/warehouse.entity';

@Injectable()
export class WarehouseRepository {
  constructor(
    @InjectRepository(Warehouse)
    private readonly repo: Repository<Warehouse>,
  ) {}

  async findAllByTenant(tenantId: string, includeInactive = false): Promise<Warehouse[]> {
    const where = includeInactive ? { tenantId } : { tenantId, isActive: true };
    return this.repo.find({ where, order: { name: 'ASC' } });
  }

  async findById(id: string, tenantId: string): Promise<Warehouse | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async findByCode(code: string, tenantId: string): Promise<Warehouse | null> {
    return this.repo.findOne({ where: { code: code.toUpperCase(), tenantId } });
  }

  async save(warehouse: Warehouse): Promise<Warehouse> {
    return this.repo.save(warehouse);
  }

  async existsByCode(code: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const qb = this.repo
      .createQueryBuilder('w')
      .where('w.code = :code AND w.tenant_id = :tenantId', {
        code: code.toUpperCase(),
        tenantId,
      });
    if (excludeId) qb.andWhere('w.id != :excludeId', { excludeId });
    return (await qb.getCount()) > 0;
  }

  async count(tenantId: string): Promise<number> {
    return this.repo.count({ where: { tenantId } });
  }
}
