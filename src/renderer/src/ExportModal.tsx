import { useEffect, useState } from 'react'
import { buildMonthExportWorkbook } from './exportExcel'
import { EUR_PER_DAY, SETTINGS } from './constants'
import {
  defaultExportFileName,
  joinDirFile,
  pathDir,
  replaceFilenameInPath
} from './exportPaths'

type Props = {
  open: boolean
  onClose: () => void
  worked: Set<string>
  onExported?: () => void | Promise<void>
  onToast?: (payload: {
    message: string
    kind: 'success' | 'error'
    filePath?: string
    fileName?: string
  }) => void
}

export default function ExportModal({ open, onClose, worked, onExported, onToast }: Props) {
  const [ready, setReady] = useState(false)
  const [month, setMonth] = useState('')
  const [exportPath, setExportPath] = useState('')
  const [rememberPath, setRememberPath] = useState(false)
  const [userName, setUserName] = useState('')
  const [payRate, setPayRate] = useState(EUR_PER_DAY)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setReady(false)
      setError(null)
      return
    }
    let cancelled = false
      ; (async () => {
        const paths = await window.api.getPathsDefaults()
        const s = await window.api.loadSettings()
        if (cancelled) return
        const dir =
          typeof s[SETTINGS.exportDir] === 'string' && (s[SETTINGS.exportDir] as string).length > 0
            ? (s[SETTINGS.exportDir] as string)
            : paths.documents
        const remember = s[SETTINGS.exportRememberPath] === true
        const name =
          (typeof s[SETTINGS.userDisplayName] === 'string' && (s[SETTINGS.userDisplayName] as string).length > 0
            ? (s[SETTINGS.userDisplayName] as string)
            : paths.osUserName) || 'User'
        const rate =
          typeof s[SETTINGS.payRateEUR] === 'number' ? (s[SETTINGS.payRateEUR] as number) : EUR_PER_DAY

        const now = new Date()
        const y = now.getFullYear()
        const m0 = now.getMonth()
        const monthStr = `${y}-${String(m0 + 1).padStart(2, '0')}`

        setMonth(monthStr)
        setRememberPath(remember)
        setUserName(name)
        setPayRate(rate)
        setExportPath(joinDirFile(dir, defaultExportFileName(name, y, m0)))
        setReady(true)
      })()
    return () => {
      cancelled = true
    }
  }, [open])

  const handleMonthChange = (value: string) => {
    setMonth(value)
    const [ys, ms] = value.split('-').map(Number)
    if (!ys || !ms) return
    const month0 = ms - 1
    setExportPath((p) => replaceFilenameInPath(p, defaultExportFileName(userName, ys, month0)))
  }

  const handleUserNameChange = (value: string) => {
    setUserName(value)
    const [ys, ms] = month.split('-').map(Number)
    if (!ys || !ms) return
    setExportPath((p) => replaceFilenameInPath(p, defaultExportFileName(value, ys, ms - 1)))
  }

  const handleBrowse = async () => {
    const r = await window.api.pickSavePath(exportPath)
    if (!r.canceled && r.filePath) setExportPath(r.filePath)
  }

  const handleExport = async () => {
    setError(null)
    const trimmed = exportPath.trim()
    if (!trimmed) {
      const msg = 'Choose a file path.'
      setError(msg)
      onToast?.({ message: msg, kind: 'error' })
      return
    }
    const [ys, ms] = month.split('-').map(Number)
    if (!ys || !ms) {
      const msg = 'Choose a valid month.'
      setError(msg)
      onToast?.({ message: msg, kind: 'error' })
      return
    }
    const month0 = ms - 1
    setSaving(true)
    try {
      const buf = buildMonthExportWorkbook({
        year: ys,
        month: month0,
        worked,
        userDisplayName: userName,
        payRateEUR: payRate
      })
      const result = await window.api.saveFileToPath(trimmed, buf)
      if (!result.ok) {
        const msg = 'Export failed. The file could not be saved.'
        setError(msg)
        onToast?.({ message: msg, kind: 'error' })
        return
      }
      await window.api.saveSetting(SETTINGS.userDisplayName, userName)
      await window.api.saveSetting(SETTINGS.payRateEUR, payRate)
      await window.api.saveSetting(SETTINGS.exportRememberPath, rememberPath)
      if (rememberPath) {
        const dir = pathDir(trimmed)
        if (dir) await window.api.saveSetting(SETTINGS.exportDir, dir)
      }
      await onExported?.()
      const fullPath = result.filePath ?? trimmed
      const savedName = fullPath.split(/[/\\]/).pop() ?? 'export.xlsx'
      onToast?.({
        message: 'Export succeeded.',
        kind: 'success',
        filePath: fullPath,
        fileName: savedName
      })
      onClose()
    } catch (err) {
      console.error(err)
      const detail =
        err instanceof Error ? err.message : 'Could not save the file. Check the path and permissions.'
      setError(detail)
      onToast?.({
        message: `Export failed: ${detail}`,
        kind: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-labelledby="export-modal-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="export-modal-title" className="modal-title">
          Export Excel
        </h2>
        <p className="modal-lead">
          This creates a separate file from your CSV database. It does not change your stored data.
        </p>

        {!ready ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            <label className="modal-field">
              <span className="modal-label">Month</span>
              <input
                type="month"
                className="modal-input"
                value={month}
                max={new Date().toISOString().slice(0, 7)}
                onChange={(e) => handleMonthChange(e.target.value)}
              />
            </label>
            <label className="modal-field">
              <span className="modal-label">Your name (for title and filename)</span>
              <input
                type="text"
                className="modal-input"
                value={userName}
                onChange={(e) => handleUserNameChange(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="modal-field">
              <span className="modal-label">Pay rate (EUR / day)</span>
              <input
                type="number"
                min={0}
                step={1}
                className="modal-input"
                value={payRate}
                onChange={(e) => setPayRate(Number(e.target.value))}
              />
            </label>
            <label className="modal-field">
              <span className="modal-label">File path</span>
              <div className="modal-path-row">
                <input
                  type="text"
                  className="modal-input modal-input--grow"
                  value={exportPath}
                  onChange={(e) => setExportPath(e.target.value)}
                  spellCheck={false}
                />
                <button type="button" className="btn btn-secondary" onClick={handleBrowse}>
                  Browse…
                </button>
              </div>
            </label>
            <label className="modal-check">
              <input
                type="checkbox"
                checked={rememberPath}
                onChange={(e) => setRememberPath(e.target.checked)}
              />
              <span>Remember folder for next time (still show this dialog)</span>
            </label>
            {error ? <p className="modal-error">{error}</p> : null}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleExport} disabled={saving}>
                {saving ? 'Exporting…' : 'Export'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
