import * as XLSX from 'xlsx-js-style'
import { daysInMonth, toISODateLocal } from './dates'
import { MAX_DAYS_PER_MONTH, MIN_DAYS_PER_MONTH } from './constants'

export type MonthExportParams = {
  year: number
  month: number
  /** 0–11 */
  worked: Set<string>
  userDisplayName: string
  payRateEUR: number
}

const borderGrid = {
  top: { style: 'thin' as const, color: { rgb: 'FFCBD5E1' } },
  bottom: { style: 'thin' as const, color: { rgb: 'FFCBD5E1' } },
  left: { style: 'thin' as const, color: { rgb: 'FFCBD5E1' } },
  right: { style: 'thin' as const, color: { rgb: 'FFCBD5E1' } }
}

const headerFill = { fgColor: { rgb: 'FF15803D' } }
const titleFill = { fgColor: { rgb: 'FFF4F5F8' } }
const summaryBand = { fgColor: { rgb: 'FFECFDF5' } }

function contractStatus(daysWorked: number): string {
  if (daysWorked < MIN_DAYS_PER_MONTH) {
    return `Below minimum (${MIN_DAYS_PER_MONTH} days)`
  }
  if (daysWorked > MAX_DAYS_PER_MONTH) {
    return `Above maximum (${MAX_DAYS_PER_MONTH} days)`
  }
  return `Within range (${MIN_DAYS_PER_MONTH}–${MAX_DAYS_PER_MONTH} days)`
}

export function buildMonthExportWorkbook(p: MonthExportParams): ArrayBuffer {
  const dim = daysInMonth(p.year, p.month)
  const mm = String(p.month + 1).padStart(2, '0')
  const yyyy = p.year
  const displayName = (p.userDisplayName || 'User').trim() || 'User'
  const title = `${displayName}_${mm}-${yyyy}`

  let daysWorked = 0
  const bodyRows: (string | number)[][] = []
  for (let d = 1; d <= dim; d++) {
    const iso = toISODateLocal(new Date(p.year, p.month, d))
    const w = p.worked.has(iso)
    if (w) daysWorked++
    bodyRows.push([d, w ? 'Yes' : 'No', w ? p.payRateEUR : 0])
  }

  const totalEur = daysWorked * p.payRateEUR
  const status = contractStatus(daysWorked)

  const aoa: (string | number)[][] = [
    [title, '', ''],
    [],
    ['DAY_OF_MONTH', 'WORKED', 'PAY_RATE'],
    ...bodyRows,
    [],
    ['Contract summary', '', ''],
    ['Days worked vs target (min–max)', `${daysWorked} / ${MIN_DAYS_PER_MONTH}–${MAX_DAYS_PER_MONTH}`, status],
    ['Total earned this month (EUR)', totalEur, '']
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  const lastRow = aoa.length - 1
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 3 + dim + 1, c: 0 }, e: { r: 3 + dim + 1, c: 2 } }
  ]

  ws['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 42 }]

  const titleAddr = 'A1'
  ws[titleAddr] = {
    t: 's',
    v: title,
    s: {
      font: { bold: true, sz: 14, color: { rgb: 'FF111827' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: titleFill,
      border: borderGrid
    }
  }
  ws['B1'] = { t: 's', v: '', s: { fill: titleFill, border: borderGrid } }
  ws['C1'] = { t: 's', v: '', s: { fill: titleFill, border: borderGrid } }

  for (let c = 0; c < 3; c++) {
    const addr = XLSX.utils.encode_cell({ r: 2, c })
    const cell = ws[addr]
    if (!cell || typeof cell.v === 'undefined') continue
    cell.s = {
      font: { bold: true, color: { rgb: 'FFFFFFFF' } },
      fill: headerFill,
      alignment: { horizontal: 'center', vertical: 'center' },
      border: borderGrid
    }
  }

  for (let r = 3; r < 3 + dim; r++) {
    for (let c = 0; c < 3; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      const cell = ws[addr]
      if (!cell) continue
      const align =
        c === 0 ? 'center' : c === 1 ? 'center' : 'right'
      if (c === 2 && typeof cell.v === 'number') {
        cell.t = 'n'
        cell.z = '#,##0.00'
      }
      cell.s = {
        alignment: { horizontal: align, vertical: 'center' },
        border: borderGrid
      }
    }
  }

  const sumStart = 3 + dim + 1
  for (let r = sumStart; r <= lastRow; r++) {
    for (let c = 0; c < 3; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      const cell = ws[addr]
      if (!cell) continue
      const isLabel = c === 0
      const isTotalRow = r === lastRow && c === 1
      if (isTotalRow && typeof cell.v === 'number') {
        cell.t = 'n'
        cell.z = '#,##0.00'
      }
      cell.s = {
        font: { bold: isLabel || (r === lastRow && c <= 1) },
        fill: summaryBand,
        alignment: {
          horizontal: c === 2 ? 'left' : c === 1 && typeof cell.v === 'number' ? 'right' : 'left',
          vertical: 'center',
          wrapText: true
        },
        border: borderGrid
      }
    }
  }

  const sheetNameRaw = title.replace(/[:\\/?*[\]]/g, '-').trim() || 'Export'
  const sheetName = sheetNameRaw.length > 31 ? sheetNameRaw.slice(0, 31) : sheetNameRaw
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  return writeWorkbookToArrayBuffer(wb)
}

/** SheetJS may return Array, Uint8Array, Buffer, or ArrayBuffer depending on environment. */
function writeWorkbookToArrayBuffer(wb: XLSX.WorkBook): ArrayBuffer {
  const raw = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'array',
    cellStyles: true
  }) as unknown

  if (raw instanceof ArrayBuffer) return raw
  if (raw instanceof Uint8Array) {
    return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(raw)) {
    return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)
  }
  if (Array.isArray(raw)) {
    return new Uint8Array(raw).buffer
  }
  if (ArrayBuffer.isView(raw)) {
    const v = raw as ArrayBufferView
    return v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)
  }
  throw new Error('xlsx write produced no usable output')
}
