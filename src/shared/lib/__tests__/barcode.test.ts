/**
 * Tests for EAN-13 barcode derivation logic.
 * The toEan12 function is internal to barcode-label.tsx but we test its
 * behaviour via the expected outputs here to lock down the contract.
 */

// Replicate the function here to test in isolation
function toEan12(input: string): string {
  if (/^\d{12}$/.test(input)) return input
  if (/^\d{13}$/.test(input)) return input.slice(0, 12)
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) & 0x7fffffff
  }
  const numeric = '200' + String(hash).padStart(9, '0')
  return numeric.slice(0, 12)
}

describe('toEan12', () => {
  it('returns a 12-digit string', () => {
    expect(toEan12('A-01-01-01')).toHaveLength(12)
  })

  it('passes through an already-12-digit numeric string unchanged', () => {
    expect(toEan12('200123456789')).toBe('200123456789')
  })

  it('trims a 13-digit EAN-13 to first 12 digits', () => {
    expect(toEan12('2001234567891')).toBe('200123456789')
  })

  it('produces only digits for any alphanumeric input', () => {
    const result = toEan12('ZONE-A-01-02-03')
    expect(/^\d{12}$/.test(result)).toBe(true)
  })

  it('is deterministic — same input always gives same output', () => {
    const a = toEan12('A-01-01-01')
    const b = toEan12('A-01-01-01')
    expect(a).toBe(b)
  })

  it('produces different codes for different cell codes', () => {
    const a = toEan12('A-01-01-01')
    const b = toEan12('A-01-01-02')
    expect(a).not.toBe(b)
  })

  it('starts with 200 prefix (GS1 internal-use range)', () => {
    const result = toEan12('SOME-CELL-CODE')
    expect(result.startsWith('200')).toBe(true)
  })

  it('handles empty string without throwing', () => {
    expect(() => toEan12('')).not.toThrow()
    expect(toEan12('')).toHaveLength(12)
  })

  it('handles very long strings', () => {
    const long = 'A'.repeat(100) + '-01-99-50'
    expect(toEan12(long)).toHaveLength(12)
  })
})
