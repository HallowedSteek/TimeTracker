import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const DATA_FILE = 'worked-days.csv'

function dataPath(): string {
  return join(app.getPath('userData'), DATA_FILE)
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
    async (_, defaultName: string, buffer: ArrayBuffer) => {
      const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: defaultName,
        filters: [
          { name: 'Excel', extensions: ['xlsx'] },
          { name: 'All files', extensions: ['*'] }
        ]
      })
      if (canceled || !filePath) return { ok: false as const }
      await writeFile(filePath, Buffer.from(buffer))
      return { ok: true as const, filePath }
    }
  )

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
