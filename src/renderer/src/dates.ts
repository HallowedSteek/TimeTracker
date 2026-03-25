export function toISODateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODateLocal(new Date())
}

/** Monday = 0 … Sunday = 6 */
export function weekdayIndexMondayFirst(d: Date): number {
  return (d.getDay() + 6) % 7
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export interface YearMonth {
  year: number
  month: number
}

/** Inclusive range from (start) to (end), one entry per calendar month. */
export function monthsFromTo(start: YearMonth, end: YearMonth): YearMonth[] {
  const out: YearMonth[] = []
  let y = start.year
  let m = start.month
  for (; ;) {
    out.push({ year: y, month: m })
    if (y === end.year && m === end.month) break
    m++
    if (m > 11) {
      m = 0
      y++
    }
  }
  return out
}

export function monthRangeFrom(startISO?: string): YearMonth[] {
  const end = new Date()
  let start: Date
  if (startISO) {
    const [y, m] = startISO.split('-').map(Number)
    start = new Date(y, m - 1, 1)
  } else {
    start = new Date(end.getFullYear() - 2, end.getMonth(), 1)
  }
  if (start > end) return [{ year: end.getFullYear(), month: end.getMonth() }]
  return monthsFromTo(
    { year: start.getFullYear(), month: start.getMonth() },
    { year: end.getFullYear(), month: end.getMonth() }
  )
}

/** Returns true if the given date falls on Monday–Friday. */
export function isWeekday(d: Date): boolean {
  const day = d.getDay()
  return day >= 1 && day <= 5
}

export function monthLabel(year: number, month: number, locale?: string): string {
  return new Date(year, month, 1).toLocaleString(locale ?? undefined, {
    month: 'long',
    year: 'numeric'
  })
}
