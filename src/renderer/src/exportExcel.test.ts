import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx-js-style'
import { buildMonthExportWorkbook } from './exportExcel'

describe('buildMonthExportWorkbook', () => {
  it('produces a non-trivial xlsx buffer', () => {
    const worked = new Set(['2024-03-15', '2024-03-20'])
    const buf = buildMonthExportWorkbook({
      year: 2024,
      month: 2,
      worked,
      userDisplayName: 'Test User',
      payRateEUR: 180
    })
    expect(buf.byteLength).toBeGreaterThan(300)
  })

  it('round-trips through xlsx read with expected title cell', () => {
    const worked = new Set<string>()
    const buf = buildMonthExportWorkbook({
      year: 2025,
      month: 0,
      worked,
      userDisplayName: 'Alpha',
      payRateEUR: 200
    })
    const wb = XLSX.read(buf, { type: 'array', cellStyles: true })
    expect(wb.SheetNames.length).toBe(1)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const a1 = ws.A1
    expect(a1).toBeDefined()
    expect(String(a1?.v)).toContain('Alpha')
    expect(String(a1?.v)).toContain('01-2025')
  })
})
