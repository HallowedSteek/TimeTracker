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
      getAutoLaunch: () => Promise<boolean>
      setAutoLaunch: (enabled: boolean) => Promise<void>
      openDataFolder: () => Promise<{ ok: boolean; error?: string }>
      showItemInFolder: (filePath: string) => Promise<{ ok: boolean }>
      getPathsDefaults: () => Promise<{
        documents: string
        userData: string
        osUserName: string
      }>
      pickSavePath: (defaultPath: string) => Promise<{ canceled: boolean; filePath?: string }>
    }
  }
}

export { }
