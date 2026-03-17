import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { warehouseApi } from './warehouse-api'
import type { UpdateWarehouseDto, CreateZoneDto, BulkCreateCellsDto } from '@/entities/warehouse/types'
import toast from 'react-hot-toast'

export const warehouseKeys = {
  all: ['warehouses'] as const,
  detail: (id: string) => ['warehouses', id] as const,
  zones: (warehouseId: string) => ['warehouses', warehouseId, 'zones'] as const,
  cells: (warehouseId: string, zoneId: string) =>
    ['warehouses', warehouseId, 'zones', zoneId, 'cells'] as const,
}

export function useWarehouses() {
  return useQuery({
    queryKey: warehouseKeys.all,
    queryFn: warehouseApi.list,
  })
}

export function useWarehouse(id: string) {
  return useQuery({
    queryKey: warehouseKeys.detail(id),
    queryFn: () => warehouseApi.get(id),
    enabled: !!id,
  })
}

export function useCreateWarehouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: warehouseApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: warehouseKeys.all })
      toast.success('Склад создан')
    },
    onError: () => toast.error('Ошибка создания склада'),
  })
}

export function useUpdateWarehouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdateWarehouseDto & { id: string }) => warehouseApi.update(dto),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: warehouseKeys.all })
      qc.invalidateQueries({ queryKey: warehouseKeys.detail(vars.id) })
      toast.success('Склад обновлён')
    },
    onError: () => toast.error('Ошибка обновления'),
  })
}

export function useZones(warehouseId: string) {
  return useQuery({
    queryKey: warehouseKeys.zones(warehouseId),
    queryFn: () => warehouseApi.listZones(warehouseId),
    enabled: !!warehouseId,
  })
}

export function useCreateZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateZoneDto & { warehouseId: string }) => warehouseApi.createZone(dto),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: warehouseKeys.zones(vars.warehouseId) })
      toast.success('Зона создана')
    },
    onError: () => toast.error('Ошибка создания зоны'),
  })
}

export function useCells(warehouseId: string, zoneId: string) {
  return useQuery({
    queryKey: warehouseKeys.cells(warehouseId, zoneId),
    queryFn: () => warehouseApi.listCells(warehouseId, zoneId),
    enabled: !!warehouseId && !!zoneId,
  })
}

export function useBulkCreateCells() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: BulkCreateCellsDto & { warehouseId: string }) =>
      warehouseApi.bulkCreateCells(dto),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: warehouseKeys.zones(vars.warehouseId) })
      toast.success(`Создано ${data.created} ячеек`)
    },
    onError: () => toast.error('Ошибка создания ячеек'),
  })
}
