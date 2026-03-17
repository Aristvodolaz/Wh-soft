import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CellSpecDto {
  @ApiProperty({ example: 'A-01-01', description: 'Unique cell code within the zone.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({
    example: 'BC-WH1-A-01-01',
    description: 'Optional globally unique barcode for scanner lookup.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @ApiPropertyOptional({ example: 'A', description: 'Aisle identifier.' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  aisle?: string;

  @ApiPropertyOptional({ example: '01', description: 'Bay within the aisle.' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bay?: string;

  @ApiPropertyOptional({ example: '01', description: 'Vertical level / shelf.' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  level?: string;

  @ApiPropertyOptional({ example: '01', description: 'Horizontal position on the shelf.' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  position?: string;

  @ApiPropertyOptional({ example: 500, description: 'Maximum load in kilograms.' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxWeight?: number;

  @ApiPropertyOptional({ example: 2.5, description: 'Maximum volume in cubic metres.' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxVolume?: number;
}

export class BulkCreateCellsDto {
  @ApiProperty({ description: 'Zone to create the cells in (must belong to the warehouse).' })
  @IsUUID()
  zoneId: string;

  @ApiProperty({
    type: [CellSpecDto],
    description: 'Cell definitions to create. Maximum 1 000 per request.',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one cell must be provided' })
  @ArrayMaxSize(1000, { message: 'Maximum 1 000 cells per request' })
  @ValidateNested({ each: true })
  @Type(() => CellSpecDto)
  cells: CellSpecDto[];
}
