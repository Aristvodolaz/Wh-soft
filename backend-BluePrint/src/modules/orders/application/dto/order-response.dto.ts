import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderItemStatus } from '../../domain/entities/order-item.entity';
import { OrderStatus, OrderType } from '../../domain/entities/order.entity';

// ── Order Item ────────────────────────────────────────────────────────────────

export class OrderItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() orderId: string;
  @ApiProperty() productId: string;
  @ApiPropertyOptional() inventoryItemId: string | null;
  @ApiProperty({ enum: OrderItemStatus }) status: OrderItemStatus;
  @ApiProperty() requestedQuantity: number;
  @ApiProperty() allocatedQuantity: number;
  @ApiProperty() pickedQuantity: number;
  @ApiPropertyOptional() unitPrice: number | null;
  @ApiPropertyOptional() notes: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

// ── Order ─────────────────────────────────────────────────────────────────────

export class OrderResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() warehouseId: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty({ enum: OrderType }) type: OrderType;
  @ApiProperty({ enum: OrderStatus }) status: OrderStatus;
  @ApiPropertyOptional() customerName: string | null;
  @ApiPropertyOptional() customerEmail: string | null;
  @ApiPropertyOptional() customerPhone: string | null;
  @ApiPropertyOptional({ type: Object }) shippingAddress: Record<string, unknown> | null;
  @ApiPropertyOptional() notes: string | null;
  @ApiProperty() priority: number;
  @ApiPropertyOptional() expectedAt: Date | null;
  @ApiPropertyOptional() confirmedAt: Date | null;
  @ApiPropertyOptional() shippedAt: Date | null;
  @ApiPropertyOptional() deliveredAt: Date | null;
  @ApiPropertyOptional() cancelledAt: Date | null;
  @ApiPropertyOptional() createdBy: string | null;
  @ApiPropertyOptional() confirmedBy: string | null;
  @ApiProperty({ type: Object }) metadata: Record<string, unknown>;
  @ApiPropertyOptional({ type: [OrderItemResponseDto] }) items?: OrderItemResponseDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
