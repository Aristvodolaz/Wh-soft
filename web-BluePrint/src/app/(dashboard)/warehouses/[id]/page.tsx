'use client'

import { useState, useEffect, useRef } from 'react'
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
import type { Zone, Cell } from '@/entities/warehouse/types'
import Link from 'next/link'
import { MapPin, Globe, Plus, Layers, QrCode, Printer, Barcode, CheckSquare, Square } from 'lucide-react'
import { BarcodeLabel } from '@/shared/ui/barcode-label'
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

// ─── QR Modal ─────────────────────────────────────────────────────────────────

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
          <p className="font-mono text-sm text-neutral-400">{zone.code}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>Закрыть</Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Печать
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── EAN-13 Print Modal ────────────────────────────────────────────────────────

interface PrintModalProps {
  cells: Cell[]
  zoneName: string
  onClose: () => void
}

function CellPrintModal({ cells, zoneName, onClose }: PrintModalProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(cells.map((c) => c.id)))
  const [cols, setCols] = useState<2 | 3 | 4>(3)

  const allSelected = selected.size === cells.length
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(cells.map((c) => c.id)))

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toPrint = cells.filter((c) => selected.has(c.id))

  const handlePrint = () => {
    const win = window.open('', '_blank')
    if (!win) return

    // Collect SVG strings from DOM
    const svgNodes = document.querySelectorAll<SVGElement>('[data-cell-barcode]')
    const svgMap: Record<string, string> = {}
    svgNodes.forEach((el) => {
      const id = el.getAttribute('data-cell-barcode') ?? ''
      svgMap[id] = el.outerHTML
    })

    const labels = toPrint.map((c) => {
      const svg = svgMap[c.id] ?? ''
      return `
        <div class="label">
          ${svg}
          <p class="code">${c.code}</p>
        </div>`
    }).join('')

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>EAN-13 — ${zoneName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: monospace; padding: 12px; }
          h2 { font-size: 13px; margin-bottom: 12px; color: #444; }
          .grid {
            display: grid;
            grid-template-columns: repeat(${cols}, 1fr);
            gap: 8px;
          }
          .label {
            display: flex;
            flex-direction: column;
            align-items: center;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 6px;
            page-break-inside: avoid;
          }
          .label svg { width: 100%; max-width: 160px; }
          .code { font-size: 9px; color: #555; margin-top: 3px; text-align: center; }
          @media print {
            body { padding: 4mm; }
            .grid { gap: 4px; }
          }
        </style>
      </head>
      <body>
        <h2>Штрихкоды ячеек EAN-13 — ${zoneName} (${toPrint.length} шт.)</h2>
        <div class="grid">${labels}</div>
        <script>window.onload = () => window.print()<\/script>
      </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Печать ШК ячеек — ${zoneName}`}
      size="lg"
    >
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-neutral-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"
            >
              {allSelected
                ? <CheckSquare className="h-4 w-4 text-primary-600" />
                : <Square className="h-4 w-4" />}
              {allSelected ? 'Снять всё' : 'Выбрать всё'}
            </button>
            <span className="text-xs text-neutral-400">
              {selected.size} / {cells.length} выбрано
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Колонок:</span>
            {([2, 3, 4] as const).map((n) => (
              <button
                key={n}
                onClick={() => setCols(n)}
                className={[
                  'w-7 h-7 rounded text-xs font-medium border transition-colors',
                  cols === n
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'border-neutral-200 text-neutral-600 hover:border-primary-300',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Grid preview */}
        <div
          className="p-4 overflow-y-auto max-h-[52vh] bg-neutral-50"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px' }}
        >
          {cells.map((cell) => {
            const isOn = selected.has(cell.id)
            return (
              <button
                key={cell.id}
                onClick={() => toggle(cell.id)}
                className={[
                  'flex flex-col items-center border rounded-lg p-2 transition-all bg-white',
                  isOn
                    ? 'border-primary-400 shadow-sm ring-1 ring-primary-200'
                    : 'border-neutral-200 opacity-40',
                ].join(' ')}
              >
                <BarcodeLabel
                  code={cell.code}
                  barcode={cell.barcode}
                  label={cell.code}
                  width={1.4}
                  height={44}
                  svgProps={{ 'data-cell-barcode': cell.id } as Record<string, string>}
                />
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Будет напечатано:{' '}
            <span className="font-semibold text-neutral-800">{toPrint.length}</span> этикеток
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>Закрыть</Button>
            <Button onClick={handlePrint} disabled={toPrint.length === 0}>
              <Printer className="h-4 w-4" />
              Печать {toPrint.length > 0 ? `(${toPrint.length})` : ''}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Zone Print Button ─────────────────────────────────────────────────────────

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

  // When cells load after user clicked, trigger print modal
  useEffect(() => {
    if (enabled && cells && cells.length > 0 && !isFetching) {
      onPrint(cells)
      setEnabled(false)
    }
  }, [enabled, cells, isFetching, onPrint])

  const handleClick = () => {
    if (cells && cells.length > 0) {
      onPrint(cells)
    } else {
      setEnabled(true)
    }
  }

  return (
    <Button
      size="xs"
      variant="secondary"
      onClick={handleClick}
      loading={isFetching && enabled}
      title="Печать EAN-13 штрихкодов ячеек"
    >
      <Barcode className="h-3 w-3" />
      ШК
    </Button>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function WarehousePage({ params }: { params: { id: string } }) {
  const { id } = params
  const { data: warehouse, isLoading: wLoading } = useWarehouse(id)
  const { data: zones, isLoading: zLoading } = useZones(id)
  const createZone = useCreateZone()
  const bulkCreateCells = useBulkCreateCells()

  const [zoneOpen, setZoneOpen] = useState(false)
  const [cellsOpen, setCellsOpen] = useState<Zone | null>(null)
  const [qrZone, setQrZone] = useState<Zone | null>(null)
  const [printState, setPrintState] = useState<{ cells: Cell[]; zoneName: string } | null>(null)

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
    const zoneName = cellsOpen.name
    bulkCreateCells.mutate(
      { warehouseId: id, zoneId: cellsOpen.id, cells },
      {
        onSuccess: (res) => {
          setCellsOpen(null)
          cellsForm.reset()
          if (res?.cells?.length) setPrintState({ cells: res.cells, zoneName })
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
            <span className="font-mono text-sm text-neutral-400">{warehouse.code}</span>
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
                <p className="font-mono text-sm text-neutral-400 mb-3">{zone.code}</p>
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
                    onPrint={(cells) => setPrintState({ cells, zoneName: zone.name })}
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
      {printState && (
        <CellPrintModal
          cells={printState.cells}
          zoneName={printState.zoneName}
          onClose={() => setPrintState(null)}
        />
      )}

      {/* QR Code Modal */}
      {qrZone && <QrModal zone={qrZone} onClose={() => setQrZone(null)} />}
    </div>
  )
}
