import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventBusService } from '../../../../infrastructure/event-bus/event-bus.service';
import { AppException } from '../../../../shared/exceptions/app.exception';
import { Cell } from '../../../warehouse/domain/entities/cell.entity';
import { InventoryItem } from '../../domain/entities/inventory-item.entity';
import { InventoryMovement, MovementStatus } from '../../domain/entities/inventory-movement.entity';
import { Product } from '../../domain/entities/product.entity';
import { InventoryItemRepository } from '../../infrastructure/repositories/inventory-item.repository';
import { InventoryMovementRepository } from '../../infrastructure/repositories/inventory-movement.repository';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { CreateProductDto } from '../dto/create-product.dto';
import { MoveInventoryDto } from '../dto/move-inventory.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import {
  InventoryItemResponseDto,
  MovementResponseDto,
  ProductResponseDto,
  ScanResultDto,
} from '../dto/inventory-response.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly inventoryItemRepository: InventoryItemRepository,
    private readonly movementRepository: InventoryMovementRepository,
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBusService,
  ) {}

  // ── Products ────────────────────────────────────────────────────────────────

  async listProducts(tenantId: string): Promise<ProductResponseDto[]> {
    const products = await this.productRepository.findAllByTenant(tenantId);
    return products.map(this.toProductResponse);
  }

  async createProduct(tenantId: string, dto: CreateProductDto): Promise<ProductResponseDto> {
    const sku = dto.sku.toUpperCase();
    const exists = await this.productRepository.existsBySku(sku, tenantId);
    if (exists) throw AppException.conflict(`Product with SKU "${sku}" already exists`);

    const product = Object.assign(new Product(), {
      tenantId,
      sku,
      name: dto.name,
      description: dto.description ?? null,
      barcode: dto.barcode ?? null,
      unit: dto.unit ?? 'PIECE',
      weight: dto.weight ?? null,
      volume: dto.volume ?? null,
      minStockLevel: dto.minStockLevel ?? 0,
      maxStockLevel: dto.maxStockLevel ?? null,
      reorderPoint: dto.reorderPoint ?? 0,
      attributes: dto.attributes ?? {},
      isActive: true,
    });

    const saved = await this.productRepository.save(product);
    this.logger.log(`Product "${saved.sku}" created for tenant ${tenantId}`);
    return this.toProductResponse(saved);
  }

  async getProduct(tenantId: string, productId: string): Promise<ProductResponseDto> {
    const product = await this.productRepository.findById(productId, tenantId);
    if (!product) throw AppException.notFound('Product', productId);
    return this.toProductResponse(product);
  }

  async updateProduct(
    tenantId: string,
    productId: string,
    dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productRepository.findById(productId, tenantId);
    if (!product) throw AppException.notFound('Product', productId);

    if (dto.sku) {
      const sku = dto.sku.toUpperCase();
      const conflict = await this.productRepository.existsBySku(sku, tenantId, productId);
      if (conflict) throw AppException.conflict(`SKU "${sku}" is already taken`);
      product.sku = sku;
    }

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.description !== undefined) product.description = dto.description ?? null;
    if (dto.barcode !== undefined) product.barcode = dto.barcode ?? null;
    if (dto.unit !== undefined) product.unit = dto.unit;
    if (dto.weight !== undefined) product.weight = dto.weight ?? null;
    if (dto.volume !== undefined) product.volume = dto.volume ?? null;
    if (dto.minStockLevel !== undefined) product.minStockLevel = dto.minStockLevel;
    if (dto.maxStockLevel !== undefined) product.maxStockLevel = dto.maxStockLevel ?? null;
    if (dto.reorderPoint !== undefined) product.reorderPoint = dto.reorderPoint;
    if (dto.attributes !== undefined) product.attributes = dto.attributes;
    if (dto.isActive !== undefined) product.isActive = dto.isActive;

    return this.toProductResponse(await this.productRepository.save(product));
  }

  // ── Inventory items ─────────────────────────────────────────────────────────

  async listInventory(tenantId: string, warehouseId: string): Promise<InventoryItemResponseDto[]> {
    const items = await this.inventoryItemRepository.findByWarehouse(warehouseId, tenantId);
    return items.map(this.toItemResponse);
  }

  // ── Scan ─────────────────────────────────────────────────────────────────────

  /**
   * Resolve a scanned barcode to either:
   *   - A product (by product barcode) — shows stock across all cells
   *   - A cell (by cell barcode)       — shows all items in that cell
   */
  async scan(tenantId: string, barcode: string, warehouseId: string): Promise<ScanResultDto> {
    // 1. Try product barcode
    const product = await this.productRepository.findByBarcode(barcode, tenantId);
    if (product) {
      const items = await this.inventoryItemRepository.findByProductAndWarehouse(
        product.id,
        warehouseId,
        tenantId,
      );
      return {
        matchType: 'PRODUCT',
        product: this.toProductResponse(product),
        inventoryItems: items.map(this.toItemResponse),
      };
    }

    // 2. Try cell barcode (cross-module query via DataSource)
    const cell = await this.dataSource
      .getRepository(Cell)
      .findOne({ where: { barcode, warehouseId, tenantId }, relations: ['zone'] });

    if (cell) {
      const items = await this.inventoryItemRepository.findByCell(cell.id, tenantId);
      return {
        matchType: 'CELL',
        cellCode: cell.code,
        zoneCode: cell.zone?.code,
        inventoryItems: items.map(this.toItemResponse),
      };
    }

    throw AppException.notFound('Barcode', barcode);
  }

  // ── Move ──────────────────────────────────────────────────────────────────────

  /**
   * Transactional inventory move:
   *  1. Lock + validate source item (sufficient available qty)
   *  2. Deduct from source, clear cell occupancy if drained
   *  3. Find or create destination inventory item
   *  4. Increment destination, mark cell as occupied
   *  5. Record InventoryMovement (status = COMPLETED)
   *  6. Emit domain event: inventory.moved
   */
  async move(
    tenantId: string,
    performedBy: string,
    dto: MoveInventoryDto,
  ): Promise<MovementResponseDto> {
    const movement = await this.dataSource.transaction(async (manager) => {
      // Lock source item for update
      const sourceItem = await manager
        .getRepository(InventoryItem)
        .createQueryBuilder('item')
        .setLock('pessimistic_write')
        .where('item.id = :id AND item.tenant_id = :tenantId', {
          id: dto.inventoryItemId,
          tenantId,
        })
        .getOne();

      if (!sourceItem) throw AppException.notFound('InventoryItem', dto.inventoryItemId);

      if (sourceItem.warehouseId !== dto.warehouseId) {
        throw AppException.unprocessable(
          'Inventory item does not belong to the specified warehouse',
        );
      }

      if (dto.fromCellId && sourceItem.cellId !== dto.fromCellId) {
        throw AppException.unprocessable(
          'fromCellId does not match the current location of the inventory item',
        );
      }

      if (sourceItem.availableQuantity < dto.quantity) {
        throw AppException.unprocessable(
          `Insufficient available stock. Requested: ${dto.quantity}, Available: ${sourceItem.availableQuantity}`,
        );
      }

      // Deduct from source
      sourceItem.quantity -= dto.quantity;
      await manager.save(InventoryItem, sourceItem);

      // Clear cell occupancy when fully emptied
      if (sourceItem.cellId && sourceItem.quantity === 0) {
        await manager.getRepository(Cell).update({ id: sourceItem.cellId }, { isOccupied: false });
      }

      // Find or create destination inventory item
      let destItem: InventoryItem | null = null;
      if (dto.toCellId) {
        destItem = await manager.getRepository(InventoryItem).findOne({
          where: {
            productId: sourceItem.productId,
            cellId: dto.toCellId,
            warehouseId: dto.warehouseId,
            tenantId,
          },
        });

        if (!destItem) {
          destItem = manager.getRepository(InventoryItem).create({
            tenantId,
            warehouseId: dto.warehouseId,
            productId: sourceItem.productId,
            cellId: dto.toCellId,
            quantity: 0,
            reservedQuantity: 0,
            lotNumber: sourceItem.lotNumber,
            expiryDate: sourceItem.expiryDate,
            costPrice: sourceItem.costPrice,
          });
        }

        destItem.quantity += dto.quantity;
        await manager.save(InventoryItem, destItem);

        // Mark destination cell as occupied
        await manager.getRepository(Cell).update({ id: dto.toCellId }, { isOccupied: true });
      }

      // Record the movement
      const mov = manager.getRepository(InventoryMovement).create({
        tenantId,
        warehouseId: dto.warehouseId,
        productId: sourceItem.productId,
        inventoryItemId: sourceItem.id,
        fromCellId: dto.fromCellId ?? sourceItem.cellId,
        toCellId: dto.toCellId ?? null,
        type: dto.type,
        status: MovementStatus.COMPLETED,
        quantity: dto.quantity,
        reference: dto.reference ?? null,
        notes: dto.notes ?? null,
        performedBy,
        completedAt: new Date(),
      });

      return manager.save(InventoryMovement, mov);
    });

    this.logger.log(
      `Inventory moved: item=${dto.inventoryItemId} qty=${dto.quantity} ` +
        `from=${dto.fromCellId ?? 'none'} to=${dto.toCellId ?? 'none'} by=${performedBy}`,
    );

    // Domain event (fire-and-forget — non-transactional)
    void this.eventBus.publish({
      eventName: 'inventory.moved',
      occurredAt: new Date(),
      aggregateId: movement.id,
      tenantId,
      payload: {
        movementId: movement.id,
        inventoryItemId: dto.inventoryItemId,
        productId: movement.productId,
        warehouseId: dto.warehouseId,
        fromCellId: movement.fromCellId,
        toCellId: movement.toCellId,
        quantity: dto.quantity,
        type: dto.type,
        performedBy,
      },
    });

    return this.toMovementResponse(movement);
  }

  // ── Mappers ──────────────────────────────────────────────────────────────────

  private toProductResponse(p: Product): ProductResponseDto {
    return {
      id: p.id,
      tenantId: p.tenantId,
      sku: p.sku,
      name: p.name,
      description: p.description,
      barcode: p.barcode,
      unit: p.unit,
      weight: p.weight,
      volume: p.volume,
      minStockLevel: p.minStockLevel,
      maxStockLevel: p.maxStockLevel,
      reorderPoint: p.reorderPoint,
      attributes: p.attributes,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private toItemResponse(item: InventoryItem): InventoryItemResponseDto {
    return {
      id: item.id,
      tenantId: item.tenantId,
      warehouseId: item.warehouseId,
      productId: item.productId,
      cellId: item.cellId,
      quantity: item.quantity,
      reservedQuantity: item.reservedQuantity,
      availableQuantity: item.availableQuantity,
      lotNumber: item.lotNumber,
      serialNumber: item.serialNumber,
      expiryDate: item.expiryDate,
      costPrice: item.costPrice,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private toMovementResponse(m: InventoryMovement): MovementResponseDto {
    return {
      id: m.id,
      tenantId: m.tenantId,
      warehouseId: m.warehouseId,
      productId: m.productId,
      inventoryItemId: m.inventoryItemId,
      fromCellId: m.fromCellId,
      toCellId: m.toCellId,
      type: m.type,
      status: m.status,
      quantity: m.quantity,
      reference: m.reference,
      notes: m.notes,
      performedBy: m.performedBy,
      completedAt: m.completedAt,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }
}
