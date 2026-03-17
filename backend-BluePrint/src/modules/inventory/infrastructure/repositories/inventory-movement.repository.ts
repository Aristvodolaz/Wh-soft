import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InventoryMovement,
  MovementStatus,
  MovementType,
} from '../../domain/entities/inventory-movement.entity';

@Injectable()
export class InventoryMovementRepository {
  constructor(
    @InjectRepository(InventoryMovement)
    private readonly repo: Repository<InventoryMovement>,
  ) {}

  async findByWarehouse(
    warehouseId: string,
    tenantId: string,
    limit = 100,
  ): Promise<InventoryMovement[]> {
    return this.repo.find({
      where: { warehouseId, tenantId },
      relations: ['product'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByInventoryItem(
    inventoryItemId: string,
    tenantId: string,
  ): Promise<InventoryMovement[]> {
    return this.repo.find({
      where: { inventoryItemId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByPerformedBy(
    performedBy: string,
    tenantId: string,
    limit = 50,
  ): Promise<InventoryMovement[]> {
    return this.repo.find({
      where: { performedBy, tenantId },
      relations: ['product'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByType(
    type: MovementType,
    warehouseId: string,
    tenantId: string,
  ): Promise<InventoryMovement[]> {
    return this.repo.find({
      where: { type, warehouseId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findPending(warehouseId: string, tenantId: string): Promise<InventoryMovement[]> {
    return this.repo.find({
      where: { warehouseId, tenantId, status: MovementStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  async save(movement: InventoryMovement): Promise<InventoryMovement> {
    return this.repo.save(movement);
  }
}
