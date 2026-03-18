'use client'

import { useRef, useCallback } from 'react'
import { Input } from './input'
import { ScanLine } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
}

/**
 * Hardware barcode scanner input.
 * Scanners typically send all characters very quickly (<50ms between chars)
 * then emit an Enter keypress at the end.
 */
export function BarcodeScanner({ onScan, placeholder = 'Поднесите штрихкод к сканеру...', label, disabled }: BarcodeScannerProps) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const now = Date.now()
      const timeSinceLast = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      // Scanner sends chars very fast; if too slow, treat as manual typing
      if (timeSinceLast > 100 && bufferRef.current.length > 0) {
        bufferRef.current = ''
      }

      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim()
        if (barcode.length > 0) {
          onScan(barcode)
          bufferRef.current = ''
          ;(e.target as HTMLInputElement).value = ''
        }
        e.preventDefault()
        return
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key
      }
    },
    [onScan]
  )

  return (
    <div className="relative">
      <Input
        label={label}
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <ScanLine className="absolute right-3 top-8 h-4 w-4 text-neutral-400 pointer-events-none" />
    </div>
  )
}
