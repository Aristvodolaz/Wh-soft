import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductUnit } from '../../domain/entities/product.entity';

export class CreateProductDto {
  @ApiProperty({ example: 'SKU-001', description: 'Unique SKU within the tenant.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku: string;

  @ApiProperty({ example: 'Widget Type A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Industrial grade widget for assembly line B.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '5901234123457', description: 'EAN / UPC barcode.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @ApiPropertyOptional({ enum: ProductUnit, default: ProductUnit.PIECE })
  @IsOptional()
  @IsEnum(ProductUnit)
  unit?: ProductUnit;

  @ApiPropertyOptional({ example: 0.45, description: 'Weight in kilograms.' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ example: 0.002, description: 'Volume in cubic metres.' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  volume?: number;

  @ApiPropertyOptional({ example: 10, description: 'Alert when stock drops below this level.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStockLevel?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStockLevel?: number;

  @ApiPropertyOptional({ example: 20, description: 'Trigger replenishment when stock hits this.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderPoint?: number;

  @ApiPropertyOptional({ type: Object, description: 'Arbitrary product metadata (color, size…).' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
