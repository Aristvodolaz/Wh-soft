'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import { useScanBarcode } from '@/features/inventory/api/use-inventory'
import { Barcode, Package, MapPin, AlertCircle, Camera, CameraOff } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store/auth-store'

interface ScanDialogProps {
  open: boolean
  onClose: () => void
  /** Called when user selects a scanned item to act on (e.g. start a move) */
  onSelectItem?: (inventoryItemId: string) => void
}

/** Hardware barcode scanner state — detects rapid keypress bursts */
function useHardwareScanner(onScan: (code: string) => void) {
  const bufferRef = useRef<string[]>([])
  const lastKeyRef = useRef<number>(0)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const now = Date.now()
      const gap = now - lastKeyRef.current
      lastKeyRef.current = now

      if (e.key === 'Enter') {
        const code = bufferRef.current.join('')
        if (code.length >= 4) onScan(code)
        bufferRef.current = []
        return
      }

      if (e.key.length === 1) {
        if (gap > 100) bufferRef.current = [] // reset on slow typing
        bufferRef.current.push(e.key)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onScan])
}

export function ScanDialog({ open, onClose, onSelectItem }: ScanDialogProps) {
  const { selectedWarehouseId } = useAuthStore()
  const [rawInput, setRawInput] = useState('')
  const [submitted, setSubmitted] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const warehouseId = selectedWarehouseId ?? ''
  const { data: result, isLoading, isError } = useScanBarcode(submitted, warehouseId)

  const handleScan = useCallback((code: string) => {
    setRawInput(code)
    setSubmitted(code)
  }, [])

  useHardwareScanner(open ? handleScan : () => {})

  useEffect(() => {
    if (open) {
      setRawInput('')
      setSubmitted('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleManualSubmit = () => {
    if (rawInput.trim().length >= 2) setSubmitted(rawInput.trim())
  }

  return (
    <Modal open={open} onClose={onClose} title="Сканирование" size="md">
      <div className="p-6 space-y-5">
        {/* Input row */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              ref={inputRef}
              label="Штрихкод / QR-код"
              placeholder="Scan or type a barcode..."
              leftIcon={<Barcode className="h-4 w-4" />}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
            />
          </div>
          <div className="pt-5">
            <Button size="sm" onClick={handleManualSubmit} disabled={!rawInput.trim()}>
              Найти
            </Button>
          </div>
        </div>

        <p className="text-xs text-neutral-400 flex items-center gap-1.5">
          <Camera className="h-3.5 w-3.5" />
          Поднесите аппаратный сканер или введите код вручную
        </p>

        {/* Results */}
        {isLoading && submitted && (
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/3 rounded" />
            <Skeleton className="h-12 w-full rounded" />
          </div>
        )}

        {isError && submitted && (
          <div className="flex items-center gap-2 text-danger-600 bg-danger-50 rounded-lg p-3 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Штрихкод не найден: <span className="font-mono">{submitted}</span></span>
          </div>
        )}

        {result && !isLoading && (
          <div className="space-y-3">
            {/* Match type pill */}
            <div className="flex items-center gap-2">
              <Badge variant={result.matchType === 'PRODUCT' ? 'active' : 'in-progress'} dot={false}>
                {result.matchType === 'PRODUCT' ? 'Товар' : 'Ячейка'}
              </Badge>
              <span className="text-xs text-neutral-400">найдено по коду «{submitted}»</span>
            </div>

            {/* Product result */}
            {result.matchType === 'PRODUCT' && result.product && (
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-primary-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {result.product.name}
                    </p>
                    <p className="text-xs font-mono text-neutral-400 mt-0.5">{result.product.sku}</p>
                  </div>
                </div>

                {result.inventoryItems && result.inventoryItems.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Остатки по ячейкам
                    </p>
                    {result.inventoryItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 rounded px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                          <span className="font-mono text-sm">{item.cellId ?? '—'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span>
                            <span className="font-semibold">{item.availableQuantity}</span>
                            <span className="text-neutral-400"> / {item.quantity}</span>
                          </span>
                          {onSelectItem && (
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => { onSelectItem(item.id); onClose() }}
                            >
                              Переместить
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(!result.inventoryItems || result.inventoryItems.length === 0) && (
                  <p className="text-sm text-neutral-400 italic">Нет остатков на складе</p>
                )}
              </div>
            )}

            {/* Cell result */}
            {result.matchType === 'CELL' && (
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Ячейка: {result.cellCode}
                    </p>
                    {result.zoneCode && (
                      <p className="text-xs text-neutral-400">Зона: {result.zoneCode}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="secondary" onClick={onClose}>Закрыть</Button>
        </div>
      </div>
    </Modal>
  )
}
