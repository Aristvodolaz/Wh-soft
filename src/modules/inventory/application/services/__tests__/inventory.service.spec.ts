import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { EventBusService } from '../../../../../infrastructure/event-bus/event-bus.service';
import { AppException } from '../../../../../shared/exceptions/app.exception';
import { InventoryItem } from '../../../domain/entities/inventory-item.entity';
import { Product, ProductUnit } from '../../../domain/entities/product.entity';
import { InventoryItemRepository } from '../../../infrastructure/repositories/inventory-item.repository';
import { InventoryMovementRepository } from '../../../infrastructure/repositories/inventory-movement.repository';
import { ProductRepository } from '../../../infrastructure/repositories/product.repository';
import { CreateProductDto } from '../../dto/create-product.dto';
import { InventoryService } from '../inventory.service';

// ── helpers ───────────────────────────────────────────────────────────────────

const TENANT = 'tenant-uuid';
const WH_ID = 'wh-uuid';
const PRODUCT_ID = 'product-uuid';
const ITEM_ID = 'item-uuid';
const CELL_A = 'cell-a-uuid';

const makeProduct = (overrides: Partial<Product> = {}): Product =>
  Object.assign(new Product(), {
    id: PRODUCT_ID,
    tenantId: TENANT,
    sku: 'SKU-001',
    name: 'Widget A',
    description: null,
    barcode: null,
    unit: ProductUnit.PIECE,
    weight: null,
    volume: null,
    minStockLevel: 0,
    maxStockLevel: null,
    reorderPoint: 0,
    attributes: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

const makeItem = (overrides: Partial<InventoryItem> = {}): InventoryItem => {
  const item = Object.assign(new InventoryItem(), {
    id: ITEM_ID,
    tenantId: TENANT,
    warehouseId: WH_ID,
    productId: PRODUCT_ID,
    cellId: CELL_A,
    quantity: 100,
    reservedQuantity: 10,
    lotNumber: null,
    serialNumber: null,
    expiryDate: null,
    costPrice: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
  return item;
};

// ── suite ─────────────────────────────────────────────────────────────────────

describe('InventoryService', () => {
  let service: InventoryService;
  let productRepository: jest.Mocked<ProductRepository>;
  let inventoryItemRepository: jest.Mocked<InventoryItemRepository>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: ProductRepository,
          useValue: {
            findAllByTenant: jest.fn(),
            findById: jest.fn(),
            findByBarcode: jest.fn(),
            existsBySku: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: InventoryItemRepository,
          useValue: {
            findByWarehouse: jest.fn(),
            findByProductAndWarehouse: jest.fn(),
            findByCell: jest.fn(),
          },
        },
        {
          provide: InventoryMovementRepository,
          useValue: { save: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
            getRepository: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    productRepository = module.get(ProductRepository);
    inventoryItemRepository = module.get(InventoryItemRepository);
    dataSource = module.get(DataSource);
  });

  // ── createProduct ──────────────────────────────────────────────────────────

  describe('createProduct', () => {
    const dto: CreateProductDto = { name: 'New Widget', sku: 'sku-new' };

    it('creates and returns the product', async () => {
      productRepository.existsBySku.mockResolvedValueOnce(false);
      productRepository.save.mockResolvedValueOnce(makeProduct({ sku: 'SKU-NEW' }));

      const result = await service.createProduct(TENANT, dto);

      expect(productRepository.existsBySku).toHaveBeenCalledWith('SKU-NEW', TENANT);
      expect(result.sku).toBe('SKU-NEW');
    });

    it('throws 409 when SKU is already taken', async () => {
      productRepository.existsBySku.mockResolvedValueOnce(true);
      await expect(service.createProduct(TENANT, dto)).rejects.toThrow(AppException);
    });

    it('uppercases the SKU', async () => {
      productRepository.existsBySku.mockResolvedValueOnce(false);
      productRepository.save.mockResolvedValueOnce(makeProduct({ sku: 'SKU-ABC' }));
      await service.createProduct(TENANT, { name: 'X', sku: 'sku-abc' });
      expect(productRepository.existsBySku).toHaveBeenCalledWith('SKU-ABC', TENANT);
    });
  });

  // ── getProduct ─────────────────────────────────────────────────────────────

  describe('getProduct', () => {
    it('returns the product when found', async () => {
      productRepository.findById.mockResolvedValueOnce(makeProduct());
      const result = await service.getProduct(TENANT, PRODUCT_ID);
      expect(result.id).toBe(PRODUCT_ID);
    });

    it('throws 404 when product not found', async () => {
      productRepository.findById.mockResolvedValueOnce(null);
      await expect(service.getProduct(TENANT, 'ghost')).rejects.toThrow(AppException);
    });
  });

  // ── listInventory ──────────────────────────────────────────────────────────

  describe('listInventory', () => {
    it('returns mapped inventory items', async () => {
      inventoryItemRepository.findByWarehouse.mockResolvedValueOnce([makeItem()]);
      const result = await service.listInventory(TENANT, WH_ID);
      expect(result).toHaveLength(1);
      expect(result[0].availableQuantity).toBe(90); // 100 - 10
    });
  });

  // ── scan ───────────────────────────────────────────────────────────────────

  describe('scan', () => {
    it('returns PRODUCT match when barcode matches a product', async () => {
      productRepository.findByBarcode.mockResolvedValueOnce(makeProduct({ barcode: 'EAN-123' }));
      inventoryItemRepository.findByProductAndWarehouse.mockResolvedValueOnce([makeItem()]);

      const result = await service.scan(TENANT, 'EAN-123', WH_ID);

      expect(result.matchType).toBe('PRODUCT');
      expect(result.product?.sku).toBe('SKU-001');
      expect(result.inventoryItems).toHaveLength(1);
    });

    it('throws 404 when no product or cell matches', async () => {
      productRepository.findByBarcode.mockResolvedValueOnce(null);
      (dataSource.getRepository as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockResolvedValueOnce(null),
      });
      await expect(service.scan(TENANT, 'UNKNOWN', WH_ID)).rejects.toThrow(AppException);
    });
  });
});
