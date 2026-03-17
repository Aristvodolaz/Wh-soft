'use client'

import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

interface BarcodeLabelProps {
  /** Cell code (e.g. "A-01-02-03") */
  code: string
  /** 12-digit numeric barcode — auto-derived from code if omitted */
  barcode?: string
  /** Display label below the barcode */
  label?: string
  width?: number
  height?: number
  className?: string
}

/**
 * Converts any string to a 12-digit numeric string suitable for EAN-13.
 * EAN-13 = 12 data digits + 1 check digit (JsBarcode computes check digit).
 */
function toEan12(input: string): string {
  // If already 12 digits, use as-is
  if (/^\d{12}$/.test(input)) return input

  // If already 13 digits (EAN-13), drop last digit (check digit)
  if (/^\d{13}$/.test(input)) return input.slice(0, 12)

  // Derive a stable 12-digit number from the string using a simple hash
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) & 0x7fffffff
  }
  // Prefix with 200 (GS1 internal-use prefix) + 9-digit hash
  const numeric = '200' + String(hash).padStart(9, '0')
  return numeric.slice(0, 12)
}

export function BarcodeLabel({
  code,
  barcode,
  label,
  width = 2,
  height = 60,
  className = '',
}: BarcodeLabelProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const ean12 = toEan12(barcode ?? code)

  useEffect(() => {
    if (!svgRef.current) return
    try {
      JsBarcode(svgRef.current, ean12, {
        format: 'EAN13',
        width,
        height,
        displayValue: true,
        fontSize: 11,
        textMargin: 2,
        margin: 6,
      })
    } catch {
      // Fallback — render code128 if EAN13 fails
      JsBarcode(svgRef.current, code, {
        format: 'CODE128',
        width,
        height,
        displayValue: true,
        fontSize: 11,
        textMargin: 2,
        margin: 6,
      })
    }
  }, [ean12, code, width, height])

  return (
    <div className={['flex flex-col items-center gap-1', className].join(' ')}>
      <svg ref={svgRef} />
      {label && (
        <p className="text-xs font-mono text-neutral-600 text-center leading-tight">{label}</p>
      )}
    </div>
  )
}
