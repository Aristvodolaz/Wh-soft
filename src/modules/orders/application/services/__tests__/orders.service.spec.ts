import { Test, TestingModule } from '@nestjs/testing';
import { EventBusService } from '../../../../../infrastructure/event-bus/event-bus.service';
import { AppException } from '../../../../../shared/exceptions/app.exception';
import { OrderItem, OrderItemStatus } from '../../../domain/entities/order-item.entity';
import { Order, OrderStatus, OrderType } from '../../../domain/entities/order.entity';
import { OrderItemRepository } from '../../../infrastructure/repositories/order-item.repository';
import { OrderRepository } from '../../../infrastructure/repositories/order.repository';
import { OrdersService } from '../orders.service';

// ── helpers ───────────────────────────────────────────────────────────────────

const TENANT = 'tenant-uuid';
const WH_ID = 'wh-uuid';
const ORDER_ID = 'order-uuid';
const USER_ID = 'user-uuid';
const PRODUCT_ID = 'product-uuid';
const ITEM_ID = 'item-uuid';

const makeOrder = (overrides: Partial<Order> = {}): Order =>
  Object.assign(new Order(), {
    id: ORDER_ID,
    tenantId: TENANT,
    warehouseId: WH_ID,
    orderNumber: 'SO-00000001',
    type: OrderType.OUTBOUND,
    status: OrderStatus.DRAFT,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    shippingAddress: null,
    notes: null,
    priority: 5,
    expectedAt: null,
    confirmedAt: null,
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    createdBy: USER_ID,
    confirmedBy: null,
    metadata: {},
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

const makeItem = (overrides: Partial<OrderItem> = {}): OrderItem =>
  Object.assign(new OrderItem(), {
    id: ITEM_ID,
    tenantId: TENANT,
    orderId: ORDER_ID,
    productId: PRODUCT_ID,
    inventoryItemId: null,
    status: OrderItemStatus.PENDING,
    requestedQuantity: 5,
    allocatedQuantity: 0,
    pickedQuantity: 0,
    unitPrice: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

// ── suite ─────────────────────────────────────────────────────────────────────

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<OrderRepository>;
  let orderItemRepository: jest.Mocked<OrderItemRepository>;
  let eventBus: jest.Mocked<EventBusService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: OrderRepository,
          useValue: {
            findAllByTenant: jest.fn(),
            findById: jest.fn(),
            existsByOrderNumber: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: OrderItemRepository,
          useValue: {
            findByOrder: jest.fn(),
            findById: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get(OrderRepository);
    orderItemRepository = module.get(OrderItemRepository);
    eventBus = module.get(EventBusService);
  });

  // ── createOrder ──────────────────────────────────────────────────────────────

  describe('createOrder', () => {
    it('creates an order with auto-generated number when none provided', async () => {
      orderRepository.existsByOrderNumber.mockResolvedValueOnce(false);
      const saved = makeOrder();
      orderRepository.save.mockResolvedValueOnce(saved);
      orderRepository.findById.mockResolvedValueOnce(saved);

      const result = await service.createOrder(TENANT, USER_ID, {
        warehouseId: WH_ID,
      });

      expect(result.status).toBe(OrderStatus.DRAFT);
      expect(result.createdBy).toBe(USER_ID);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'order.created' }),
      );
    });

    it('throws 409 when order number already exists', async () => {
      orderRepository.existsByOrderNumber.mockResolvedValueOnce(true);
      await expect(
        service.createOrder(TENANT, USER_ID, { warehouseId: WH_ID, orderNumber: 'SO-DUP' }),
      ).rejects.toThrow(AppException);
    });

    it('uses provided order number (uppercased)', async () => {
      orderRepository.existsByOrderNumber.mockResolvedValueOnce(false);
      const saved = makeOrder({ orderNumber: 'SO-CUSTOM' });
      orderRepository.save.mockResolvedValueOnce(saved);
      orderRepository.findById.mockResolvedValueOnce(saved);

      await service.createOrder(TENANT, USER_ID, {
        warehouseId: WH_ID,
        orderNumber: 'so-custom',
      });

      expect(orderRepository.existsByOrderNumber).toHaveBeenCalledWith('SO-CUSTOM', TENANT);
    });
  });

  // ── getOrder ─────────────────────────────────────────────────────────────────

  describe('getOrder', () => {
    it('returns the order when found', async () => {
      orderRepository.findById.mockResolvedValueOnce(makeOrder());
      const result = await service.getOrder(TENANT, ORDER_ID);
      expect(result.id).toBe(ORDER_ID);
    });

    it('throws 404 when order not found', async () => {
      orderRepository.findById.mockResolvedValueOnce(null);
      await expect(service.getOrder(TENANT, 'ghost')).rejects.toThrow(AppException);
    });
  });

  // ── addItem ───────────────────────────────────────────────────────────────────

  describe('addItem', () => {
    it('adds a line item to a DRAFT order', async () => {
      orderRepository.findById.mockResolvedValueOnce(makeOrder());
      const item = makeItem();
      orderItemRepository.save.mockResolvedValueOnce(item);

      const result = await service.addItem(TENANT, ORDER_ID, {
        productId: PRODUCT_ID,
        requestedQuantity: 5,
      });

      expect(result.productId).toBe(PRODUCT_ID);
      expect(result.status).toBe(OrderItemStatus.PENDING);
    });

    it('throws 422 when order is not in DRAFT status', async () => {
      orderRepository.findById.mockResolvedValueOnce(makeOrder({ status: OrderStatus.CONFIRMED }));
      await expect(
        service.addItem(TENANT, ORDER_ID, { productId: PRODUCT_ID, requestedQuantity: 1 }),
      ).rejects.toThrow(AppException);
    });
  });

  // ── removeItem ────────────────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('removes an item from a DRAFT order', async () => {
      orderRepository.findById.mockResolvedValueOnce(makeOrder());
      orderItemRepository.findById.mockResolvedValueOnce(makeItem());
      orderItemRepository.remove.mockResolvedValueOnce(undefined);

      await expect(service.removeItem(TENANT, ORDER_ID, ITEM_ID)).resolves.toBeUndefined();
      expect(orderItemRepository.remove).toHaveBeenCalledWith(ITEM_ID, TENANT);
    });

    it('throws 404 when item not found', async () => {
      orderRepository.findById.mockResolvedValueOnce(makeOrder());
      orderItemRepository.findById.mockResolvedValueOnce(null);

      await expect(service.removeItem(TENANT, ORDER_ID, 'ghost')).rejects.toThrow(AppException);
    });
  });

  // ── transitionStatus ──────────────────────────────────────────────────────────

  describe('transitionStatus', () => {
    it('transitions DRAFT → CONFIRMED and sets confirmedAt', async () => {
      const order = makeOrder();
      orderRepository.findById.mockResolvedValueOnce(order);
      orderRepository.save.mockImplementationOnce(async (o) => o as Order);

      const result = await service.transitionStatus(
        TENANT,
        ORDER_ID,
        OrderStatus.CONFIRMED,
        USER_ID,
      );

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(result.confirmedAt).toBeDefined();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'order.confirmed' }),
      );
    });

    it('throws 422 for invalid transition (DRAFT → SHIPPED)', async () => {
      orderRepository.findById.mockResolvedValueOnce(makeOrder());
      await expect(service.transitionStatus(TENANT, ORDER_ID, OrderStatus.SHIPPED)).rejects.toThrow(
        AppException,
      );
    });

    it('throws 422 when order is already in a terminal state', async () => {
      orderRepository.findById.mockResolvedValueOnce(makeOrder({ status: OrderStatus.CANCELLED }));
      await expect(
        service.transitionStatus(TENANT, ORDER_ID, OrderStatus.CONFIRMED),
      ).rejects.toThrow(AppException);
    });

    it('transitions PACKED → SHIPPED and sets shippedAt', async () => {
      const order = makeOrder({ status: OrderStatus.PACKED });
      orderRepository.findById.mockResolvedValueOnce(order);
      orderRepository.save.mockImplementationOnce(async (o) => o as Order);

      const result = await service.transitionStatus(TENANT, ORDER_ID, OrderStatus.SHIPPED, USER_ID);

      expect(result.status).toBe(OrderStatus.SHIPPED);
      expect(result.shippedAt).toBeDefined();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'order.shipped' }),
      );
    });
  });
});
