export enum OrderType {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  IN_PICKING = 'IN_PICKING',
  PICKED = 'PICKED',
  IN_PACKING = 'IN_PACKING',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  requestedQuantity: number
  pickedQuantity?: number
  notes?: string
  // Populated
  product?: {
    id: string
    sku: string
    name: string
    unit: string
  }
}

export interface Order {
  id: string
  tenantId: string
  warehouseId: string
  orderNumber?: string
  type: OrderType
  status: OrderStatus
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: Record<string, unknown>
  notes?: string
  priority: number
  expectedAt?: string
  confirmedAt?: string
  shippedAt?: string
  deliveredAt?: string
  cancelledAt?: string
  createdBy?: string
  confirmedBy?: string
  metadata?: Record<string, unknown>
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export interface CreateOrderItemDto {
  productId: string
  requestedQuantity: number
  notes?: string
}

export interface CreateOrderDto {
  warehouseId: string
  type?: OrderType
  orderNumber?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: Record<string, unknown>
  notes?: string
  priority?: number
  expectedAt?: string
  items?: CreateOrderItemDto[]
}

export interface UpdateOrderDto {
  type?: OrderType
  orderNumber?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: Record<string, unknown>
  notes?: string
  priority?: number
  expectedAt?: string
}

export interface AddOrderItemDto {
  productId: string
  requestedQuantity: number
  notes?: string
}

/** Human-readable status labels */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.DRAFT]: 'Черновик',
  [OrderStatus.CONFIRMED]: 'Подтверждён',
  [OrderStatus.IN_PICKING]: 'В сборке',
  [OrderStatus.PICKED]: 'Собран',
  [OrderStatus.IN_PACKING]: 'В упаковке',
  [OrderStatus.PACKED]: 'Упакован',
  [OrderStatus.SHIPPED]: 'Отгружен',
  [OrderStatus.DELIVERED]: 'Доставлен',
  [OrderStatus.CANCELLED]: 'Отменён',
  [OrderStatus.RETURNED]: 'Возврат',
}
