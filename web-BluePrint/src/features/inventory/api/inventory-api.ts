import { apiClient } from '@/shared/api'
import type {
  Product,
  CreateProductDto,
  UpdateProductDto,
  InventoryItem,
  ScanResult,
  MoveInventoryDto,
  MovementResponse,
} from '@/entities/inventory/types'

export const inventoryApi = {
  // Products
  listProducts: async (): Promise<Product[]> => {
    const { data } = await apiClient.get<Product[]>('/inventory/products')
    return data
  },

  getProduct: async (id: string): Promise<Product> => {
    const { data } = await apiClient.get<Product>(`/inventory/products/${id}`)
    return data
  },

  createProduct: async (dto: CreateProductDto): Promise<Product> => {
    const { data } = await apiClient.post<Product>('/inventory/products', dto)
    return data
  },

  updateProduct: async ({ id, ...dto }: UpdateProductDto & { id: string }): Promise<Product> => {
    const { data } = await apiClient.patch<Product>(`/inventory/products/${id}`, dto)
    return data
  },

  // Inventory items
  listInventory: async (warehouseId: string): Promise<InventoryItem[]> => {
    const { data } = await apiClient.get<InventoryItem[]>('/inventory', {
      params: { warehouseId },
    })
    return data
  },

  scan: async (barcode: string, warehouseId: string): Promise<ScanResult> => {
    const { data } = await apiClient.get<ScanResult>('/inventory/scan', {
      params: { barcode, warehouseId },
    })
    return data
  },

  move: async (dto: MoveInventoryDto): Promise<MovementResponse> => {
    const { data } = await apiClient.post<MovementResponse>('/inventory/move', dto)
    return data
  },

  listMovements: async (
    warehouseId: string,
    params?: { inventoryItemId?: string; limit?: number },
  ): Promise<MovementResponse[]> => {
    const { data } = await apiClient.get<MovementResponse[]>('/inventory/movements', {
      params: { warehouseId, ...params },
    })
    return data
  },
}
