import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { EventBusService } from '../../../../infrastructure/event-bus/event-bus.service';
import { AppException } from '../../../../shared/exceptions/app.exception';
import { OrderItem, OrderItemStatus } from '../../domain/entities/order-item.entity';
import {
  Order,
  OrderStatus,
  OrderType,
  STATUS_TRANSITIONS,
  TERMINAL_STATUSES,
} from '../../domain/entities/order.entity';
import { OrderItemRepository } from '../../infrastructure/repositories/order-item.repository';
import { OrderFilters, OrderRepository } from '../../infrastructure/repositories/order.repository';
import { AddOrderItemDto } from '../dto/add-order-item.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OrderItemResponseDto, OrderResponseDto } from '../dto/order-response.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderItemRepository: OrderItemRepository,
    private readonly eventBus: EventBusService,
  ) {}

  // ── Queries ──────────────────────────────────────────────────────────────────

  async listOrders(tenantId: string, filters: OrderFilters = {}): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepository.findAllByTenant(tenantId, filters);
    return orders.map(this.toOrderResponse);
  }

  async getOrder(tenantId: string, orderId: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findById(orderId, tenantId);
    if (!order) throw AppException.notFound('Order', orderId);
    return this.toOrderResponse(order);
  }

  // ── Commands ─────────────────────────────────────────────────────────────────

  async createOrder(
    tenantId: string,
    userId: string,
    dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const orderNumber = dto.orderNumber?.toUpperCase() ?? this.generateOrderNumber(dto.type);

    const exists = await this.orderRepository.existsByOrderNumber(orderNumber, tenantId);
    if (exists) {
      throw AppException.conflict(`Order number "${orderNumber}" already exists`);
    }

    const order = Object.assign(new Order(), {
      tenantId,
      warehouseId: dto.warehouseId,
      orderNumber,
      type: dto.type ?? OrderType.OUTBOUND,
      status: OrderStatus.DRAFT,
      customerName: dto.customerName ?? null,
      customerEmail: dto.customerEmail ?? null,
      customerPhone: dto.customerPhone ?? null,
      shippingAddress: dto.shippingAddress ?? null,
      notes: dto.notes ?? null,
      priority: dto.priority ?? 5,
      expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
      confirmedAt: null,
      shippedAt: null,
      deliveredAt: null,
      cancelledAt: null,
      createdBy: userId,
      confirmedBy: null,
      metadata: {},
    });

    const saved = await this.orderRepository.save(order);

    // Attach initial items if provided
    if (dto.items?.length) {
      for (const itemDto of dto.items) {
        const item = Object.assign(new OrderItem(), {
          tenantId,
          orderId: saved.id,
          productId: itemDto.productId,
          inventoryItemId: null,
          status: OrderItemStatus.PENDING,
          requestedQuantity: itemDto.requestedQuantity,
          allocatedQuantity: 0,
          pickedQuantity: 0,
          unitPrice: null,
          notes: itemDto.notes ?? null,
        });
        await this.orderItemRepository.save(item);
      }
    }

    this.logger.log(`Order "${saved.orderNumber}" created for tenant ${tenantId}`);

    void this.eventBus.publish({
      eventName: 'order.created',
      occurredAt: new Date(),
      aggregateId: saved.id,
      tenantId,
      payload: { orderId: saved.id, orderNumber: saved.orderNumber, type: saved.type },
    });

    return this.toOrderResponse((await this.orderRepository.findById(saved.id, tenantId)) as Order);
  }

  async updateOrder(
    tenantId: string,
    orderId: string,
    dto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.requireOrder(tenantId, orderId);

    if (order.status !== OrderStatus.DRAFT) {
      throw AppException.unprocessable('Order can only be updated while in DRAFT status');
    }

    if (dto.orderNumber !== undefined) {
      const sku = dto.orderNumber.toUpperCase();
      const conflict = await this.orderRepository.existsByOrderNumber(sku, tenantId, orderId);
      if (conflict) throw AppException.conflict(`Order number "${sku}" is already taken`);
      order.orderNumber = sku;
    }

    if (dto.type !== undefined) order.type = dto.type;
    if (dto.customerName !== undefined) order.customerName = dto.customerName ?? null;
    if (dto.customerEmail !== undefined) order.customerEmail = dto.customerEmail ?? null;
    if (dto.customerPhone !== undefined) order.customerPhone = dto.customerPhone ?? null;
    if (dto.shippingAddress !== undefined) order.shippingAddress = dto.shippingAddress ?? null;
    if (dto.notes !== undefined) order.notes = dto.notes ?? null;
    if (dto.priority !== undefined) order.priority = dto.priority;
    if (dto.expectedAt !== undefined)
      order.expectedAt = dto.expectedAt ? new Date(dto.expectedAt) : null;

    return this.toOrderResponse(await this.orderRepository.save(order));
  }

  async addItem(
    tenantId: string,
    orderId: string,
    dto: AddOrderItemDto,
  ): Promise<OrderItemResponseDto> {
    const order = await this.requireOrder(tenantId, orderId);

    if (order.status !== OrderStatus.DRAFT) {
      throw AppException.unprocessable(
        'Items can only be added while the order is in DRAFT status',
      );
    }

    const item = Object.assign(new OrderItem(), {
      tenantId,
      orderId,
      productId: dto.productId,
      inventoryItemId: null,
      status: OrderItemStatus.PENDING,
      requestedQuantity: dto.requestedQuantity,
      allocatedQuantity: 0,
      pickedQuantity: 0,
      unitPrice: null,
      notes: dto.notes ?? null,
    });

    return this.toItemResponse(await this.orderItemRepository.save(item));
  }

  async removeItem(tenantId: string, orderId: string, itemId: string): Promise<void> {
    const order = await this.requireOrder(tenantId, orderId);

    if (order.status !== OrderStatus.DRAFT) {
      throw AppException.unprocessable(
        'Items can only be removed while the order is in DRAFT status',
      );
    }

    const item = await this.orderItemRepository.findById(itemId, tenantId);
    if (!item || item.orderId !== orderId) {
      throw AppException.notFound('OrderItem', itemId);
    }

    await this.orderItemRepository.remove(itemId, tenantId);
  }

  // ── Status transitions ────────────────────────────────────────────────────────

  async transitionStatus(
    tenantId: string,
    orderId: string,
    targetStatus: OrderStatus,
    userId?: string,
  ): Promise<OrderResponseDto> {
    const order = await this.requireOrder(tenantId, orderId);

    if (TERMINAL_STATUSES.has(order.status)) {
      throw AppException.unprocessable(
        `Order is in terminal status "${order.status}" and cannot be transitioned`,
      );
    }

    const allowed = STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(targetStatus)) {
      throw AppException.unprocessable(
        `Cannot transition order from "${order.status}" to "${targetStatus}"`,
      );
    }

    order.status = targetStatus;
    const now = new Date();

    switch (targetStatus) {
      case OrderStatus.CONFIRMED:
        order.confirmedAt = now;
        order.confirmedBy = userId ?? null;
        break;
      case OrderStatus.SHIPPED:
        order.shippedAt = now;
        break;
      case OrderStatus.DELIVERED:
        order.deliveredAt = now;
        break;
      case OrderStatus.CANCELLED:
        order.cancelledAt = now;
        break;
    }

    const saved = await this.orderRepository.save(order);

    this.logger.log(
      `Order "${saved.orderNumber}" transitioned to ${targetStatus} (tenant=${tenantId})`,
    );

    const eventTypeMap: Partial<Record<OrderStatus, string>> = {
      [OrderStatus.CONFIRMED]: 'order.confirmed',
      [OrderStatus.SHIPPED]: 'order.shipped',
      [OrderStatus.DELIVERED]: 'order.delivered',
      [OrderStatus.CANCELLED]: 'order.cancelled',
    };

    const eventType = eventTypeMap[targetStatus];
    if (eventType) {
      void this.eventBus.publish({
        eventName: eventType,
        occurredAt: now,
        aggregateId: saved.id,
        tenantId,
        payload: {
          orderId: saved.id,
          orderNumber: saved.orderNumber,
          status: targetStatus,
          performedBy: userId ?? null,
        },
      });
    }

    return this.toOrderResponse(saved);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private async requireOrder(tenantId: string, orderId: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId, tenantId);
    if (!order) throw AppException.notFound('Order', orderId);
    return order;
  }

  private generateOrderNumber(type?: OrderType): string {
    const prefix = type === OrderType.INBOUND ? 'PO' : type === OrderType.RETURN ? 'RT' : 'SO';
    const shortId = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    return `${prefix}-${shortId}`;
  }

  // ── Mappers ───────────────────────────────────────────────────────────────────

  private toOrderResponse(order: Order): OrderResponseDto {
    return {
      id: order.id,
      tenantId: order.tenantId,
      warehouseId: order.warehouseId,
      orderNumber: order.orderNumber,
      type: order.type,
      status: order.status,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      notes: order.notes,
      priority: order.priority,
      expectedAt: order.expectedAt,
      confirmedAt: order.confirmedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      createdBy: order.createdBy,
      confirmedBy: order.confirmedBy,
      metadata: order.metadata,
      items: order.items?.map(this.toItemResponse),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private toItemResponse(item: OrderItem): OrderItemResponseDto {
    return {
      id: item.id,
      tenantId: item.tenantId,
      orderId: item.orderId,
      productId: item.productId,
      inventoryItemId: item.inventoryItemId,
      status: item.status,
      requestedQuantity: item.requestedQuantity,
      allocatedQuantity: item.allocatedQuantity,
      pickedQuantity: item.pickedQuantity,
      unitPrice: item.unitPrice,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
