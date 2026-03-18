import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Cell } from './domain/entities/cell.entity';
import { Warehouse } from './domain/entities/warehouse.entity';
import { Zone } from './domain/entities/zone.entity';

import { CellRepository } from './infrastructure/repositories/cell.repository';
import { WarehouseRepository } from './infrastructure/repositories/warehouse.repository';
import { ZoneRepository } from './infrastructure/repositories/zone.repository';

import { WarehouseService } from './application/services/warehouse.service';
import { WarehouseController } from './interface/controllers/warehouse.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Warehouse, Zone, Cell])],
  controllers: [WarehouseController],
  providers: [WarehouseService, WarehouseRepository, ZoneRepository, CellRepository],
  exports: [WarehouseService, WarehouseRepository, ZoneRepository, CellRepository],
})
export class WarehouseModule {}
