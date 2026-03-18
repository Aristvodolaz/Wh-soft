export enum ZoneType {
  STORAGE = 'STORAGE',
  RECEIVING = 'RECEIVING',
  SHIPPING = 'SHIPPING',
  QUARANTINE = 'QUARANTINE',
  PICKING = 'PICKING',
  PACKING = 'PACKING',
}

// --- Warehouse ---

export interface Warehouse {
  id: string
  tenantId: string
  name: string
  code: string
  address?: string
  city?: string
  country?: string
  timezone: string
  isActive: boolean
  settings?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateWarehouseDto {
  name: string
  code: string
  address?: string
  city?: string
  country?: string
  timezone?: string
  settings?: Record<string, unknown>
}

export interface UpdateWarehouseDto extends Partial<CreateWarehouseDto> {
  isActive?: boolean
}

// --- Zone ---

export interface Zone {
  id: string
  tenantId: string
  warehouseId: string
  name: string
  code: string
  type: ZoneType
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateZoneDto {
  name: string
  code: string
  type?: ZoneType
  description?: string
}

// --- Cell ---

export interface Cell {
  id: string
  tenantId: string
  warehouseId: string
  zoneId: string
  code: string
  barcode?: string
  aisle?: string
  bay?: string
  level?: string
  position?: string
  maxWeight?: number
  maxVolume?: number
  isActive: boolean
  isOccupied: boolean
  createdAt: string
  updatedAt: string
}

interface CellSpecDto {
  code: string
  barcode?: string
  aisle?: string
  bay?: string
  level?: string
  position?: string
  maxWeight?: number
  maxVolume?: number
}

export interface BulkCreateCellsDto {
  zoneId: string
  cells: CellSpecDto[]
}

export interface BulkCreateCellsResponse {
  created: number
  cells: Cell[]
}
