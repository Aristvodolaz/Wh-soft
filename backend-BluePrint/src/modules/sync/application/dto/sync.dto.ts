import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export enum SyncOperationType {
  INVENTORY_MOVE = 'INVENTORY_MOVE',
  TASK_START = 'TASK_START',
  TASK_COMPLETE = 'TASK_COMPLETE',
  TASK_FAIL = 'TASK_FAIL',
}

export class SyncOperationDto {
  @ApiProperty({ format: 'uuid', description: 'Client-generated unique id — the idempotency key.' })
  @IsUUID()
  opId: string;

  @ApiProperty({ enum: SyncOperationType })
  @IsEnum(SyncOperationType)
  type: SyncOperationType;

  @ApiProperty({ type: Object, description: 'Operation arguments (same shape as the online endpoint).' })
  @IsObject()
  payload: Record<string, unknown>;

  @ApiProperty({ description: 'When the user performed the action on the terminal (ISO 8601).' })
  @IsDateString()
  occurredAt: string;
}

export class PushDto {
  @ApiProperty({ description: 'Terminal identifier.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deviceId: string;

  @ApiProperty({ type: [SyncOperationDto], description: 'Applied strictly in array order.' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations: SyncOperationDto[];
}

export type OperationOutcome =
  /** Applied now. */
  | 'APPLIED'
  /** Seen before — stored result returned, nothing re-applied. */
  | 'DUPLICATE'
  /** Business rule refused it; retrying will not help (operator review). */
  | 'REJECTED'
  /** Same opId is being processed by a concurrent request — ask again later. */
  | 'IN_FLIGHT'
  /** Transient failure — keep in the outbox and retry. */
  | 'RETRY';

export class OperationResultDto {
  @ApiProperty() opId: string;
  @ApiProperty({ enum: ['APPLIED', 'DUPLICATE', 'REJECTED', 'IN_FLIGHT', 'RETRY'] }) outcome: OperationOutcome;
  @ApiPropertyOptional({ type: Object }) result?: unknown;
  @ApiPropertyOptional({ type: Object }) error?: { code: string; message: string };
}

export class PushResponseDto {
  @ApiProperty() serverTime: string;
  @ApiProperty({ type: [OperationResultDto] }) results: OperationResultDto[];
}

export class PullQueryDto {
  @ApiPropertyOptional({ description: 'Cursor from the previous pull (ISO 8601). Omit for a full snapshot.' })
  @IsOptional()
  @IsDateString()
  since?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Warehouse whose cells are included in the catalogue.' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}
