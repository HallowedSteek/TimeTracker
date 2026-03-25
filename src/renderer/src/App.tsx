import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  monthRangeFrom,
  daysInMonth,
  isWeekday,
  monthLabel,
  todayISO,
  toISODateLocal,
  weekdayIndexMondayFirst,
  type YearMonth
} from './dates'
import { EUR_PER_DAY, MAX_DAYS_PER_MONTH, MIN_DAYS_PER_MONTH, SETTINGS } from './constants'
import ExportModal from './ExportModal'
import Toast from './Toast'

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
      const isCurrentlyWorked = worked.has(iso)

      if (isCurrentlyWorked) {
        const confirmed = window.confirm(`Remove ${iso} from worked days?`)
        if (!confirmed) return
      }

      const next = new Set(worked)
      if (next.has(iso)) next.delete(iso)
      else next.add(iso)
      await persist(next)
    },
    [worked, persist]
  )

  return { worked, ready, toggle }
}

function buildUndoneDays(
  worked: Set<string>,
  months: YearMonth[],
  today: string,
  startDate?: string
): Set<string> {
  const undone = new Set<string>()
  for (const { year, month } of months) {
    const dim = daysInMonth(year, month)
    for (let d = 1; d <= dim; d++) {
      const dt = new Date(year, month, d)
      const iso = toISODateLocal(dt)
      if (startDate && iso < startDate) continue
      if (iso >= today) continue
      if (worked.has(iso)) continue
      if (!isWeekday(dt)) continue
      undone.add(iso)
    }
  }
  return undone
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
  undone,
  onToggle,
  today
}: {
  ym: YearMonth
  worked: Set<string>
  undone: Set<string>
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
              const isUndone = undone.has(cell.iso)
              const title = isFuture
                ? 'Future days cannot be marked'
                : isWorked
                  ? 'Worked — click to clear'
                  : isUndone
                    ? 'Missed weekday — click to mark as worked'
                    : 'Mark as worked'
              return (
                <button
                  key={cell.iso}
                  type="button"
                  className={[
                    'day-btn',
                    isWorked ? 'day-btn--worked' : '',
                    isUndone ? 'day-btn--undone' : '',
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
  const [startDate, setStartDate] = useState<string | undefined>(undefined)
  const [settingsReady, setSettingsReady] = useState(false)
  const [autoLaunch, setAutoLaunch] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [payRate, setPayRate] = useState(EUR_PER_DAY)
  const [toast, setToast] = useState<{
    message: string
    kind: 'success' | 'error'
    filePath?: string
    fileName?: string
  } | null>(null)

  useEffect(() => {
    window.api.loadSettings().then((s) => {
      if (typeof s[SETTINGS.startDate] === 'string') {
        setStartDate(s[SETTINGS.startDate] as string)
      }
      if (typeof s[SETTINGS.payRateEUR] === 'number') {
        setPayRate(s[SETTINGS.payRateEUR] as number)
      }
      setSettingsReady(true)
    })
    window.api.getAutoLaunch().then(setAutoLaunch)
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 5200)
    return () => window.clearTimeout(id)
  }, [toast])

  const months = useMemo(() => monthRangeFrom(startDate), [startDate])
  const undone = useMemo(
    () => buildUndoneDays(worked, months, today, startDate),
    [worked, months, today, startDate]
  )

  const handleStartDateChange = async (value: string) => {
    const next = value || undefined
    setStartDate(next)
    await window.api.saveSetting(SETTINGS.startDate, next ?? null)
  }

  const handleAutoLaunchChange = async (checked: boolean) => {
    setAutoLaunch(checked)
    await window.api.setAutoLaunch(checked)
  }

  const totalDays = worked.size
  const totalEur = totalDays * payRate

  const now = new Date()
  const currentMonthWorked = countWorkedInMonth(worked, now.getFullYear(), now.getMonth())

  if (!ready || !settingsReady) {
    return (
      <div className="app shell">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  const monthRows: YearMonth[][] = []
  for (let i = 0; i < months.length; i += 3) {
    monthRows.push(months.slice(i, i + 3))
  }

  return (
    <div className="app">
      <header className="top-bar">
        <div>
          <h1 className="app-title">Time Tracker</h1>
          <p className="app-sub">Freelance days · {payRate} €/day</p>
        </div>
        <div className="top-bar-actions">
          <label className="start-date-label">
            <span className="start-date-text">Start date</span>
            <input
              type="date"
              className="start-date-input"
              value={startDate ?? ''}
              max={today}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />
          </label>
          <label className="autolaunch-label">
            <span className="autolaunch-text">Start with OS</span>
            <div className="toggle-wrapper">
              <input
                type="checkbox"
                className="toggle-input"
                checked={autoLaunch}
                onChange={(e) => handleAutoLaunchChange(e.target.checked)}
              />
              <span className="toggle-slider" />
            </div>
          </label>
          <button type="button" className="btn btn-primary" onClick={() => setExportModalOpen(true)}>
            Export Excel
          </button>
        </div>
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
            {totalDays} days ·{' '}
            {totalEur.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </strong>
          <button
            type="button"
            className="dash-hint dash-hint-link"
            onClick={() => void window.api.openDataFolder()}
          >
            Stored in CSV under your profile folder
          </button>
        </div>
      </section>

      <main className="month-list">
        {monthRows.map((row, ri) => (
          <div key={ri} className="month-row">
            {row.map((ym) => (
              <MonthBlock
                key={`${ym.year}-${ym.month}`}
                ym={ym}
                worked={worked}
                undone={undone}
                onToggle={toggle}
                today={today}
              />
            ))}
          </div>
        ))}
      </main>

      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        worked={worked}
        onToast={setToast}
        onExported={async () => {
          const s = await window.api.loadSettings()
          if (typeof s[SETTINGS.payRateEUR] === 'number') {
            setPayRate(s[SETTINGS.payRateEUR] as number)
          }
        }}
      />

      {toast ? (
        <Toast
          message={toast.message}
          kind={toast.kind}
          filePath={toast.filePath}
          fileName={toast.fileName}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </div>
  )
}
