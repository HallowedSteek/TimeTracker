import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  loadWorked: (): Promise<string[]> => ipcRenderer.invoke('worked:load'),
  saveWorked: (dates: string[]): Promise<void> => ipcRenderer.invoke('worked:save', dates),
  saveFile: (defaultName: string, buffer: ArrayBuffer): Promise<{ ok: boolean; filePath?: string }> =>
    ipcRenderer.invoke('file:save-buffer', defaultName, buffer),
  saveFileToPath: (
    filePath: string,
    buffer: ArrayBuffer
  ): Promise<{ ok: boolean; filePath?: string }> =>
    ipcRenderer.invoke('file:save-buffer-to-path', filePath, buffer),
  loadSettings: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('settings:load'),
  saveSetting: (key: string, value: unknown): Promise<void> =>
    ipcRenderer.invoke('settings:save', key, value),
  getAutoLaunch: (): Promise<boolean> => ipcRenderer.invoke('autolaunch:get'),
  setAutoLaunch: (enabled: boolean): Promise<void> =>
    ipcRenderer.invoke('autolaunch:set', enabled),
  openDataFolder: (): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('shell:open-data-folder')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error legacy
  window.electron = electronAPI
  // @ts-expect-error legacy
  window.api = api
}
