import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Cell } from '../warehouse/domain/entities/cell.entity';
import { Batch } from './domain/entities/batch.entity';
import { InventoryItem } from './domain/entities/inventory-item.entity';
import { InventoryMovement } from './domain/entities/inventory-movement.entity';
import { Product } from './domain/entities/product.entity';

import { BatchRepository } from './infrastructure/repositories/batch.repository';
import { InventoryItemRepository } from './infrastructure/repositories/inventory-item.repository';
import { InventoryMovementRepository } from './infrastructure/repositories/inventory-movement.repository';
import { ProductRepository } from './infrastructure/repositories/product.repository';

import { InventoryService } from './application/services/inventory.service';
import { InventoryController } from './interface/controllers/inventory.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product, InventoryItem, Batch, InventoryMovement, Cell])],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    ProductRepository,
    InventoryItemRepository,
    BatchRepository,
    InventoryMovementRepository,
  ],
  exports: [
    InventoryService,
    ProductRepository,
    InventoryItemRepository,
    BatchRepository,
    InventoryMovementRepository,
  ],
})
export class InventoryModule {}
