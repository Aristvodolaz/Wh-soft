import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateOrderDto } from './create-order.dto';

// Allow updating header fields only — status is driven by transitions, not direct writes
export class UpdateOrderDto extends PartialType(
  OmitType(CreateOrderDto, ['warehouseId', 'items'] as const),
) {}
