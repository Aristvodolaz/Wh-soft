import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Task } from './domain/entities/task.entity';
import { TaskRepository } from './infrastructure/repositories/task.repository';
import { TasksService } from './application/services/tasks.service';
import { TasksController } from './interface/controllers/tasks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Task])],
  controllers: [TasksController],
  providers: [TasksService, TaskRepository],
  exports: [TasksService, TaskRepository],
})
export class TasksModule {}
