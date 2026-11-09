import { apiClient } from '@/shared/api'
import type {
  Warehouse,
  CreateWarehouseDto,
  UpdateWarehouseDto,
  Zone,
  CreateZoneDto,
  Cell,
  BulkCreateCellsDto,
  BulkCreateCellsResponse,
} from '@/entities/warehouse/types'

export const warehouseApi = {
  list: async (): Promise<Warehouse[]> => {
    const { data } = await apiClient.get<Warehouse[]>('/warehouses')
    return data
  },

  get: async (id: string): Promise<Warehouse> => {
    const { data } = await apiClient.get<Warehouse>(`/warehouses/${id}`)
    return data
  },

  create: async (dto: CreateWarehouseDto): Promise<Warehouse> => {
    const { data } = await apiClient.post<Warehouse>('/warehouses', dto)
    return data
  },

  update: async (payload: UpdateWarehouseDto & { id: string }): Promise<Warehouse> => {
    const body: UpdateWarehouseDto = {
      name: payload.name,
      code: payload.code,
      address: payload.address || undefined,
      city: payload.city || undefined,
      country: payload.country || undefined,
      timezone: payload.timezone,
    }
    if (typeof payload.isActive === 'boolean') {
      body.isActive = payload.isActive
    }
    const { data } = await apiClient.patch<Warehouse>(`/warehouses/${payload.id}`, body)
    return data
  },

  // Zones
  listZones: async (warehouseId: string): Promise<Zone[]> => {
    const { data } = await apiClient.get<Zone[]>(`/warehouses/${warehouseId}/zones`)
    return data
  },

  createZone: async ({
    warehouseId,
    ...dto
  }: CreateZoneDto & { warehouseId: string }): Promise<Zone> => {
    const { data } = await apiClient.post<Zone>(`/warehouses/${warehouseId}/zones`, dto)
    return data
  },

  // Cells
  listCells: async (warehouseId: string, zoneId: string): Promise<Cell[]> => {
    const { data } = await apiClient.get<Cell[]>(
      `/warehouses/${warehouseId}/zones/${zoneId}/cells`
    )
    return data
  },

  bulkCreateCells: async ({
    warehouseId,
    ...dto
  }: BulkCreateCellsDto & { warehouseId: string }): Promise<BulkCreateCellsResponse> => {
    const { data } = await apiClient.post<BulkCreateCellsResponse>(
      `/warehouses/${warehouseId}/cells/bulk`,
      dto
    )
    return data
  },
}
