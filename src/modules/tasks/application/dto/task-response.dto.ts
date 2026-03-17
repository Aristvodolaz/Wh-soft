import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus, TaskType } from '../../domain/entities/task.entity';

export class TaskResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() warehouseId: string;
  @ApiPropertyOptional() orderId: string | null;
  @ApiPropertyOptional() inventoryMovementId: string | null;
  @ApiProperty({ enum: TaskType }) type: TaskType;
  @ApiProperty({ enum: TaskStatus }) status: TaskStatus;
  @ApiProperty({ enum: TaskPriority }) priority: TaskPriority;
  @ApiProperty() title: string;
  @ApiPropertyOptional() description: string | null;
  @ApiPropertyOptional() assignedTo: string | null;
  @ApiPropertyOptional() assignedAt: Date | null;
  @ApiPropertyOptional() startedAt: Date | null;
  @ApiPropertyOptional() completedAt: Date | null;
  @ApiPropertyOptional() dueAt: Date | null;
  @ApiPropertyOptional() fromCellId: string | null;
  @ApiPropertyOptional() toCellId: string | null;
  @ApiPropertyOptional() productId: string | null;
  @ApiPropertyOptional() quantity: number | null;
  @ApiPropertyOptional() notes: string | null;
  @ApiProperty({ type: Object }) metadata: Record<string, unknown>;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
