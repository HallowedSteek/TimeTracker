import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  loadWorked: (): Promise<string[]> => ipcRenderer.invoke('worked:load'),
  saveWorked: (dates: string[]): Promise<void> => ipcRenderer.invoke('worked:save', dates),
  saveFile: (defaultName: string, buffer: ArrayBuffer): Promise<{ ok: boolean; filePath?: string }> =>
    ipcRenderer.invoke('file:save-buffer', defaultName, buffer)
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
