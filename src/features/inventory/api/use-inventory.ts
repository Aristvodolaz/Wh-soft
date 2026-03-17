import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from './inventory-api'
import type { UpdateProductDto, MoveInventoryDto } from '@/entities/inventory/types'
import toast from 'react-hot-toast'

export const inventoryKeys = {
  products: ['products'] as const,
  product: (id: string) => ['products', id] as const,
  inventory: (warehouseId: string) => ['inventory', warehouseId] as const,
  scan: (barcode: string, warehouseId: string) => ['scan', barcode, warehouseId] as const,
}

export function useProducts() {
  return useQuery({
    queryKey: inventoryKeys.products,
    queryFn: inventoryApi.listProducts,
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: inventoryKeys.product(id),
    queryFn: () => inventoryApi.getProduct(id),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: inventoryApi.createProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.products })
      toast.success('Товар создан')
    },
    onError: () => toast.error('Ошибка создания товара'),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdateProductDto & { id: string }) => inventoryApi.updateProduct(dto),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: inventoryKeys.products })
      qc.invalidateQueries({ queryKey: inventoryKeys.product(vars.id!) })
      toast.success('Товар обновлён')
    },
    onError: () => toast.error('Ошибка обновления'),
  })
}

export function useInventory(warehouseId: string) {
  return useQuery({
    queryKey: inventoryKeys.inventory(warehouseId),
    queryFn: () => inventoryApi.listInventory(warehouseId),
    enabled: !!warehouseId,
  })
}

export function useMoveInventory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: MoveInventoryDto) => inventoryApi.move(dto),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: inventoryKeys.inventory(vars.warehouseId) })
      toast.success('Товар перемещён')
    },
    onError: () => toast.error('Ошибка перемещения'),
  })
}
