import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { MovementType } from '../../domain/entities/inventory-movement.entity';

export class MoveInventoryDto {
  @ApiProperty({ description: 'Inventory item to move (UUID).' })
  @IsUUID()
  inventoryItemId: string;

  @ApiProperty({ description: 'Warehouse this movement belongs to.' })
  @IsUUID()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Source cell UUID. Leave empty for inbound receives.' })
  @IsOptional()
  @IsUUID()
  fromCellId?: string;

  @ApiPropertyOptional({
    description: 'Destination cell UUID. Leave empty for outbound dispatches.',
  })
  @IsOptional()
  @IsUUID()
  toCellId?: string;

  @ApiProperty({
    enum: MovementType,
    description: 'Movement classification.',
    example: MovementType.TRANSFER,
  })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiProperty({ example: 10, description: 'Number of units to move (must be > 0).' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'ORD-2026-001', description: 'Reference document (order, PO…).' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
