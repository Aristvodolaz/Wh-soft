import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { LoadingService } from './application/services/loading.service';
import { ReplenishmentService } from './application/services/replenishment.service';
import { SlottingService } from './application/services/slotting.service';
import { WorkforceService } from './application/services/workforce.service';
import { OptimizationController } from './interface/controllers/optimization.controller';

@Module({
  imports: [TasksModule],
  controllers: [OptimizationController],
  providers: [ReplenishmentService, SlottingService, WorkforceService, LoadingService],
  exports: [ReplenishmentService, SlottingService, WorkforceService, LoadingService],
})
export class OptimizationModule {}
