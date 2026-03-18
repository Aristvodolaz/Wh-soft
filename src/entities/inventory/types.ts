export enum ProductUnit {
  PIECE = 'PIECE',
  KG = 'KG',
  LITER = 'LITER',
  METER = 'METER',
  BOX = 'BOX',
  PALLET = 'PALLET',
}

export enum MovementType {
  TRANSFER = 'TRANSFER',
  RECEIVE = 'RECEIVE',
  DISPATCH = 'DISPATCH',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
  WRITE_OFF = 'WRITE_OFF',
}

// --- Product ---

export interface Product {
  id: string
  tenantId: string
  sku: string
  name: string
  description?: string
  barcode?: string
  unit: ProductUnit
  weight?: number
  volume?: number
  minStockLevel?: number
  maxStockLevel?: number
  reorderPoint?: number
  attributes?: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateProductDto {
  sku: string
  name: string
  description?: string
  barcode?: string
  unit?: ProductUnit
  weight?: number
  volume?: number
  minStockLevel?: number
  maxStockLevel?: number
  reorderPoint?: number
  attributes?: Record<string, unknown>
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  isActive?: boolean
}

// --- Inventory Item ---

export interface InventoryItem {
  id: string
  tenantId: string
  warehouseId: string
  productId: string
  cellId?: string
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  lotNumber?: string
  serialNumber?: string
  expiryDate?: string
  costPrice?: number
  createdAt: string
  updatedAt: string
  // Populated relations
  product?: Product
}

// --- Scan Result ---

export interface ScanResult {
  matchType: 'PRODUCT' | 'CELL'
  product?: Product
  inventoryItems?: InventoryItem[]
  cellCode?: string
  zoneCode?: string
}

// --- Move Inventory ---

export interface MoveInventoryDto {
  inventoryItemId: string
  warehouseId: string
  fromCellId?: string
  toCellId?: string
  type: MovementType
  quantity: number
  reference?: string
  notes?: string
}

export interface MovementResponse {
  id: string
  tenantId: string
  warehouseId: string
  inventoryItemId: string
  type: MovementType
  quantity: number
  fromCellId?: string
  toCellId?: string
  reference?: string
  notes?: string
  createdAt: string
}
