import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Order } from './domain/entities/order.entity';
import { OrderItem } from './domain/entities/order-item.entity';

import { OrderRepository } from './infrastructure/repositories/order.repository';
import { OrderItemRepository } from './infrastructure/repositories/order-item.repository';

import { OrdersService } from './application/services/orders.service';
import { OrdersController } from './interface/controllers/orders.controller';
import { EventBusModule } from '../../infrastructure/event-bus/event-bus.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem]), EventBusModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderRepository, OrderItemRepository],
  exports: [OrdersService, OrderRepository, OrderItemRepository],
})
export class OrdersModule {}
