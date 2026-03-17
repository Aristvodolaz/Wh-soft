'use client'

import { useState, useRef } from 'react'
import { useProducts, useCreateProduct } from '@/features/inventory/api/use-inventory'
import { ProductTable } from '@/widgets/inventory/product-table'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Drawer } from '@/shared/ui/drawer'
import { Badge } from '@/shared/ui/badge'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Upload, FileText, AlertTriangle, Check } from 'lucide-react'
import type { Product } from '@/entities/inventory/types'
import { ProductUnit } from '@/entities/inventory/types'
import { formatDate } from '@/shared/lib/format'
import Papa from 'papaparse'
import toast from 'react-hot-toast'

const createSchema = z.object({
  sku: z.string().min(1, 'Обязательное поле').max(100),
  name: z.string().min(1, 'Обязательное поле').max(255),
  description: z.string().optional(),
  barcode: z.string().optional(),
  unit: z.nativeEnum(ProductUnit).default(ProductUnit.PIECE),
  minStockLevel: z.coerce.number().min(0).optional(),
  maxStockLevel: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
})

type CreateForm = z.infer<typeof createSchema>

interface CsvRow {
  sku: string
  name: string
  barcode?: string
  unit?: string
  minStockLevel?: string
  maxStockLevel?: string
  weight?: string
  description?: string
}

export default function ProductsPage() {
  const { data: products, isLoading } = useProducts()
  const createProduct = useCreateProduct()
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [csvRows, setCsvRows] = useState<CsvRow[]>([])
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) })

  const onSubmit = (data: CreateForm) => {
    createProduct.mutate(data, {
      onSuccess: () => {
        setCreateOpen(false)
        reset()
      },
    })
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.data.length === 0) {
          toast.error('Файл пустой или неверный формат')
          return
        }
        setCsvRows(result.data)
      },
      error: () => toast.error('Ошибка чтения CSV файла'),
    })
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const onImport = async () => {
    if (csvRows.length === 0) return
    setImporting(true)
    let success = 0
    let failed = 0
    for (const row of csvRows) {
      if (!row.sku || !row.name) { failed++; continue }
      try {
        await new Promise<void>((resolve, reject) => {
          createProduct.mutate(
            {
              sku: row.sku,
              name: row.name,
              barcode: row.barcode || undefined,
              unit: (row.unit as ProductUnit) || ProductUnit.PIECE,
              minStockLevel: row.minStockLevel ? Number(row.minStockLevel) : undefined,
              maxStockLevel: row.maxStockLevel ? Number(row.maxStockLevel) : undefined,
              weight: row.weight ? Number(row.weight) : undefined,
              description: row.description || undefined,
            },
            { onSuccess: () => resolve(), onError: () => reject() }
          )
        })
        success++
      } catch {
        failed++
      }
    }
    setImporting(false)
    setImportOpen(false)
    setCsvRows([])
    if (failed === 0) {
      toast.success(`Импортировано ${success} товаров`)
    } else {
      toast(`Импортировано: ${success}, ошибок: ${failed}`, { icon: '⚠️' })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Товары</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {products?.length ?? 0} товаров в каталоге
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Импорт CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Добавить товар
          </Button>
        </div>
      </div>

      <ProductTable
        products={products}
        loading={isLoading}
        onSelect={setSelected}
      />

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый товар" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SKU"
              placeholder="MILK-001"
              error={errors.sku?.message}
              required
              {...register('sku')}
            />
            <Select label="Единица измерения" {...register('unit')}>
              {Object.values(ProductUnit).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </Select>
          </div>
          <Input
            label="Название"
            placeholder="Молоко 3.2% 1л"
            error={errors.name?.message}
            required
            {...register('name')}
          />
          <Input label="Штрихкод" placeholder="4607100931867" {...register('barcode')} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Мин. остаток" type="number" {...register('minStockLevel')} />
            <Input label="Макс. остаток" type="number" {...register('maxStockLevel')} />
            <Input label="Вес (кг)" type="number" step="0.001" {...register('weight')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" loading={createProduct.isPending}>
              Создать
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal open={importOpen} onClose={() => { setImportOpen(false); setCsvRows([]) }} title="Импорт товаров из CSV" size="lg">
        <div className="p-6 space-y-4">
          <div className="rounded-lg border-2 border-dashed border-neutral-300 p-6 text-center">
            <FileText className="h-10 w-10 text-neutral-400 mx-auto mb-2" />
            <p className="text-sm text-neutral-600 mb-3">
              CSV с заголовками: <code className="font-mono-sku text-xs bg-neutral-100 px-1 rounded">sku, name, barcode, unit, minStockLevel, maxStockLevel, weight</code>
            </p>
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Выбрать файл
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          {csvRows.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-4 w-4 text-success-500" />
                <span className="text-sm font-medium text-neutral-700">
                  Найдено {csvRows.length} записей
                </span>
              </div>
              <div className="border rounded-lg overflow-auto max-h-48">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50 border-b">
                    <tr>
                      {['sku', 'name', 'barcode', 'unit'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-neutral-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {csvRows.slice(0, 10).map((row, i) => (
                      <tr key={i} className={!row.sku || !row.name ? 'bg-danger-50' : ''}>
                        <td className="px-3 py-1.5 font-mono-sku">{row.sku}</td>
                        <td className="px-3 py-1.5">{row.name}</td>
                        <td className="px-3 py-1.5 font-mono-sku">{row.barcode}</td>
                        <td className="px-3 py-1.5">{row.unit}</td>
                      </tr>
                    ))}
                    {csvRows.length > 10 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-neutral-400 text-center">
                          ... и ещё {csvRows.length - 10} строк
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {csvRows.some((r) => !r.sku || !r.name) && (
                <p className="text-xs text-danger-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Строки без SKU или названия будут пропущены
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setImportOpen(false); setCsvRows([]) }}>
              Отмена
            </Button>
            <Button
              onClick={onImport}
              disabled={csvRows.length === 0}
              loading={importing}
            >
              Импортировать {csvRows.length > 0 ? `(${csvRows.length})` : ''}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Product Detail Drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
      >
        {selected && (
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-neutral-400">SKU</p>
              <p className="font-mono-sku font-medium">{selected.sku}</p>
            </div>
            {selected.barcode && (
              <div className="space-y-1">
                <p className="text-xs text-neutral-400">Штрихкод</p>
                <p className="font-mono-sku">{selected.barcode}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-400">Единица</p>
                <p className="text-sm font-medium">{selected.unit}</p>
              </div>
              {selected.weight != null && (
                <div>
                  <p className="text-xs text-neutral-400">Вес</p>
                  <p className="text-sm font-medium">{selected.weight} кг</p>
                </div>
              )}
            </div>
            {(selected.minStockLevel != null || selected.maxStockLevel != null) && (
              <div className="grid grid-cols-2 gap-4">
                {selected.minStockLevel != null && (
                  <div>
                    <p className="text-xs text-neutral-400">Мин. остаток</p>
                    <p className="text-sm font-medium">{selected.minStockLevel}</p>
                  </div>
                )}
                {selected.maxStockLevel != null && (
                  <div>
                    <p className="text-xs text-neutral-400">Макс. остаток</p>
                    <p className="text-sm font-medium">{selected.maxStockLevel}</p>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs text-neutral-400">Статус</p>
              <Badge variant={selected.isActive ? 'active' : 'cancelled'}>
                {selected.isActive ? 'Активен' : 'Неактивен'}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-neutral-400">Создан</p>
              <p className="text-sm">{formatDate(selected.createdAt)}</p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
