import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, OrderType } from '../../domain/entities/order.entity';

export interface OrderFilters {
  warehouseId?: string;
  type?: OrderType;
  status?: OrderStatus;
}

@Injectable()
export class OrderRepository {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
  ) {}

  findAllByTenant(tenantId: string, filters: OrderFilters = {}): Promise<Order[]> {
    const qb = this.repo
      .createQueryBuilder('order')
      .where('order.tenant_id = :tenantId', { tenantId })
      .orderBy('order.created_at', 'DESC');

    if (filters.warehouseId) {
      qb.andWhere('order.warehouse_id = :warehouseId', { warehouseId: filters.warehouseId });
    }
    if (filters.type) {
      qb.andWhere('order.type = :type', { type: filters.type });
    }
    if (filters.status) {
      qb.andWhere('order.status = :status', { status: filters.status });
    }

    return qb.getMany();
  }

  findById(id: string, tenantId: string): Promise<Order | null> {
    return this.repo.findOne({
      where: { id, tenantId },
      relations: ['items'],
    });
  }

  existsByOrderNumber(orderNumber: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const qb = this.repo
      .createQueryBuilder('o')
      .where('o.order_number = :orderNumber AND o.tenant_id = :tenantId', {
        orderNumber,
        tenantId,
      });

    if (excludeId) {
      qb.andWhere('o.id != :excludeId', { excludeId });
    }

    return qb.getExists();
  }

  save(order: Order): Promise<Order> {
    return this.repo.save(order);
  }
}
