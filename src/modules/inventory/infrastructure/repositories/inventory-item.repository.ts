import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { InventoryItem } from '../../domain/entities/inventory-item.entity';

@Injectable()
export class InventoryItemRepository {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly repo: Repository<InventoryItem>,
    private readonly dataSource: DataSource,
  ) {}

  async findByWarehouse(warehouseId: string, tenantId: string): Promise<InventoryItem[]> {
    return this.repo.find({
      where: { warehouseId, tenantId },
      relations: ['product', 'cell'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<InventoryItem | null> {
    return this.repo.findOne({ where: { id, tenantId }, relations: ['product', 'cell'] });
  }

  async findByProductAndWarehouse(
    productId: string,
    warehouseId: string,
    tenantId: string,
  ): Promise<InventoryItem[]> {
    return this.repo.find({
      where: { productId, warehouseId, tenantId },
      relations: ['cell'],
      order: { expiryDate: 'ASC' }, // FEFO ordering by default
    });
  }

  async findByCell(cellId: string, tenantId: string): Promise<InventoryItem[]> {
    return this.repo.find({
      where: { cellId, tenantId },
      relations: ['product'],
    });
  }

  /** Find items with stock at or below reorder point (join products for threshold). */
  async findLowStock(warehouseId: string, tenantId: string): Promise<InventoryItem[]> {
    return this.dataSource
      .createQueryBuilder(InventoryItem, 'item')
      .innerJoinAndSelect('item.product', 'product')
      .where('item.warehouse_id = :warehouseId AND item.tenant_id = :tenantId', {
        warehouseId,
        tenantId,
      })
      .andWhere('item.quantity <= product.reorder_point')
      .getMany();
  }

  /** Unlocated items (received but not yet put-away). */
  async findUnlocated(warehouseId: string, tenantId: string): Promise<InventoryItem[]> {
    return this.repo.find({
      where: { warehouseId, tenantId, cellId: IsNull() },
      relations: ['product'],
    });
  }

  async save(item: InventoryItem): Promise<InventoryItem> {
    return this.repo.save(item);
  }

  async saveMany(items: InventoryItem[]): Promise<InventoryItem[]> {
    return this.repo.save(items);
  }
}
