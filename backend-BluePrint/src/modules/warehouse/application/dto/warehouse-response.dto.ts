import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ZoneType } from '../../domain/entities/zone.entity';

// ── Warehouse ─────────────────────────────────────────────────────────────────

export class WarehouseResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() name: string;
  @ApiProperty() code: string;
  @ApiPropertyOptional() address: string | null;
  @ApiPropertyOptional() city: string | null;
  @ApiPropertyOptional() country: string | null;
  @ApiProperty() timezone: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ type: Object }) settings: Record<string, unknown>;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

// ── Zone ──────────────────────────────────────────────────────────────────────

export class ZoneResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() warehouseId: string;
  @ApiProperty() name: string;
  @ApiProperty() code: string;
  @ApiProperty({ enum: ZoneType }) type: ZoneType;
  @ApiPropertyOptional() description: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

// ── Cell ──────────────────────────────────────────────────────────────────────

export class CellResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() warehouseId: string;
  @ApiProperty() zoneId: string;
  @ApiProperty() code: string;
  @ApiPropertyOptional() barcode: string | null;
  @ApiPropertyOptional() aisle: string | null;
  @ApiPropertyOptional() bay: string | null;
  @ApiPropertyOptional() level: string | null;
  @ApiPropertyOptional() position: string | null;
  @ApiPropertyOptional() maxWeight: number | null;
  @ApiPropertyOptional() maxVolume: number | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() isOccupied: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

// ── Bulk result ───────────────────────────────────────────────────────────────

export class BulkCreateCellsResponseDto {
  @ApiProperty({ description: 'Number of cells created' }) created: number;
  @ApiProperty({ type: [CellResponseDto] }) cells: CellResponseDto[];
}
