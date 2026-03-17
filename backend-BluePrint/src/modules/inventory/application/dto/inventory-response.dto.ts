import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementStatus, MovementType } from '../../domain/entities/inventory-movement.entity';
import { ProductUnit } from '../../domain/entities/product.entity';

// ── Product ───────────────────────────────────────────────────────────────────

export class ProductResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() sku: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description: string | null;
  @ApiPropertyOptional() barcode: string | null;
  @ApiProperty({ enum: ProductUnit }) unit: ProductUnit;
  @ApiPropertyOptional() weight: number | null;
  @ApiPropertyOptional() volume: number | null;
  @ApiProperty() minStockLevel: number;
  @ApiPropertyOptional() maxStockLevel: number | null;
  @ApiProperty() reorderPoint: number;
  @ApiProperty({ type: Object }) attributes: Record<string, unknown>;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

// ── Inventory Item ────────────────────────────────────────────────────────────

export class InventoryItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() warehouseId: string;
  @ApiProperty() productId: string;
  @ApiPropertyOptional() cellId: string | null;
  @ApiProperty() quantity: number;
  @ApiProperty() reservedQuantity: number;
  @ApiProperty({ description: 'quantity - reservedQuantity' }) availableQuantity: number;
  @ApiPropertyOptional() lotNumber: string | null;
  @ApiPropertyOptional() serialNumber: string | null;
  @ApiPropertyOptional() expiryDate: Date | null;
  @ApiPropertyOptional() costPrice: number | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

// ── Scan result ───────────────────────────────────────────────────────────────

export class ScanResultDto {
  @ApiProperty({
    enum: ['PRODUCT', 'CELL'],
    description: 'What the barcode matched against.',
  })
  matchType: 'PRODUCT' | 'CELL';

  @ApiPropertyOptional({ type: ProductResponseDto })
  product?: ProductResponseDto;

  @ApiPropertyOptional({ type: [InventoryItemResponseDto] })
  inventoryItems?: InventoryItemResponseDto[];

  @ApiPropertyOptional({ description: 'Cell code when matchType is CELL.' })
  cellCode?: string;

  @ApiPropertyOptional({ description: 'Zone code of the matched cell.' })
  zoneCode?: string;
}

// ── Movement ──────────────────────────────────────────────────────────────────

export class MovementResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() warehouseId: string;
  @ApiProperty() productId: string;
  @ApiProperty() inventoryItemId: string;
  @ApiPropertyOptional() fromCellId: string | null;
  @ApiPropertyOptional() toCellId: string | null;
  @ApiProperty({ enum: MovementType }) type: MovementType;
  @ApiProperty({ enum: MovementStatus }) status: MovementStatus;
  @ApiProperty() quantity: number;
  @ApiPropertyOptional() reference: string | null;
  @ApiPropertyOptional() notes: string | null;
  @ApiPropertyOptional() performedBy: string | null;
  @ApiPropertyOptional() completedAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
