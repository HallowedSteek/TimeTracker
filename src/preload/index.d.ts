import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      loadWorked: () => Promise<string[]>
      saveWorked: (dates: string[]) => Promise<void>
      saveFile: (
        defaultName: string,
        buffer: ArrayBuffer
      ) => Promise<{ ok: boolean; filePath?: string }>
      saveFileToPath: (
        filePath: string,
        buffer: ArrayBuffer
      ) => Promise<{ ok: boolean; filePath?: string }>
      loadSettings: () => Promise<Record<string, unknown>>
      saveSetting: (key: string, value: unknown) => Promise<void>
    }
  }
}

export { }
