import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

// ── Replenishment ───────────────────────────────────────────────────────────────

export class ReplenishmentQueryDto {
  @ApiPropertyOptional({ default: 90, description: 'Training window for the model, days.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(14)
  @Max(365)
  windowDays?: number;

  @ApiPropertyOptional({ default: 24, description: 'Replenishment lead time, hours.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  leadTimeHours?: number;

  @ApiPropertyOptional({ default: 12, description: 'Safety margin, hours.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  safetyHours?: number;
}

// ── Slotting ────────────────────────────────────────────────────────────────────

export class SlottingQueryDto {
  @ApiPropertyOptional({ default: 12, description: 'Rolling window, weeks.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(4)
  @Max(52)
  windowWeeks?: number;

  @ApiPropertyOptional({ default: 10, description: 'Min. travel saving (m / window) to relocate an X-class SKU.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minSavingsM?: number;

  @ApiPropertyOptional({ default: 3, description: 'Distance between aisles, m.' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  aisleSpacing?: number;

  @ApiPropertyOptional({ default: 1.2, description: 'Bay length, m.' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  bayLength?: number;
}

export class ValidatePlacementDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cellId: string;
}

export class ApplySlottingDto extends SlottingQueryDto {
  @ApiPropertyOptional({ description: 'Max number of TRANSFER tasks to create (best savings first).', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

// ── Workforce ───────────────────────────────────────────────────────────────────

export class WorkloadQueryDto {
  @ApiPropertyOptional({ default: 480, description: 'Shift length, minutes.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(720)
  shiftMinutes?: number;

  @ApiPropertyOptional({ default: 45, description: 'Breaks per shift, minutes.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  breakMinutes?: number;

  @ApiPropertyOptional({ default: 0.85, description: 'Share of the shift spent on tasks (0..1).' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.3)
  @Max(1)
  utilization?: number;
}

// ── Loading ─────────────────────────────────────────────────────────────────────

export class VehicleDto {
  @ApiProperty({ description: 'Cargo space length, cm' }) @IsPositive() @IsNumber() length: number;
  @ApiProperty({ description: 'Cargo space width, cm' }) @IsPositive() @IsNumber() width: number;
  @ApiProperty({ description: 'Cargo space height, cm' }) @IsPositive() @IsNumber() height: number;
  @ApiProperty({ description: 'Max payload, kg' }) @IsPositive() @IsNumber() maxPayloadKg: number;

  @ApiPropertyOptional({ description: 'Front axle position from the front wall, cm' }) @IsOptional() @IsNumber() frontAxleX?: number;
  @ApiPropertyOptional({ description: 'Rear axle position from the front wall, cm' }) @IsOptional() @IsNumber() rearAxleX?: number;
  @ApiPropertyOptional() @IsOptional() @IsPositive() @IsNumber() maxFrontAxleKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsPositive() @IsNumber() maxRearAxleKg?: number;
  @ApiPropertyOptional({ description: 'Empty vehicle weight, kg' }) @IsOptional() @Min(0) @IsNumber() tareKg?: number;
  @ApiPropertyOptional({ description: 'Empty vehicle COG, cm from the front wall' }) @IsOptional() @IsNumber() tareCogX?: number;
  @ApiPropertyOptional({ default: 0.15 }) @IsOptional() @Min(0.01) @Max(0.5) @IsNumber() cogToleranceX?: number;
  @ApiPropertyOptional({ default: 0.1 }) @IsOptional() @Min(0.01) @Max(0.5) @IsNumber() cogToleranceY?: number;
}

export class CargoItemDto {
  @ApiProperty() @IsString() id: string;
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;
  @ApiProperty({ description: 'cm' }) @IsPositive() @IsNumber() l: number;
  @ApiProperty({ description: 'cm' }) @IsPositive() @IsNumber() w: number;
  @ApiProperty({ description: 'cm' }) @IsPositive() @IsNumber() h: number;
  @ApiProperty({ description: 'kg' }) @IsPositive() @IsNumber() weightKg: number;
  @ApiProperty({ description: 'Delivery sequence on the route, 1 = first drop' }) @IsInt() @Min(1) stop: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() thisSideUp?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() fragile?: boolean;
  @ApiPropertyOptional({ description: 'kg allowed on top' }) @IsOptional() @Min(0) @IsNumber() maxLoadAboveKg?: number;
}

export class RouteOrderDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() orderId: string;
  @ApiProperty({ description: 'Position of this order’s delivery point on the route (1 = first)' })
  @IsInt() @Min(1) stop: number;
}

export class LoadingPlanDto {
  @ApiProperty({ type: VehicleDto })
  @ValidateNested()
  @Type(() => VehicleDto)
  vehicle: VehicleDto;

  @ApiPropertyOptional({ type: [CargoItemDto], description: 'Explicit cargo. Either `cargo` or `orders` is required.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CargoItemDto)
  cargo?: CargoItemDto[];

  @ApiPropertyOptional({ type: [RouteOrderDto], description: 'Orders loaded onto the vehicle, with their route stop.' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RouteOrderDto)
  orders?: RouteOrderDto[];

  @ApiPropertyOptional({ default: 5000, description: 'Compute budget, ms (max 5000).' })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(5000)
  timeLimitMs?: number;
}
