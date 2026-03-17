'use client'

import { use, useState, useEffect, useRef } from 'react'
import {
  useWarehouse, useZones, useCreateZone, useBulkCreateCells, useCells,
} from '@/features/warehouses/api/use-warehouses'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { FullPageSpinner } from '@/shared/ui/spinner'
import { EmptyState } from '@/shared/ui/empty-state'
import { ZoneType } from '@/entities/warehouse/types'
import type { Zone } from '@/entities/warehouse/types'
import Link from 'next/link'
import { MapPin, Globe, Plus, Layers, QrCode, Printer, Barcode } from 'lucide-react'
import { BarcodeLabel } from '@/shared/ui/barcode-label'
import type { Cell } from '@/entities/warehouse/types'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import QRCode from 'qrcode'
import { ZoneHeatmap } from '@/widgets/warehouse/zone-heatmap'

const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  [ZoneType.STORAGE]: 'Хранение',
  [ZoneType.RECEIVING]: 'Приёмка',
  [ZoneType.SHIPPING]: 'Отгрузка',
  [ZoneType.QUARANTINE]: 'Карантин',
  [ZoneType.PICKING]: 'Сборка',
  [ZoneType.PACKING]: 'Упаковка',
}

const createZoneSchema = z.object({
  name: z.string().min(1, 'Обязательное поле'),
  code: z.string().min(1).regex(/^[A-Z0-9_-]+$/, 'Только заглавные буквы, цифры, - и _'),
  type: z.nativeEnum(ZoneType),
  description: z.string().optional(),
})
type CreateZoneForm = z.infer<typeof createZoneSchema>

const bulkCellsSchema = z.object({
  template: z.string().min(1, 'Обязательное поле').default('A-{row}-{rack}-{shelf}'),
  rows: z.coerce.number().min(1).max(100),
  racks: z.coerce.number().min(1).max(100),
  shelves: z.coerce.number().min(1).max(50),
})
type BulkCellsForm = z.infer<typeof bulkCellsSchema>

function QrModal({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const payload = JSON.stringify({ type: 'zone', id: zone.id, code: zone.code })

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, payload, { width: 200, margin: 2 }, (err) => {
        if (err) console.error(err)
      })
    }
  }, [payload])

  const handlePrint = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL()
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>QR — ${zone.code}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:monospace}
      img{width:200px;height:200px}h2{margin:8px 0 4px}p{color:#666;font-size:12px;margin:0}</style></head>
      <body><img src="${dataUrl}"/><h2>${zone.name}</h2><p>${zone.code}</p></body></html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <Modal open onClose={onClose} title={`QR-код — ${zone.name}`}>
      <div className="p-6 flex flex-col items-center gap-4">
        <canvas ref={canvasRef} className="border rounded-lg" />
        <div className="text-center">
          <p className="font-semibold text-neutral-900">{zone.name}</p>
          <p className="font-mono-sku text-sm text-neutral-400">{zone.code}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>Закрыть</Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Печать
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ZonePrintButton({
  warehouseId,
  zone,
  onPrint,
}: {
  warehouseId: string
  zone: Zone
  onPrint: (cells: Cell[]) => void
}) {
  const [enabled, setEnabled] = useState(false)
  const { data: cells, isFetching } = useCells(warehouseId, zone.id)

  const handleClick = () => {
    if (cells && cells.length > 0) {
      onPrint(cells)
    } else {
      setEnabled(true)
    }
  }

  // Once cells load (after first click), open print modal
  if (enabled && cells && cells.length > 0 && !isFetching) {
    onPrint(cells)
    setEnabled(false)
  }

  return (
    <Button
      size="xs"
      variant="secondary"
      onClick={handleClick}
      loading={isFetching && enabled}
    >
      <Barcode className="h-3 w-3" />
      ШК
    </Button>
  )
}

export default function WarehousePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: warehouse, isLoading: wLoading } = useWarehouse(id)
  const { data: zones, isLoading: zLoading } = useZones(id)
  const createZone = useCreateZone()
  const bulkCreateCells = useBulkCreateCells()

  const [zoneOpen, setZoneOpen] = useState(false)
  const [cellsOpen, setCellsOpen] = useState<Zone | null>(null)
  const [qrZone, setQrZone] = useState<Zone | null>(null)
  const [printCells, setPrintCells] = useState<Cell[] | null>(null)

  const zoneForm = useForm<CreateZoneForm>({
    resolver: zodResolver(createZoneSchema),
    defaultValues: { type: ZoneType.STORAGE },
  })

  const cellsForm = useForm<BulkCellsForm>({
    resolver: zodResolver(bulkCellsSchema),
    defaultValues: { template: 'A-{row}-{rack}-{shelf}', rows: 10, racks: 6, shelves: 4 },
  })

  const onCreateZone = (data: CreateZoneForm) => {
    createZone.mutate({ warehouseId: id, ...data }, {
      onSuccess: () => { setZoneOpen(false); zoneForm.reset() },
    })
  }

  const onBulkCells = (data: BulkCellsForm) => {
    if (!cellsOpen) return
    const cells: { code: string }[] = []
    for (let row = 1; row <= data.rows; row++) {
      for (let rack = 1; rack <= data.racks; rack++) {
        for (let shelf = 1; shelf <= data.shelves; shelf++) {
          const code = data.template
            .replace('{row}', String(row).padStart(2, '0'))
            .replace('{rack}', String(rack).padStart(2, '0'))
            .replace('{shelf}', String(shelf).padStart(2, '0'))
          cells.push({ code })
        }
      }
    }
    bulkCreateCells.mutate(
      { warehouseId: id, zoneId: cellsOpen.id, cells },
      {
        onSuccess: (res) => {
          setCellsOpen(null)
          cellsForm.reset()
          if (res?.cells?.length) setPrintCells(res.cells)
        },
      },
    )
  }

  if (wLoading) return <FullPageSpinner />
  if (!warehouse) return <div className="p-6"><EmptyState title="Склад не найден" /></div>

  const totalCells = cellsForm.watch('rows') * cellsForm.watch('racks') * cellsForm.watch('shelves')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/warehouses" className="hover:text-neutral-700">Склады</Link>
        <span>/</span>
        <span className="text-neutral-900 font-medium">{warehouse.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900">{warehouse.name}</h1>
            <Badge variant={warehouse.isActive ? 'active' : 'cancelled'}>
              {warehouse.isActive ? 'Активен' : 'Неактивен'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2">
            {warehouse.city && (
              <div className="flex items-center gap-1 text-sm text-neutral-500">
                <MapPin className="h-4 w-4" />
                {warehouse.city}{warehouse.country && `, ${warehouse.country}`}
              </div>
            )}
            <div className="flex items-center gap-1 text-sm text-neutral-500">
              <Globe className="h-4 w-4" />
              {warehouse.timezone}
            </div>
            <span className="font-mono-sku text-sm text-neutral-400">{warehouse.code}</span>
          </div>
        </div>
      </div>

      {/* Zones */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            Зоны склада {!zLoading && zones && `(${zones.length})`}
          </h2>
          <Button size="sm" onClick={() => setZoneOpen(true)}>
            <Plus className="h-4 w-4" />
            Добавить зону
          </Button>
        </div>

        {zLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="skeleton h-5 w-24 rounded mb-2" />
                <div className="skeleton h-4 w-16 rounded" />
              </Card>
            ))}
          </div>
        ) : !zones?.length ? (
          <EmptyState title="Нет зон" description="Добавьте зоны для организации склада" />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {zones.map((zone) => (
              <Card key={zone.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-neutral-900">{zone.name}</h3>
                  <Badge variant={zone.isActive ? 'active' : 'cancelled'} dot={false}>
                    {ZONE_TYPE_LABELS[zone.type] ?? zone.type}
                  </Badge>
                </div>
                <p className="font-mono-sku text-sm text-neutral-400 mb-3">{zone.code}</p>
                {zone.description && (
                  <p className="text-sm text-neutral-500 mb-3">{zone.description}</p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => { setCellsOpen(zone); cellsForm.reset() }}
                  >
                    <Layers className="h-3 w-3" />
                    Ячейки
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => setQrZone(zone)}
                  >
                    <QrCode className="h-3 w-3" />
                    QR
                  </Button>
                  <ZonePrintButton
                    warehouseId={id}
                    zone={zone}
                    onPrint={setPrintCells}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Zone Heatmap */}
      {zones && zones.length > 0 && <ZoneHeatmap zones={zones} />}

      {/* Create Zone Modal */}
      <Modal open={zoneOpen} onClose={() => setZoneOpen(false)} title="Новая зона">
        <form onSubmit={zoneForm.handleSubmit(onCreateZone)} className="p-6 space-y-4">
          <Input
            label="Название"
            placeholder="Зона хранения A"
            error={zoneForm.formState.errors.name?.message}
            required
            {...zoneForm.register('name')}
          />
          <Input
            label="Код"
            placeholder="ZONE-A"
            error={zoneForm.formState.errors.code?.message}
            required
            {...zoneForm.register('code')}
          />
          <Select label="Тип зоны" {...zoneForm.register('type')}>
            {Object.values(ZoneType).map((t) => (
              <option key={t} value={t}>{ZONE_TYPE_LABELS[t]}</option>
            ))}
          </Select>
          <Input label="Описание" placeholder="Описание зоны..." {...zoneForm.register('description')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setZoneOpen(false)}>Отмена</Button>
            <Button type="submit" loading={createZone.isPending}>Создать</Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Create Cells Modal */}
      <Modal
        open={!!cellsOpen}
        onClose={() => setCellsOpen(null)}
        title={`Создать ячейки — ${cellsOpen?.name ?? ''}`}
      >
        <form onSubmit={cellsForm.handleSubmit(onBulkCells)} className="p-6 space-y-4">
          <Input
            label="Шаблон кода"
            placeholder="A-{row}-{rack}-{shelf}"
            helperText="Доступные переменные: {row}, {rack}, {shelf}"
            error={cellsForm.formState.errors.template?.message}
            {...cellsForm.register('template')}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Рядов"
              type="number"
              min="1"
              max="100"
              error={cellsForm.formState.errors.rows?.message}
              {...cellsForm.register('rows')}
            />
            <Input
              label="Стеллажей"
              type="number"
              min="1"
              max="100"
              error={cellsForm.formState.errors.racks?.message}
              {...cellsForm.register('racks')}
            />
            <Input
              label="Полок"
              type="number"
              min="1"
              max="50"
              error={cellsForm.formState.errors.shelves?.message}
              {...cellsForm.register('shelves')}
            />
          </div>
          <p className="text-sm text-neutral-500">
            Будет создано: <span className="font-semibold text-neutral-900">{totalCells}</span> ячеек
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCellsOpen(null)}>Отмена</Button>
            <Button type="submit" loading={bulkCreateCells.isPending}>
              Создать {totalCells} ячеек
            </Button>
          </div>
        </form>
      </Modal>

      {/* EAN-13 Print Modal */}
      {printCells && (
        <Modal
          open
          onClose={() => setPrintCells(null)}
          title={`Штрихкоды ячеек (EAN-13) — ${printCells.length} шт.`}
          size="lg"
        >
          <div className="p-6 space-y-4">
            <p className="text-sm text-neutral-500">
              Штрихкоды сгенерированы для всех созданных ячеек. Нажмите «Печать» для вывода на принтер.
            </p>

            {/* Barcode grid — screen preview */}
            <div
              id="barcode-print-area"
              className="grid gap-4 max-h-[55vh] overflow-y-auto border rounded-lg p-4 bg-white dark:bg-neutral-900"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
            >
              {printCells.map((cell) => (
                <div
                  key={cell.id}
                  className="flex flex-col items-center border border-neutral-200 dark:border-neutral-700 rounded p-2 bg-white"
                >
                  <BarcodeLabel
                    code={cell.code}
                    barcode={cell.barcode}
                    label={cell.code}
                    width={1.6}
                    height={50}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setPrintCells(null)}>
                Закрыть
              </Button>
              <Button
                onClick={() => {
                  const area = document.getElementById('barcode-print-area')
                  if (!area) return
                  const win = window.open('', '_blank')
                  if (!win) return
                  win.document.write(`
                    <html><head><title>Штрихкоды ячеек EAN-13</title>
                    <style>
                      body{font-family:monospace;margin:0;padding:16px}
                      .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
                      .cell{display:flex;flex-direction:column;align-items:center;border:1px solid #ccc;border-radius:4px;padding:8px;page-break-inside:avoid}
                      svg{max-width:100%}
                      @media print{body{margin:0}button{display:none}}
                    </style></head>
                    <body><div class="grid">${area.innerHTML}</div>
                    <script>window.onload=()=>window.print()<\/script>
                    </body></html>
                  `)
                  win.document.close()
                }}
              >
                <Printer className="h-4 w-4 mr-1" /> Печать
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* QR Code Modal */}
      {qrZone && <QrModal zone={qrZone} onClose={() => setQrZone(null)} />}
    </div>
  )
}
