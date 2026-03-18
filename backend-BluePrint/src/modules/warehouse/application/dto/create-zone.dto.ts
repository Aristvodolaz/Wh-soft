import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ZoneType } from '../../domain/entities/zone.entity';

export class CreateZoneDto {
  @ApiProperty({ example: 'Receiving Bay A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 'RCV-A',
    description: 'Unique zone code within the warehouse.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({
    enum: ZoneType,
    default: ZoneType.STORAGE,
    description: 'Zone classification determines operational rules.',
  })
  @IsOptional()
  @IsEnum(ZoneType)
  type?: ZoneType;

  @ApiPropertyOptional({ example: 'Cold storage for perishables, maintained at 2–8°C' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
