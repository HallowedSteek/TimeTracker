import * as XLSX from 'xlsx'
import { EUR_PER_DAY, MAX_DAYS_PER_MONTH, MIN_DAYS_PER_MONTH } from './constants'

export function buildWorkbookBytes(dates: string[]): ArrayBuffer {
  const sorted = [...dates].sort()
  const log = [['Date', 'Worked'], ...sorted.map((d) => [d, 'Yes'] as [string, string])]
  const wb = XLSX.utils.book_new()
  const wsLog = XLSX.utils.aoa_to_sheet(log)
  XLSX.utils.book_append_sheet(wb, wsLog, 'Worked days')

  const totalDays = sorted.length
  const totalEur = totalDays * EUR_PER_DAY
  const summary: (string | number)[][] = [
    ['Metric', 'Value'],
    ['Days worked (all time)', totalDays],
    ['Rate (EUR / day)', EUR_PER_DAY],
    ['Total (EUR)', totalEur],
    ['', ''],
    ['Typical days / month (your range)', `${MIN_DAYS_PER_MONTH}–${MAX_DAYS_PER_MONTH}`]
  ]
  const wsSum = XLSX.utils.aoa_to_sheet(summary)
  XLSX.utils.book_append_sheet(wb, wsSum, 'Summary')

  const result = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  if (result instanceof ArrayBuffer) return result
  const u8 = result as Uint8Array
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)
}
