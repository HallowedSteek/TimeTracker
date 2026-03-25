import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  defaultMonthRange,
  daysInMonth,
  monthLabel,
  todayISO,
  toISODateLocal,
  weekdayIndexMondayFirst,
  type YearMonth
} from './dates'
import { EUR_PER_DAY, MAX_DAYS_PER_MONTH, MIN_DAYS_PER_MONTH } from './constants'
import { buildWorkbookBytes } from './exportExcel'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function useWorkedSet() {
  const [worked, setWorked] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    window.api.loadWorked().then((dates) => {
      if (cancelled) return
      setWorked(new Set(dates))
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback(async (next: Set<string>) => {
    setWorked(next)
    await window.api.saveWorked([...next])
  }, [])

  const toggle = useCallback(
    async (iso: string) => {
      const t = todayISO()
      if (iso > t) return
      const next = new Set(worked)
      if (next.has(iso)) next.delete(iso)
      else next.add(iso)
      await persist(next)
    },
    [worked, persist]
  )

  return { worked, ready, toggle }
}

function countWorkedInMonth(worked: Set<string>, year: number, month: number): number {
  const dim = daysInMonth(year, month)
  let n = 0
  for (let d = 1; d <= dim; d++) {
    const iso = toISODateLocal(new Date(year, month, d))
    if (worked.has(iso)) n++
  }
  return n
}

function MonthBlock({
  ym,
  worked,
  onToggle,
  today
}: {
  ym: YearMonth
  worked: Set<string>
  onToggle: (iso: string) => void
  today: string
}) {
  const { year, month } = ym
  const label = monthLabel(year, month)
  const dim = daysInMonth(year, month)
  const first = new Date(year, month, 1)
  const pad = weekdayIndexMondayFirst(first)

  const slots: ({ day: number; iso: string } | null)[] = []
  for (let i = 0; i < pad; i++) slots.push(null)
  for (let d = 1; d <= dim; d++) {
    slots.push({ day: d, iso: toISODateLocal(new Date(year, month, d)) })
  }
  while (slots.length % 7 !== 0) slots.push(null)
  const rows: ({ day: number; iso: string } | null)[][] = []
  for (let i = 0; i < slots.length; i += 7) {
    rows.push(slots.slice(i, i + 7))
  }

  const monthWorked = countWorkedInMonth(worked, year, month)

  return (
    <section className="month-card">
      <div className="month-card-head">
        <h2 className="month-title">{label}</h2>
        <span className="month-meta">
          {monthWorked} day{monthWorked === 1 ? '' : 's'} · target {MIN_DAYS_PER_MONTH}–
          {MAX_DAYS_PER_MONTH}
        </span>
      </div>
      <div className="weekday-row">
        {WEEKDAYS.map((w) => (
          <span key={w} className="weekday-label">
            {w}
          </span>
        ))}
      </div>
      <div className="day-grid">
        {rows.map((r, ri) => (
          <div key={ri} className="day-row">
            {r.map((cell, ci) => {
              if (!cell) return <div key={ci} className="day-cell day-cell--empty" />
              const isFuture = cell.iso > today
              const isWorked = worked.has(cell.iso)
              const title = isFuture
                ? 'Future days cannot be marked'
                : isWorked
                  ? 'Worked — click to clear'
                  : 'Mark as worked'
              return (
                <button
                  key={cell.iso}
                  type="button"
                  className={[
                    'day-btn',
                    isWorked ? 'day-btn--worked' : '',
                    isFuture ? 'day-btn--future' : ''
                  ].join(' ')}
                  disabled={isFuture}
                  title={title}
                  onClick={() => !isFuture && onToggle(cell.iso)}
                >
                  <span className="day-num">{cell.day}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}

export default function App() {
  const { worked, ready, toggle } = useWorkedSet()
  const today = todayISO()
  const months = useMemo(() => defaultMonthRange(), [])

  const totalDays = worked.size
  const totalEur = totalDays * EUR_PER_DAY

  const now = new Date()
  const currentMonthWorked = countWorkedInMonth(worked, now.getFullYear(), now.getMonth())

  const handleExport = async () => {
    const buf = buildWorkbookBytes([...worked])
    const name = `time-tracker-${today}.xlsx`
    await window.api.saveFile(name, buf)
  }

  if (!ready) {
    return (
      <div className="app shell">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="top-bar">
        <div>
          <h1 className="app-title">Time Tracker</h1>
          <p className="app-sub">Freelance days · {EUR_PER_DAY} €/day</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleExport}>
          Export Excel
        </button>
      </header>

      <section className="dashboard">
        <div className="dash-card">
          <span className="dash-label">This month</span>
          <strong className="dash-value">
            {currentMonthWorked} / {MIN_DAYS_PER_MONTH}–{MAX_DAYS_PER_MONTH} days
          </strong>
          <span className="dash-hint">Typical contractual range</span>
        </div>
        <div className="dash-card">
          <span className="dash-label">All time</span>
          <strong className="dash-value">
            {totalDays} days · {totalEur.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </strong>
          <span className="dash-hint">Stored in CSV under your profile folder</span>
        </div>
      </section>

      <main className="month-list">
        {months.map((ym) => (
          <MonthBlock key={`${ym.year}-${ym.month}`} ym={ym} worked={worked} onToggle={toggle} today={today} />
        ))}
      </main>
    </div>
  )
}
