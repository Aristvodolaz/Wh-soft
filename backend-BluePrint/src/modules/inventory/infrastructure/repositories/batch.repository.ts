import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { Batch } from '../../domain/entities/batch.entity';

@Injectable()
export class BatchRepository {
  constructor(
    @InjectRepository(Batch)
    private readonly repo: Repository<Batch>,
  ) {}

  async findByWarehouseAndProduct(
    warehouseId: string,
    productId: string,
    tenantId: string,
  ): Promise<Batch[]> {
    return this.repo.find({
      where: { warehouseId, productId, tenantId, isActive: true },
      order: { expiryDate: 'ASC' }, // FEFO
    });
  }

  async findById(id: string, tenantId: string): Promise<Batch | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async findByBatchNumber(
    batchNumber: string,
    warehouseId: string,
    tenantId: string,
  ): Promise<Batch | null> {
    return this.repo.findOne({ where: { batchNumber, warehouseId, tenantId } });
  }

  /** Batches expiring on or before the given date. */
  async findExpiringSoon(
    warehouseId: string,
    tenantId: string,
    beforeDate: Date,
  ): Promise<Batch[]> {
    return this.repo.find({
      where: {
        warehouseId,
        tenantId,
        isActive: true,
        expiryDate: LessThanOrEqual(beforeDate),
        quantity: MoreThan(0),
      },
      relations: ['product'],
      order: { expiryDate: 'ASC' },
    });
  }

  async save(batch: Batch): Promise<Batch> {
    return this.repo.save(batch);
  }
}
