import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Task } from './domain/entities/task.entity';
import { TaskRepository } from './infrastructure/repositories/task.repository';
import { TasksService } from './application/services/tasks.service';
import { TasksController } from './interface/controllers/tasks.controller';
import { EventBusModule } from '../../infrastructure/event-bus/event-bus.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), EventBusModule],
  controllers: [TasksController],
  providers: [TasksService, TaskRepository],
  exports: [TasksService, TaskRepository],
})
export class TasksModule {}
