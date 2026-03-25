import { app, shell, BrowserWindow, ipcMain, dialog, Notification } from 'electron'
import { join, dirname, normalize } from 'path'
import os from 'os'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { toNodeBuffer } from './bufferUtils'

const DATA_FILE = 'worked-days.csv'
const SETTINGS_FILE = 'settings.json'

function dataPath(): string {
  return join(app.getPath('userData'), DATA_FILE)
}

function settingsPath(): string {
  return join(app.getPath('userData'), SETTINGS_FILE)
}

async function loadSettings(): Promise<Record<string, unknown>> {
  const p = settingsPath()
  if (!existsSync(p)) return {}
  try {
    const raw = await readFile(p, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function saveSetting(key: string, value: unknown): Promise<void> {
  const settings = await loadSettings()
  settings[key] = value
  await writeFile(settingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

async function loadWorkedDates(): Promise<string[]> {
  const p = dataPath()
  if (!existsSync(p)) return []
  const raw = await readFile(p, 'utf-8')
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return []
  const start = lines[0].toLowerCase() === 'date' ? 1 : 0
  const dates: string[] = []
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]
    const col = line.split(',')[0]?.trim()
    if (col && /^\d{4}-\d{2}-\d{2}$/.test(col)) dates.push(col)
  }
  return [...new Set(dates)].sort()
}

async function saveWorkedDates(dates: string[]): Promise<void> {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  const sorted = [...new Set(dates)].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()
  const csv = ['date', ...sorted].join('\n') + '\n'
  await writeFile(dataPath(), csv, 'utf-8')
}

function sendDailyReminder(): void {
  const today = new Date()
  const day = today.getDay()
  if (day < 1 || day > 5) return

  if (!Notification.isSupported()) return

  const n = new Notification({
    title: 'Time Tracker',
    body: "Don't forget to register today's work!",
    icon: icon
  })
  n.on('click', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
  n.show()
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 960,
    height: 800,
    minWidth: 720,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    title: 'Time Tracker',
    ...(process.platform !== 'darwin' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.timetracker.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('worked:load', () => loadWorkedDates())
  ipcMain.handle('worked:save', (_, dates: string[]) => saveWorkedDates(dates))

  ipcMain.handle(
    'file:save-buffer',
    async (_, defaultName: string, buffer: unknown) => {
      const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: defaultName,
        filters: [
          { name: 'Excel', extensions: ['xlsx'] },
          { name: 'All files', extensions: ['*'] }
        ]
      })
      if (canceled || !filePath) return { ok: false as const }
      await writeFile(filePath, toNodeBuffer(buffer))
      return { ok: true as const, filePath }
    }
  )

  ipcMain.handle(
    'file:save-buffer-to-path',
    async (_, filePath: string, buffer: unknown) => {
      const dir = dirname(filePath)
      if (!existsSync(dir)) await mkdir(dir, { recursive: true })
      await writeFile(filePath, toNodeBuffer(buffer))
      return { ok: true as const, filePath }
    }
  )

  ipcMain.handle('settings:load', () => loadSettings())
  ipcMain.handle('settings:save', (_, key: string, value: unknown) => saveSetting(key, value))

  ipcMain.handle('autolaunch:get', () => {
    const settings = app.getLoginItemSettings()
    return settings.openAtLogin
  })

  ipcMain.handle('autolaunch:set', (_, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled })
  })

  ipcMain.handle('shell:open-data-folder', async () => {
    const err = await shell.openPath(app.getPath('userData'))
    return err ? { ok: false as const, error: err } : { ok: true as const }
  })

  ipcMain.handle('shell:show-item-in-folder', (_, filePath: string) => {
    if (!filePath || typeof filePath !== 'string') return { ok: false as const }
    shell.showItemInFolder(normalize(filePath))
    return { ok: true as const }
  })

  ipcMain.handle('paths:get-defaults', () => ({
    documents: app.getPath('documents'),
    userData: app.getPath('userData'),
    osUserName: os.userInfo().username
  }))

  ipcMain.handle('dialog:pick-save-path', async (_, defaultPath: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })
    return { canceled, filePath }
  })

  createWindow()

  sendDailyReminder()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
