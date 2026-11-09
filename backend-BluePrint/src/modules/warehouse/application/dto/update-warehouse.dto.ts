import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateWarehouseDto } from './create-warehouse.dto';

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {
  @ApiPropertyOptional({ description: 'Deactivate or reactivate the warehouse' })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === '' ? undefined : value))
  @IsBoolean()
  isActive?: boolean;
}
