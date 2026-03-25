import { describe, expect, it } from 'vitest'
import {
  defaultExportFileName,
  joinDirFile,
  pathDir,
  replaceFilenameInPath
} from './exportPaths'

describe('exportPaths', () => {
  it('pathDir handles Windows paths', () => {
    expect(pathDir('C:\\Users\\Me\\Documents\\out.xlsx')).toBe('C:\\Users\\Me\\Documents')
    expect(pathDir('C:/Users/Me/Documents/out.xlsx')).toBe('C:/Users/Me/Documents')
  })

  it('replaceFilenameInPath keeps directory', () => {
    const next = replaceFilenameInPath(
      'C:\\Users\\Me\\Documents\\old.xlsx',
      'new.xlsx'
    )
    expect(next).toBe('C:\\Users\\Me\\Documents\\new.xlsx')
  })

  it('joinDirFile uses separator from dir', () => {
    expect(joinDirFile('C:\\Users\\Me\\Documents', 'f.xlsx')).toBe(
      'C:\\Users\\Me\\Documents\\f.xlsx'
    )
    expect(joinDirFile('/home/me', 'f.xlsx')).toBe('/home/me/f.xlsx')
  })

  it('defaultExportFileName matches NAME_MM-YYYY pattern', () => {
    expect(defaultExportFileName('Andrei', 2025, 2)).toBe('Andrei_03-2025.xlsx')
  })
})
