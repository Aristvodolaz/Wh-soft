import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from '../../domain/entities/order-item.entity';

@Injectable()
export class OrderItemRepository {
  constructor(
    @InjectRepository(OrderItem)
    private readonly repo: Repository<OrderItem>,
  ) {}

  findByOrder(orderId: string, tenantId: string): Promise<OrderItem[]> {
    return this.repo.find({
      where: { orderId, tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  findById(id: string, tenantId: string): Promise<OrderItem | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  save(item: OrderItem): Promise<OrderItem> {
    return this.repo.save(item);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }
}
