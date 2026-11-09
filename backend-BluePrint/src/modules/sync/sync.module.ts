import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { TasksModule } from '../tasks/tasks.module';
import { SyncService } from './application/services/sync.service';
import { SyncController } from './interface/controllers/sync.controller';

@Module({
  imports: [InventoryModule, TasksModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
